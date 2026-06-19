import { createSignal, For, onMount } from "solid-js";
import { TextAttributes } from "@opentui/core";

import { loadResolvedConfig } from "../../../config/manager.ts";
import type { ResolvedConfig } from "../../../config/schema.ts";
import { getTeamworkAuthStatus, type TeamworkAuthStatus } from "../../../teamwork/auth.ts";
import {
  getTeamworkProjectMetadata,
  type TeamworkProjectMetadataResult,
} from "../../../teamwork/project-metadata.ts";
import { getTeamworkTaskListTasks, type TeamworkTask } from "../../../teamwork/task-list-tasks.ts";
import { TaskList } from "../../components/teamwork/task-list.tsx";
import { Section } from "../../components/layout/section.tsx";
import { tokens } from "../../tokens.ts";

interface PinnedTaskListState {
  id: number;
  name: string;
  tasks: TeamworkTask[];
  message: string | null;
}

export function ProjectTab() {
  const [resolved, setResolved] = createSignal<ResolvedConfig | null>(null);
  const [teamworkAuthStatus, setTeamworkAuthStatus] = createSignal<TeamworkAuthStatus>("missing");
  const [projectMetadata, setProjectMetadata] = createSignal<TeamworkProjectMetadataResult | null>(
    null,
  );
  const [pinnedTaskLists, setPinnedTaskLists] = createSignal<PinnedTaskListState[]>([]);
  const [projectMessage, setProjectMessage] = createSignal("Loading project context...");

  const loadProjectContext = async () => {
    setProjectMessage("Loading project context...");
    setProjectMetadata(null);
    setPinnedTaskLists([]);

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

      const nextPinnedTaskLists: PinnedTaskListState[] = [];
      for (const taskList of config.project.teamwork.pinnedTaskLists) {
        try {
          nextPinnedTaskLists.push({
            id: taskList.id,
            name: taskList.name,
            tasks: await getTeamworkTaskListTasks(taskList.id),
            message: null,
          });
        } catch (error) {
          nextPinnedTaskLists.push({
            id: taskList.id,
            name: taskList.name,
            tasks: [],
            message: error instanceof Error ? error.message : "Failed to load task list.",
          });
        }
      }

      setPinnedTaskLists(nextPinnedTaskLists);
      setProjectMessage(
        metadata.source === "cache"
          ? "Using cached Teamwork project metadata."
          : "Fetched Teamwork project metadata.",
      );
    } catch (error) {
      setProjectMessage(error instanceof Error ? error.message : "Failed to load project context.");
    }
  };

  onMount(() => {
    void loadProjectContext();
  });

  return (
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

        <box flexDirection="column" gap={1}>
          <text attributes={TextAttributes.BOLD} fg={tokens.text}>
            Pinned task lists
          </text>
          {resolved()?.project?.teamwork.pinnedTaskLists.length ? (
            <For each={pinnedTaskLists()}>
              {(taskList) => (
                <box flexDirection="column" gap={0}>
                  <text fg={tokens.text}>
                    {taskList.name} ({taskList.id})
                  </text>
                  {taskList.message ? (
                    <text fg={tokens.textDim}>{taskList.message}</text>
                  ) : (
                    <TaskList tasks={taskList.tasks} emptyMessage="No tasks found." />
                  )}
                </box>
              )}
            </For>
          ) : (
            <text fg={tokens.textDim}>No pinned task lists configured.</text>
          )}
        </box>
      </box>
    </Section>
  );
}
