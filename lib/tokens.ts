export const HAWKS_BASE_TOKENS = {
  hawksTorchRed: "#E03A3E",
  hawksVoltGreen: "#C1D32F",
  hawksHeritageBlack: "#26282A"
} as const;

export const SEMANTIC_COLOR_TOKENS = {
  brandPrimary: "var(--brand-primary)",
  brandAccent: "var(--brand-accent)",
  brandDark: "var(--brand-dark)"
} as const;

export const SEMANTIC_TAILWIND_CLASSES = {
  backgroundPrimary: "bg-brand-primary",
  textAccent: "text-brand-accent",
  borderDark: "border-brand-dark"
} as const;

export type HawksBaseTokenName = keyof typeof HAWKS_BASE_TOKENS;
export type SemanticColorTokenName = keyof typeof SEMANTIC_COLOR_TOKENS;
