import { RGBA } from "@opentui/core";

/**
 * These were taken from our website CSS styles
 */
export const palette = {
  // Brand core
  black: "#101820",
  pink50: "#fc6f83",
  yellow: "#f8ea36",
  teal50: "#9ad9e9",
  teal75: "#2daccc",
  green: "#8dc975",
  white: "#ffffff",

  // Extended
  black10: "#e4e4e5",
  black25: "#c9c9cb",
  black50: "#939497",
  black75: "#5e5f61",
  blue: "#8599f8",
  blue10: "#eef0fe",
  blue100: "#081c81",
  brown: "#734400",
  green10: "#eff7eb",
  green100: "#2e5120",
  green25: "#d6eccd",
  green75: "#498233",
  greyBlue: "#334251",
  greyBlue10: "#e9eef4",
  greyBlue25: "#becede",
  greyBlue50: "#658bb1",
  greyBlue75: "#526b83",
  maroon: "#7f0315",
  orange: "#f7a836",
  pink10: "#ffeaed",
  pink25: "#fecbd3",
  purple: "#c98bdb",
  purple10: "#f0def5",
  purple100: "#742a89",
  purple25: "#e4c4ed",
  purple75: "#a63cc3",
  purple50: "#c98bdb",
  red: "#e40526",
  skyblue: "#9ad9e9",
  teal: "#144d5b",
  teal10: "#e9f7fa",
  teal25: "#cdecf4",
  yellow10: "#fefce2",
  yellow25: "#fcf7af",
  yellow75: "#f7a836",
} as const;

export const tokens = {
  // Surfaces
  bg: RGBA.fromHex(palette.black),
  surface: RGBA.fromHex(palette.black75),
  surfaceRaised: RGBA.fromHex(palette.black50),
  surfaceOverlay: RGBA.fromValues(
    RGBA.fromHex(palette.black75).r,
    RGBA.fromHex(palette.black75).g,
    RGBA.fromHex(palette.black75).b,
    0.2,
  ),

  // Text
  text: RGBA.fromHex(palette.white),
  textDim: RGBA.fromHex(palette.black50),
  textMuted: RGBA.fromHex(palette.black50),
  textAccent: RGBA.fromHex(palette.teal75),
  textInverse: RGBA.fromHex(palette.black),

  // Brand accent
  accent: RGBA.fromHex(palette.teal75),
  accentSoft: RGBA.fromHex(palette.teal50),

  // Semantic
  success: RGBA.fromHex(palette.green),
  warning: RGBA.fromHex(palette.yellow),
  danger: RGBA.fromHex(palette.pink50),
  info: RGBA.fromHex(palette.teal50),

  // Interactive
  selectionBg: RGBA.fromHex(palette.teal50),
  selectionText: RGBA.fromHex(palette.black),

  // Borders
  border: RGBA.fromHex(palette.black75),
  borderFocus: RGBA.fromHex(palette.teal75),
} as const;

export type Tokens = typeof tokens;
