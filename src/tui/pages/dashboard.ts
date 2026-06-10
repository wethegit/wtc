import { ASCIIFont, Box, Select, Text, TextAttributes } from "@opentui/core";
import { tokens } from "../tokens.ts";

const navItems = [
  { name: "GitHub (coming soon)", description: "Repository workflows" },
  { name: "Amplify (coming soon)", description: "Hosting setup" },
  { name: "Teamwork (coming soon)", description: "Tasks and timers" },
  { name: "Settings (coming soon)", description: "Configuration" },
];

export function createDashboard(version = "0.1.0") {
  return Box(
    {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      flexGrow: 1,
      gap: 1,
    },
    Box(
      { flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 1 },
      ASCIIFont({ font: "tiny", text: "WTC" }),
      Text({ content: "What will you build?", attributes: TextAttributes.DIM }),
    ),
    Select({
      id: "dashboard-nav",
      width: 34,
      height: 4,
      options: navItems,
      selectedIndex: 0,
      showDescription: false,
      wrapSelection: true,
      selectedTextColor: tokens.selectionText,
      selectedBackgroundColor: tokens.selectionBg,
    }),
    Text({
      content: `v${version} | Press Ctrl+C to exit`,
      attributes: TextAttributes.DIM,
    }),
  );
}
