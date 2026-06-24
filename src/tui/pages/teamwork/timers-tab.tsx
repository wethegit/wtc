import { createSignal, For, onCleanup, onMount } from "solid-js";

import { loadLocalTimers, type LocalTimerEntry } from "../../../teamwork/timers/local.ts";
import { TimerIndicator } from "../../components/teamwork/timer-indicator.tsx";
import { Section } from "../../components/layout/section.tsx";
import { tokens } from "../../tokens.ts";

/** Teamwork timers tab showing local timers (running first, then stopped/pending). */
export function TimersTab() {
  const [localTimers, setLocalTimers] = createSignal<LocalTimerEntry[]>([]);
  const [flashOn, setFlashOn] = createSignal(true);

  const refreshTimers = async () => {
    setLocalTimers(await loadLocalTimers());
  };

  const sortedTimers = () => {
    const timers = localTimers();
    return [...timers].sort((a, b) => {
      if (a.status === "running" && b.status !== "running") return -1;
      if (a.status !== "running" && b.status === "running") return 1;
      return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
  };

  onMount(() => {
    void refreshTimers();

    const flashInterval = setInterval(() => {
      setFlashOn((prev) => !prev);
    }, 800);

    onCleanup(() => clearInterval(flashInterval));
  });

  return (
    <box
      border
      borderStyle="rounded"
      borderColor={tokens.borderFocus}
      paddingY={1}
      paddingX={2}
      gap={1}
    >
      <text fg={tokens.text}>{localTimers().length > 0 ? "Local Timers" : "No timers"}</text>

      <For each={sortedTimers()}>
        {(timer) => (
          <Section
            active={timer.status === "running"}
            title={timer.taskName}
            description={[
              `Task ID: ${timer.taskId}`,
              `Started: ${new Date(timer.startTime).toLocaleString()}`,
              timer.endTime ? `Ended: ${new Date(timer.endTime).toLocaleString()}` : "",
              `Status: ${timer.status}`,
            ]}
          >
            <TimerIndicator status={timer.status} flashOn={flashOn()} />
          </Section>
        )}
      </For>
    </box>
  );
}
