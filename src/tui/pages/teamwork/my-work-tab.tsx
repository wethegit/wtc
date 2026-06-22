import { Section } from "../../components/layout/section.tsx";
import { tokens } from "../../tokens.ts";

/** Placeholder tab for global Teamwork tasks assigned to the current user. */
export function MyWorkTab() {
  return (
    <Section
      title="My Work"
      description="Global Teamwork view for work assigned to the current user."
    >
      <text fg={tokens.text}>Assigned tasks and timers will appear here later.</text>
    </Section>
  );
}
