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
  black80: rgbaFromHex("#333333"),
  black60: rgbaFromHex("#676767"),
  black40: rgbaFromHex("#9a9a9a"),
  black20: rgbaFromHex("#cdcdcd"),
  black10: rgbaFromHex("#e7e7e7"),
  black5: rgbaFromHex("#f3f3f3"),
  wtcGreen: rgbaFromHex("#89dc65"),
  wtcRed: rgbaFromHex("#fb5373"),
  wtcYellow: rgbaFromHex("#f9ea35"),
  wtcBlue: rgbaFromHex("#96daea"),
} as const;

export type Tokens = typeof tokens;
