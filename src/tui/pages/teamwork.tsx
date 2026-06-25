import { createEffect, For, Match, onCleanup, Switch } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { Page } from "../components/layout/page.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

import { MyWorkTab } from "./teamwork/my-work-tab.tsx";
import { ProjectTab } from "./teamwork/project-tab.tsx";
import { TimersTab } from "./teamwork/timers-tab.tsx";

const TEAMWORK_TABS = ["my-work", "project", "timers"] as const;

/** Valid Teamwork page tab identifiers. */
export type TeamworkTab = (typeof TEAMWORK_TABS)[number];

const TABS = [
  { id: "my-work", label: "My Work" },
  { id: "project", label: "Project" },
  { id: "timers", label: "Timers" },
] as const;

/** Cycles to the next or previous Teamwork tab, wrapping around. */
export function getNextTeamworkTab(current: TeamworkTab, direction: 1 | -1): TeamworkTab {
  const currentIndex = TABS.findIndex((tab) => tab.id === current);
  const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;

  return TABS[nextIndex]?.id ?? "project";
}

function isValidTab(tab: string): tab is TeamworkTab {
  return TEAMWORK_TABS.includes(tab as TeamworkTab);
}

/** Teamwork route page with My Work and Project tabs, restoring the last active tab from state. */
export function TeamworkPage(props: {
  activeTab: string;
  onTabChange: (tab: TeamworkTab) => void;
}) {
  const activeTab = () => {
    const current = props.activeTab;
    if (!isValidTab(current)) {
      throw Error(`Invalid teamwork tab: ${current}`);
    }
    return current;
  };

  const { setHints } = useStatusBar();

  useBindings(() => ({
    bindings: [
      {
        key: "ctrl+left",
        desc: "Previous Teamwork tab",
        group: "Teamwork",
        cmd: () => props.onTabChange(getNextTeamworkTab(activeTab(), -1)),
      },
      {
        key: "ctrl+right",
        desc: "Next Teamwork tab",
        group: "Teamwork",
        cmd: () => props.onTabChange(getNextTeamworkTab(activeTab(), 1)),
      },
    ],
  }));

  createEffect(() => {
    const tab = activeTab();
    setHints(
      tab === "project"
        ? [
            { key: "ctrl+←/→", label: "tabs" },
            { key: "ctrl+o", label: "open" },
            { key: "ctrl+t", label: "timer" },
          ]
        : tab === "timers"
          ? [
              { key: "ctrl+←/→", label: "tabs" },
              { key: "ctrl+t", label: "toggle" },
              { key: "ctrl+s", label: "submit" },
              { key: "ctrl+d", label: "discard" },
              { key: "ctrl+o", label: "timesheet" },
            ]
          : [
              { key: "ctrl+←/→", label: "tabs" },
              { key: "↑/↓", label: "tasks" },
              { key: "ctrl+o", label: "open" },
              { key: "ctrl+t", label: "timer" },
            ],
    );
  });

  onCleanup(() => setHints([]));

  return (
    <Page title="Teamwork" status={<text fg={tokens.textDim}>{activeTab()}</text>}>
      <box flexDirection="column">
        <box flexDirection="row" gap={2}>
          <For each={TABS}>
            {(tab) => (
              <box
                border={["top", "right", "left"]}
                borderStyle="rounded"
                paddingX={1}
                borderColor={activeTab() === tab.id ? tokens.borderFocus : tokens.border}
              >
                <text
                  attributes={activeTab() === tab.id ? TextAttributes.BOLD : undefined}
                  fg={activeTab() === tab.id ? tokens.accent : tokens.textDim}
                >
                  {tab.label}
                </text>
              </box>
            )}
          </For>
        </box>

        <Switch fallback={<MyWorkTab />}>
          <Match when={activeTab() === "project"}>
            <ProjectTab />
          </Match>
          <Match when={activeTab() === "timers"}>
            <TimersTab />
          </Match>
        </Switch>
      </box>
    </Page>
  );
}
