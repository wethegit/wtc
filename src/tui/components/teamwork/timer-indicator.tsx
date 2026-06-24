import { tokens } from "../../tokens.ts";

/** Visual state for a local timer indicator. */
export type TimerIndicatorStatus = "running" | "stopped";

/** Shared local timer indicator used anywhere task timers are shown. */
export function TimerIndicator(props: { status: TimerIndicatorStatus; flashOn?: boolean }) {
  return (
    <text
      fg={
        props.status === "running" ? (props.flashOn ? tokens.text : tokens.textDim) : tokens.textDim
      }
    >
      ⏱ {props.status === "running" ? "Running" : "Stopped"}
    </text>
  );
}
