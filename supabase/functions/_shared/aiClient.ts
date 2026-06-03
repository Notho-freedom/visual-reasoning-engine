// AI client unifié — OpenRouter (modèles gratuits) en cascade + fallback Lovable AI Gateway
// Importé par toutes les edge functions IA

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const LOVABLE_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

// Modèles gratuits OpenRouter. La plupart des endpoints :free ont été dépréciés
// fin 2025 → on garde une liste courte et on tombe vite sur Lovable AI.
export const FREE_TEXT_MODELS = [
  "deepseek/deepseek-chat-v3.5:free",
  "qwen/qwen3-coder:free",
];

// Vision
export const FREE_VISION_MODELS = [
  "qwen/qwen2.5-vl-32b-instruct:free",
];

const LOVABLE_FALLBACK_TEXT = "google/gemini-3-flash-preview";
const LOVABLE_FALLBACK_VISION = "google/gemini-2.5-flash";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;
}

export interface AICallOptions {
  messages: AIMessage[];
  tools?: any[];
  tool_choice?: any;
  vision?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface AICallResult {
  ok: boolean;
  content?: string;
  toolArgs?: any;
  modelUsed?: string;
  provider?: "openrouter" | "lovable";
  error?: string;
  status?: number;
}

async function tryModel(
  url: string,
  apiKey: string,
  model: string,
  opts: AICallOptions,
  extraHeaders: Record<string, string> = {},
): Promise<AICallResult> {
  try {
    const body: any = {
      model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
    };
    if (opts.tools) body.tools = opts.tools;
    if (opts.tool_choice) body.tool_choice = opts.tool_choice;
    if (opts.maxTokens) body.max_tokens = opts.maxTokens;

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.warn(`[ai] ${model} failed ${r.status}: ${txt.slice(0, 200)}`);
      return { ok: false, status: r.status, error: txt };
    }
    const j = await r.json();
    const choice = j.choices?.[0]?.message;
    const toolArgsRaw = choice?.tool_calls?.[0]?.function?.arguments;
    let toolArgs: any = undefined;
    if (toolArgsRaw) {
      try { toolArgs = JSON.parse(toolArgsRaw); } catch {
        // Some free models wrap JSON in markdown
        const m = toolArgsRaw.match(/\{[\s\S]*\}/);
        if (m) { try { toolArgs = JSON.parse(m[0]); } catch {} }
      }
    }
    // If tool was requested but not returned, try parsing content as JSON
    if (opts.tools && !toolArgs && choice?.content) {
      const m = choice.content.match(/\{[\s\S]*\}/);
      if (m) { try { toolArgs = JSON.parse(m[0]); } catch {} }
    }
    if (opts.tools && !toolArgs) {
      return { ok: false, status: 500, error: "no tool call returned" };
    }
    return {
      ok: true,
      content: choice?.content,
      toolArgs,
      modelUsed: model,
    };
  } catch (e) {
    console.warn(`[ai] ${model} exception:`, e);
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Cascade : OpenRouter free models → Lovable AI fallback. */
export async function callAI(opts: AICallOptions): Promise<AICallResult> {
  const orKey = Deno.env.get("OPENROUTER_API_KEY");
  const lovKey = Deno.env.get("LOVABLE_API_KEY");

  const models = opts.vision ? FREE_VISION_MODELS : FREE_TEXT_MODELS;

  // 1. OpenRouter cascade
  if (orKey) {
    for (const model of models) {
      const r = await tryModel(OPENROUTER_URL, orKey, model, opts, {
        "HTTP-Referer": "https://physicsengine.lovable.app",
        "X-Title": "PhysicsEngine",
      });
      if (r.ok) return { ...r, provider: "openrouter" };
      // Skip to next on rate-limit, payment, server errors, schema mismatches
    }
    console.warn("[ai] all OpenRouter free models failed, falling back to Lovable");
  } else {
    console.warn("[ai] OPENROUTER_API_KEY missing, going straight to Lovable AI");
  }

  // 2. Lovable AI fallback
  if (lovKey) {
    const fallback = opts.vision ? LOVABLE_FALLBACK_VISION : LOVABLE_FALLBACK_TEXT;
    const r = await tryModel(LOVABLE_GATEWAY_URL, lovKey, fallback, opts);
    if (r.ok) return { ...r, provider: "lovable" };
    return { ok: false, error: r.error ?? "all providers failed", status: r.status };
  }

  return { ok: false, error: "no AI provider configured", status: 500 };
}
