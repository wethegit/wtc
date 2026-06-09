import { ASCIIFont, Box, Text, TextAttributes } from "@opentui/core";

export function createDashboard() {
  return Box(
    { alignItems: "center", justifyContent: "center", flexGrow: 1 },
    Box(
      { justifyContent: "center", alignItems: "flex-end" },
      ASCIIFont({ font: "tiny", text: "WTC" }),
      Text({ content: "What will you build?", attributes: TextAttributes.DIM }),
    ),
  );
}
