import type { GitHubAuthStatus } from "../../../api/github/auth.ts";
import type { TeamworkAuthStatus } from "../../../api/teamwork/auth.ts";
import { TextField } from "../../components/forms/text-field.tsx";
import { AccordionSection } from "../../components/layout/accordion-section.tsx";
import { tokens } from "../../tokens.ts";
import type { SettingsFocusTarget, SettingsFormState } from "./types.ts";

/** Settings section for user-level config (workspace name, Teamwork auth, GitHub auth). */
export function UserConfigSection(props: {
  form: SettingsFormState;
  userConfigPath: string | undefined;
  expanded: boolean;
  teamworkAuthStatus: TeamworkAuthStatus;
  githubAuthStatus: GitHubAuthStatus;
  isFocused: (target: SettingsFocusTarget) => boolean;
  onToggle: () => void;
  onWorkspaceNameInput: (value: string) => void;
  onGitHubRepoOwnerInput: (value: string) => void;
  onTeamworkApiTokenInput: (value: string) => void;
  onGitHubApiTokenInput: (value: string) => void;
}) {
  return (
    <AccordionSection
      title="User config"
      description={props.userConfigPath}
      expanded={props.expanded}
      onToggle={props.onToggle}
    >
      <box flexDirection="column" gap={1}>
        <TextField
          name="workspaceName"
          label="workspaceName"
          value={props.form.user.workspaceName}
          placeholder="Workspace name"
          description="User-level placeholder while broader settings are designed."
          focused={props.isFocused({ type: "field", name: "workspaceName" })}
          onInput={props.onWorkspaceNameInput}
        />

        <TextField
          name="githubRepoOwner"
          label="github.repoOwner"
          value={props.form.user.githubRepoOwner}
          placeholder="wethegit"
          description="Approved GitHub org used for repo templates and new repos."
          focused={props.isFocused({ type: "field", name: "githubRepoOwner" })}
          onInput={props.onGitHubRepoOwnerInput}
        />

        <box
          flexDirection="column"
          gap={1}
          paddingLeft={1}
          border={["left"]}
          borderColor={tokens.accentSoft}
        >
          <box flexDirection="column" gap={0}>
            <text fg={tokens.text}>Teamwork auth</text>
            <text fg={tokens.textDim}>Status: {props.teamworkAuthStatus}</text>
          </box>
          <TextField
            name="teamworkApiToken"
            label="teamworkApiToken"
            value={props.form.user.teamworkApiToken}
            width={40}
            placeholder="Paste new token"
            description="User-level secret stored outside YAML; this field clears after save."
            focused={props.isFocused({ type: "field", name: "teamworkApiToken" })}
            onInput={props.onTeamworkApiTokenInput}
          />
        </box>

        <box
          flexDirection="column"
          gap={1}
          paddingLeft={1}
          border={["left"]}
          borderColor={tokens.accentSoft}
        >
          <box flexDirection="column" gap={0}>
            <text fg={tokens.text}>GitHub auth</text>
            <text fg={tokens.textDim}>Status: {props.githubAuthStatus}</text>
          </box>
          <TextField
            name="githubApiToken"
            label="githubApiToken"
            value={props.form.user.githubApiToken}
            width={40}
            placeholder="Paste new token"
            description="User-level secret stored outside YAML; this field clears after save."
            focused={props.isFocused({ type: "field", name: "githubApiToken" })}
            onInput={props.onGitHubApiTokenInput}
          />
        </box>
      </box>
    </AccordionSection>
  );
}
