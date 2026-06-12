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
  bg: palette.black,
  surface: palette.black75,
  surfaceRaised: palette.greyBlue,
  surfaceOverlay: palette.black,

  // Text
  text: palette.white,
  textDim: palette.black50,
  textMuted: palette.black50,
  textAccent: palette.teal75,
  textInverse: palette.black,

  // Brand accent
  accent: palette.teal75,
  accentSoft: palette.teal50,

  // Semantic
  success: palette.green,
  warning: palette.yellow,
  danger: palette.pink50,
  info: palette.teal50,

  // Interactive
  selectionBg: palette.teal50,
  selectionText: palette.black,

  // Borders
  border: palette.black75,
  borderFocus: palette.teal75,
} as const;

export type Tokens = typeof tokens;
