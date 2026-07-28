import { RGBA } from "@opentui/core";

function rgbaFromHex(hex: string, alpha = 1): RGBA {
  const color = RGBA.fromHex(hex);
  return RGBA.fromValues(color.r, color.g, color.b, alpha);
}

export const tokens = {
  focusBlue: rgbaFromHex("#a6edff"),
  white46: rgbaFromHex("#858585"),
  white: rgbaFromHex("#ffffff"),
  white65: rgbaFromHex("#797a7b"),
  black46: rgbaFromHex("#000000"),
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
  wtcNavy: rgbaFromHex("#101820"),
} as const;

export type Tokens = typeof tokens;
