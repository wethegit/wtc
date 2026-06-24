import { tokens } from "../../tokens.ts";
import { Card } from "../../components/layout/card.tsx";

/** Placeholder tab for global Teamwork tasks assigned to the current user. */
export function MyWorkTab() {
  return (
    <Card title="My Work" status="coming soon">
      <text fg={tokens.textDim}>Assigned tasks and timers will appear here later.</text>
    </Card>
  );
}
