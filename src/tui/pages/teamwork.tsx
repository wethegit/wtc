import { createSignal, For, onCleanup, onMount } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { loadResolvedConfig } from "../../config/manager.ts";
import type { ResolvedConfig } from "../../config/schema.ts";
import { getTeamworkAuthStatus, type TeamworkAuthStatus } from "../../teamwork/auth.ts";
import {
  getTeamworkProjectMetadata,
  type TeamworkProjectMetadataResult,
} from "../../teamwork/project-metadata.ts";
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
  const [resolved, setResolved] = createSignal<ResolvedConfig | null>(null);
  const [teamworkAuthStatus, setTeamworkAuthStatus] = createSignal<TeamworkAuthStatus>("missing");
  const [projectMetadata, setProjectMetadata] = createSignal<TeamworkProjectMetadataResult | null>(
    null,
  );
  const [projectMessage, setProjectMessage] = createSignal("Loading project context...");

  const loadProjectContext = async () => {
    setProjectMessage("Loading project context...");
    setProjectMetadata(null);

    try {
      const config = await loadResolvedConfig(process.cwd());
      const authStatus = await getTeamworkAuthStatus();
      const projectId = config.project?.teamwork.projectId ?? null;

      setResolved(config);
      setTeamworkAuthStatus(authStatus);

      if (!config.project) {
        setProjectMessage("No project config found. Use Settings to create .wtc.yaml.");
        return;
      }

      if (!projectId) {
        setProjectMessage("Set teamwork.projectId in Settings to load Teamwork metadata.");
        return;
      }

      const metadata = await getTeamworkProjectMetadata(projectId);
      setProjectMetadata(metadata);
      setProjectMessage(
        metadata.source === "cache"
          ? "Using cached Teamwork project metadata."
          : "Fetched Teamwork project metadata.",
      );
    } catch (error) {
      setProjectMessage(error instanceof Error ? error.message : "Failed to load project context.");
    }
  };

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
    void loadProjectContext();
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
            <box flexDirection="column" gap={1}>
              <box flexDirection="column" gap={0}>
                <text fg={tokens.textDim}>
                  Project config: {resolved()?.paths.projectConfigPath ?? "not found"}
                </text>
                <text fg={tokens.textDim}>
                  Teamwork project ID: {resolved()?.project?.teamwork.projectId ?? "not configured"}
                </text>
                <text fg={tokens.textDim}>Teamwork auth: {teamworkAuthStatus()}</text>
              </box>

              {projectMetadata() ? (
                <box flexDirection="column" gap={0}>
                  <text fg={tokens.text}>Teamwork project: {projectMetadata()?.project.name}</text>
                  <text fg={tokens.textDim}>{projectMessage()}</text>
                </box>
              ) : (
                <text fg={tokens.textDim}>{projectMessage()}</text>
              )}

              <box flexDirection="column" gap={0}>
                <text attributes={TextAttributes.BOLD} fg={tokens.text}>
                  Project links
                </text>
                {resolved()?.project?.project.links.length ? (
                  <For each={resolved()?.project?.project.links ?? []}>
                    {(link) => (
                      <text fg={tokens.textDim}>
                        {link.name}: {link.url}
                      </text>
                    )}
                  </For>
                ) : (
                  <text fg={tokens.textDim}>No project links configured.</text>
                )}
              </box>
            </box>
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
