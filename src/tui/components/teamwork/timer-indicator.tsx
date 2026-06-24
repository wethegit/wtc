import { tokens } from "../../tokens.ts";

/** Props for a compact timer duration badge shown inline in list items. */
export interface TimerBadgeProps {
  elapsedMs: number;
  running: boolean;
  flashOn?: boolean;
}

/**
 * Compact inline timer badge showing elapsed time.
 *
 * Running timers use an accent color with an optional flash; stopped timers
 * are shown in dim text. Format is "⏱ 1h 23m" or "⏱ 0m 45s".
 */
export function TimerBadge(props: TimerBadgeProps) {
  const formatted = formatBadgeDuration(props.elapsedMs);

  return (
    <text fg={props.running ? (props.flashOn ? tokens.accent : tokens.accentSoft) : tokens.textDim}>
      ⏱ {formatted}
    </text>
  );
}

function formatBadgeDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, "0")}m`;
  }

  return `${minutes}m`;
}
