import { For, Match, onCleanup, onMount, Switch } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { Page } from "../components/layout/page.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

import { MyWorkTab } from "./teamwork/my-work-tab.tsx";
import { ProjectTab } from "./teamwork/project-tab.tsx";

const TEAMWORK_TABS = ["my-work", "project"] as const;

export type TeamworkTab = (typeof TEAMWORK_TABS)[number];

const TABS = [
  { id: "my-work", label: "My Work" },
  { id: "project", label: "Project" },
] as const;

export function getNextTeamworkTab(current: TeamworkTab, direction: 1 | -1): TeamworkTab {
  const currentIndex = TABS.findIndex((tab) => tab.id === current);
  const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;

  return TABS[nextIndex]?.id ?? "project";
}

function isValidTab(tab: string): tab is TeamworkTab {
  return TEAMWORK_TABS.includes(tab as TeamworkTab);
}

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

  onMount(() => {
    setHints([{ key: "ctrl+←/→", label: "tabs" }]);
  });

  onCleanup(() => setHints([]));

  return (
    <Page
      title="Teamwork"
      status={<text fg={tokens.textDim}>{activeTab() === "project" ? "project" : "my work"}</text>}
    >
      <box flexDirection="column" gap={1}>
        <box flexDirection="row" gap={2}>
          <For each={TABS}>
            {(tab) => (
              <text
                attributes={activeTab() === tab.id ? TextAttributes.BOLD : undefined}
                fg={activeTab() === tab.id ? tokens.accent : tokens.textDim}
              >
                {activeTab() === tab.id ? `[${tab.label}]` : tab.label}
              </text>
            )}
          </For>
        </box>

        <Switch fallback={<MyWorkTab />}>
          <Match when={activeTab() === "project"}>
            <ProjectTab />
          </Match>
        </Switch>
      </box>
    </Page>
  );
}
