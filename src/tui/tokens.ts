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
