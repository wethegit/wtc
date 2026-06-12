import { TextAttributes } from "@opentui/core";
import { tokens } from "../tokens.ts";

const navItems = [
  { name: "GitHub (coming soon)", description: "Repository workflows" },
  { name: "Amplify (coming soon)", description: "Hosting setup" },
  { name: "Teamwork (coming soon)", description: "Tasks and timers" },
  { name: "Settings (coming soon)", description: "Configuration" },
];

export function Dashboard(props: { version?: string }) {
  const version = props.version ?? "0.1.0";

  return (
    <box flexDirection="column" alignItems="center" justifyContent="center" flexGrow={1} gap={1}>
      <box flexDirection="column" justifyContent="center" alignItems="center" gap={1}>
        <ascii_font font="tiny" text="WTC" />
        <text attributes={TextAttributes.DIM}>What will you build?</text>
      </box>
      <select
        id="dashboard-nav"
        width={34}
        height={4}
        options={navItems}
        selectedIndex={0}
        showDescription={false}
        wrapSelection={true}
        selectedTextColor={tokens.selectionText}
        selectedBackgroundColor={tokens.selectionBg}
      />
      <text attributes={TextAttributes.DIM}>v{version} · Press Ctrl+C to exit</text>
    </box>
  );
}
