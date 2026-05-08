import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BlackboardOverlay from "./BlackboardOverlay";
import type { CognitiveJSON, TimelineStep } from "@/types/cognitive";

const longStep: TimelineStep = {
  id: "long",
  type: "equation",
  title: "Long equation",
  formula: "a_really_long_formula_without_natural_breaks_equals_mg_sin_theta_minus_mu_mg_cos_theta_divided_by_mass_and_more_terms_to_force_wrapping",
  description: "Une très longue description pédagogique qui doit rester visible dans le tableau sans sortir horizontalement du panneau.",
  result: { acceleration: "123456789012345678901234567890 m/s²" },
};

const data: CognitiveJSON = {
  meta: { domain: "physique", scenario: "test", title: "test" },
  constants: {},
  diagram: { scenario: "generic", params: {}, objects: [], forces: [] },
  timeline: [longStep],
};

describe("BlackboardOverlay wrapping", () => {
  it("keeps long board content wrappable instead of horizontally clipped", async () => {
    Element.prototype.scrollTo = vi.fn();
    render(<BlackboardOverlay step={longStep} index={0} data={data} constants={{}} speed={1000} resetKey="test" />);

    await waitFor(() => expect(screen.getByText(/Long equation/)).toBeInTheDocument());

    const board = screen.getByText(/Long equation/).parentElement?.parentElement;
    expect(board).toHaveClass("overflow-x-hidden");
    expect(board).toHaveClass("pb-16");

    const content = screen.getByText(/Long equation/).parentElement;
    expect(content).toHaveClass("whitespace-pre-wrap");
    expect(content).toHaveClass("break-words");
    expect(content?.className).toContain("overflow-wrap:anywhere");
  });
});
