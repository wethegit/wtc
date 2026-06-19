import { For, onCleanup, onMount } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { Page } from "../components/layout/page.tsx";
import { Section } from "../components/layout/section.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

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
        key: "left",
        desc: "Previous Teamwork tab",
        group: "Teamwork",
        cmd: () => props.onTabChange(getNextTeamworkTab(activeTab(), -1)),
      },
      {
        key: "right",
        desc: "Next Teamwork tab",
        group: "Teamwork",
        cmd: () => props.onTabChange(getNextTeamworkTab(activeTab(), 1)),
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

        {activeTab() === "project" ? (
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
