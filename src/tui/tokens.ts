export const palette = {
  black: "#101820",
  teal50: "#9ad9e9",
  pink50: "#fc6f83",
  yellow: "#f8ea36",
  green: "#8dc975",

  white: "#ffffff",
  black50: "#939497",
  black75: "#5e5f61",
  greyBlue: "#334251",
} as const;

export const tokens = {
  bg: palette.black,
  bgRaised: palette.greyBlue,
  bgOverlay: "rgba(0,0,0,0.5)",

  text: palette.white,
  textDim: palette.black50,
  textAccent: palette.teal50,

  border: palette.black75,
  borderFocus: palette.teal50,
  selectionBg: palette.teal50,
  selectionText: palette.white,

  primary: palette.teal50,
  danger: palette.pink50,
  success: palette.green,
  warning: palette.yellow,
} as const;
