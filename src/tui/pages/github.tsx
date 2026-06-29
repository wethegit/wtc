import { createSignal, onCleanup, onMount } from "solid-js";
import { TextAttributes } from "@opentui/core";
import { useBindings } from "@opentui/keymap/solid";

import { loadResolvedConfig } from "../../api/config/manager.ts";
import { getGitHubAuthStatus, type GitHubAuthStatus } from "../../api/github/auth.ts";
import {
  createGitHubRepoFromTemplate,
  getGitHubTemplateRepos,
  type CreatedGitHubRepo,
  type GitHubTemplateRepo,
} from "../../api/github/repos.ts";
import { openUrlInBrowser } from "../../utils/browser.ts";
import { ActionButton } from "../components/forms/action-button.tsx";
import { Card } from "../components/layout/card.tsx";
import { Page } from "../components/layout/page.tsx";
import { ConfirmDialog } from "../components/confirm-dialog.tsx";
import { DialogInput } from "../components/dialog-input.tsx";
import { DialogSelect } from "../components/dialog-select.tsx";
import type { DialogSelectOption } from "../components/dialog-select.tsx";
import { LoadingDialog } from "../components/loading-dialog.tsx";
import { useDialog } from "../components/dialog.tsx";
import { useStatusBar } from "../components/status-bar.tsx";
import { tokens } from "../tokens.ts";

interface RepoCreationDraft {
  template: GitHubTemplateRepo;
  name: string;
  description: string;
  private: boolean;
}

