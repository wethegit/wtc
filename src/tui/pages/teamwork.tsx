import { For, onCleanup, onMount } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { Page } from "../components/layout/page.tsx";
import { Section } from "../components/layout/section.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

export type TeamworkTab = "my-work" | "project";

const TEAMWORK_TABS = [
  { id: "my-work", label: "My Work" },
  { id: "project", label: "Project" },
] as const satisfies readonly { id: TeamworkTab; label: string }[];

export function getNextTeamworkTab(current: TeamworkTab, direction: 1 | -1): TeamworkTab {
  const currentIndex = TEAMWORK_TABS.findIndex((tab) => tab.id === current);
  const nextIndex = (currentIndex + direction + TEAMWORK_TABS.length) % TEAMWORK_TABS.length;

  return TEAMWORK_TABS[nextIndex]?.id ?? "project";
}

export function TeamworkPage(props: {
  activeTab: TeamworkTab;
  onTabChange: (tab: TeamworkTab) => void;
}) {
  const { setHints } = useStatusBar();

  useBindings(() => ({
    bindings: [
      {
        key: "left",
        desc: "Previous Teamwork tab",
        group: "Teamwork",
        cmd: () => props.onTabChange(getNextTeamworkTab(props.activeTab, -1)),
      },
      {
        key: "right",
        desc: "Next Teamwork tab",
        group: "Teamwork",
        cmd: () => props.onTabChange(getNextTeamworkTab(props.activeTab, 1)),
      },
    ],
  }));

  onMount(() => {
    setHints([{ key: "left/right", label: "tabs" }]);
  });

  onCleanup(() => setHints([]));

  return (
    <Page
      title="Teamwork"
      status={
        <text fg={tokens.textDim}>{props.activeTab === "project" ? "project" : "my work"}</text>
      }
    >
      <box flexDirection="column" gap={1}>
        <box flexDirection="row" gap={2}>
          <For each={TEAMWORK_TABS}>
            {(tab) => (
              <text
                attributes={props.activeTab === tab.id ? TextAttributes.BOLD : undefined}
                fg={props.activeTab === tab.id ? tokens.accent : tokens.textDim}
              >
                {props.activeTab === tab.id ? `[${tab.label}]` : tab.label}
              </text>
            )}
          </For>
        </box>

        {props.activeTab === "project" ? (
          <Section
            title="Project Teamwork"
            description="Project-specific Teamwork context from the nearest .wtc.yaml."
          >
            <text fg={tokens.text}>Project metadata, links, and tasks will appear here.</text>
            <text fg={tokens.textDim}>Use Settings to configure teamwork.projectId for now.</text>
          </Section>
        ) : (
          <Section
            title="My Work"
            description="Global Teamwork view for work assigned to the current user."
          >
            <text fg={tokens.text}>Assigned tasks and timers will appear here later.</text>
          </Section>
        )}
      </box>
    </Page>
  );
}
