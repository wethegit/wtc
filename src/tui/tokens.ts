import { RGBA } from "@opentui/core";

function rgbaFromHex(hex: string, alpha = 1): RGBA {
  const color = RGBA.fromHex(hex);
  return RGBA.fromValues(color.r, color.g, color.b, alpha);
}

export const tokens = {
  focusBlue: rgbaFromHex("#a6edff"),
  white46: rgbaFromHex("#ffffff", 0.46),
  white: rgbaFromHex("#ffffff"),
  white65: rgbaFromHex("#ffffff", 0.65),
  black46: rgbaFromHex("#000000", 0.46),
  black65: rgbaFromHex("#000000", 0.65),
  black: rgbaFromHex("#000000"),
} as const;

export type Tokens = typeof tokens;