/** GitHub route for creating repositories from approved organization templates. */
export function GitHubPage() {
  const dialog = useDialog();
  const { setHints } = useStatusBar();
  const [githubAuthStatus, setGitHubAuthStatus] = createSignal<GitHubAuthStatus>("missing");
  const [repoOwner, setRepoOwner] = createSignal("");
  const [message, setMessage] = createSignal("Loading GitHub context...");
  const [isCreating, setIsCreating] = createSignal(false);

  let creating = false;

  const loadGitHubContext = async () => {
    setMessage("Loading GitHub context...");

    try {
      const [config, authStatus] = await Promise.all([
        loadResolvedConfig(process.cwd()),
        getGitHubAuthStatus(),
      ]);
      const owner = config.user.github.repoOwner.trim();

      setGitHubAuthStatus(authStatus);
      setRepoOwner(owner);
      if (authStatus === "missing") {
        setMessage("GitHub auth not configured. Use Settings to add your API token.");
        return;
      }

      if (!owner) {
        setMessage("Set github.repoOwner in Settings before creating repos.");
        return;
      }

      setMessage(`Ready to create repos under ${owner}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to load GitHub context.");
    }
  };

  const startCreateRepo = async () => {
    const owner = repoOwner();
    if (githubAuthStatus() === "missing") {
      setMessage("GitHub auth not configured. Use Settings to add your API token.");
      return;
    }
    if (!owner) {
      setMessage("Set github.repoOwner in Settings before creating repos.");
      return;
    }

    dialog.replace(() => <LoadingDialog message={`Loading ${owner} templates...`} />);

    try {
      const templates = await getGitHubTemplateRepos(owner);
      if (!templates.length) {
        dialog.replace(() => (
          <ConfirmDialog
            title="No Templates"
            message={`No template repositories found under ${owner}. Check that your GitHub token can access the template repositories.`}
            confirmLabel="OK"
            onConfirm={async () => {}}
          />
        ));
        return;
      }

      showTemplateStep(templates);
    } catch (error) {
      dialog.replace(() => (
        <ConfirmDialog
          title="Template Load Failed"
          message={error instanceof Error ? error.message : "Failed to load GitHub templates."}
          confirmLabel="OK"
          onConfirm={async () => {}}
        />
      ));
    }
  };

  const triggerCreateRepo = () => {
    if (dialog.active() || isCreating()) return;
    void startCreateRepo();
  };

  const showTemplateStep = (templates: GitHubTemplateRepo[]) => {
    const options: DialogSelectOption<GitHubTemplateRepo>[] = templates.map((template) => ({
      title: template.name,
      description: template.description ?? template.fullName,
      value: template,
      category: "Templates",
      onSelect: () => showNameStep(template),
    }));

    dialog.replace(() => (
      <DialogSelect<GitHubTemplateRepo>
        title="Select Template"
        options={options}
        onCancel={() => {
          dialog.clear();
          setMessage("Repo creation cancelled.");
        }}
      />
    ));
  };

  const showNameStep = (template: GitHubTemplateRepo) => {
    dialog.replace(() => (
      <DialogInput
        title="Repository Name"
        label="Enter the new repository name:"
        initialValue=""
        confirmLabel="Next"
        onConfirm={(name) =>
          showDescriptionInput({ template, name, description: "", private: true })
        }
        onCancel={() => {
          dialog.clear();
          setMessage("Repo creation cancelled.");
        }}
      />
    ));
  };

  const showDescriptionInput = (draft: RepoCreationDraft) => {
    dialog.replace(() => (
      <DialogInput
        title="Description"
        label="Optional repository description. Leave blank to skip:"
        initialValue=""
        confirmLabel="Next"
        cancelLabel="Skip"
        allowEmpty
        onConfirm={(description) => showVisibilityStep({ ...draft, description })}
        onCancel={() => showVisibilityStep(draft)}
      />
    ));
  };

  const showVisibilityStep = (draft: RepoCreationDraft) => {
    const options: DialogSelectOption<boolean>[] = [
      {
        title: "private",
        description: "Only organization members with access can view it",
        value: true,
        category: "Visibility",
        onSelect: () => showConfirmStep({ ...draft, private: true }),
      },
      {
        title: "public",
        description: "Anyone can view it",
        value: false,
        category: "Visibility",
        onSelect: () => showConfirmStep({ ...draft, private: false }),
      },
    ];

    dialog.replace(() => (
      <DialogSelect<boolean>
        title="Repository Visibility"
        options={options}
        onCancel={() => showDescriptionInput(draft)}
      />
    ));
  };

  const showConfirmStep = (draft: RepoCreationDraft) => {
    const owner = repoOwner();
    const description = draft.description ? `\nDescription: ${draft.description}` : "";
    dialog.replace(() => (
      <ConfirmDialog
        title="Create Repository"
        message={`Create ${owner}/${draft.name} from ${draft.template.fullName} as ${draft.private ? "private" : "public"}?${description}`}
        confirmLabel="Create"
        cancelLabel="Back"
        autoClose={false}
        onConfirm={() => createRepo(draft)}
        onCancel={() => showVisibilityStep(draft)}
      />
    ));
  };

  const showSuccessDialog = (repo: CreatedGitHubRepo) => {
    dialog.replace(() => (
      <ConfirmDialog
        title="Repository Created"
        message={`${repo.fullName}\n${repo.htmlUrl}`}
        confirmLabel="Open"
        cancelLabel="Close"
        onConfirm={async () => {
          try {
            await openUrlInBrowser(repo.htmlUrl);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : "Failed to open repository.");
          }
        }}
        onCancel={() => dialog.clear()}
      />
    ));
  };

  const createRepo = async (draft: RepoCreationDraft) => {
    if (creating) return;
    creating = true;
    setIsCreating(true);
    dialog.replace(() => <LoadingDialog message={`Creating ${draft.name}...`} />);

    try {
      const owner = repoOwner();
      const repo = await createGitHubRepoFromTemplate({
        templateOwner: owner,
        templateRepo: draft.template.name,
        owner,
        name: draft.name,
        description: draft.description.trim() || undefined,
        private: draft.private,
      });
      setMessage(`Created GitHub repo: ${repo.fullName}`);
      showSuccessDialog(repo);
    } catch (error) {
      dialog.replace(() => (
        <ConfirmDialog
          title="Repo Creation Failed"
          message={error instanceof Error ? error.message : "Failed to create GitHub repo."}
          confirmLabel="OK"
          onConfirm={async () => {}}
        />
      ));
      setMessage(error instanceof Error ? error.message : "Failed to create GitHub repo.");
    } finally {
      creating = false;
      setIsCreating(false);
    }
  };

  useBindings(() => ({
    bindings: [
      {
        key: "ctrl+n",
        desc: "Create repo from template",
        group: "GitHub",
        cmd: triggerCreateRepo,
      },
      {
        key: "return",
        desc: "Create repo from template",
        group: "GitHub",
        cmd: triggerCreateRepo,
      },
    ],
  }));

  onMount(() => {
    void loadGitHubContext();
    setHints([
      { key: "↵", label: "create" },
      { key: "^N", label: "new repo" },
    ]);
  });

  onCleanup(() => setHints([]));

  return (
    <Page
      title="GitHub"
      status={<text fg={tokens.textDim}>{githubAuthStatus()}</text>}
      message={<text fg={tokens.textDim}>{message()}</text>}
    >
      <box flexDirection="column" gap={1}>
        <Card title="Repo Creation" status={repoOwner() || "no repo owner"}>
          <text attributes={TextAttributes.BOLD} fg={tokens.accent}>
            Create from template
          </text>
          <text fg={tokens.textDim}>
            Templates and new repos use the configured github.repoOwner.
          </text>
          <ActionButton
            name="create-github-repo"
            label={isCreating() ? "creating" : "create repo"}
            variant="primary"
            focused={!dialog.active()}
            onPress={triggerCreateRepo}
          />
        </Card>
      </box>
    </Page>
  );
}
