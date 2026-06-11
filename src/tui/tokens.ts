/**
 --color-black: #101820;
 --color-black-10: #e4e4e5;
 --color-black-25: #c9c9cb;
 --color-black-50: #939497;
 --color-black-75: #5e5f61;
 --color-blue: #8599f8;
 --color-blue-10: #eef0fe;
 --color-blue-100: #081c81;
 --color-blue-25: #cbd3fc;
 --color-blue-75: #3958f3;
 --color-blue-50: #8599f8;
 --color-brown: #734400;
 --color-green: #8dc975;
 --color-green-10: #eff7eb;
 --color-green-100: #2e5120;
 --color-green-25: #d6eccd;
 --color-green-75: #498233;
 --color-grey-blue: #334251;
 --color-grey-blue-10: #e9eef4;
 --color-grey-blue-25: #becede;
 --color-grey-blue-50: #658bb1;
 --color-grey-blue-75: #526b83;
 --color-maroon: #7f0315;
 --color-orange: #f7a836;
 --color-pink: #fc6f83;
 --color-pink-10: #ffeaed;
 --color-pink-25: #fecbd3;
 --color-pink-50: #fc6f83;
 --color-purple: #c98bdb;
 --color-purple-10: #f0def5;
 --color-purple-100: #742a89;
 --color-purple-25: #e4c4ed;
 --color-purple-75: #a63cc3;
 --color-purple-50: #c98bdb;
 --color-red: #e40526;
 --color-skyblue: #9ad9e9;
 --color-teal: #144d5b;
 --color-teal-50: #9ad9e9;
 --color-teal-10: #e9f7fa;
 --color-teal-75: #2daccc;
 --color-teal-25: #cdecf4;
 --color-white: #fff;
 --color-yellow: #f8ea36;
 --color-yellow-10: #fefce2;
 --color-yellow-25: #fcf7af;
 --color-yellow-75: #f7a836;
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
