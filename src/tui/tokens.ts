export const palette = {
  black: "#101820",
  teal50: "#9ad9e9",
  teal75: "#2daccc",
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
  bgRaised: palette.black75,


  text: palette.white,
  textDim: palette.black50,
  textAccent: palette.teal75,

  border: palette.black75,
  borderFocus: palette.teal75,
  selectionBg: palette.teal50,
  selectionText: palette.teal75,

  primary: palette.teal75,
  danger: palette.pink50,
  success: palette.green,
  warning: palette.yellow,
} as const;
