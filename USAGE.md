# Usage

## Authentication

WTC stores API tokens in OS-level secrets via `Bun.secrets` — they never touch your YAML config files or git history.

---

### Teamwork API Token

Required for all Teamwork features (task lists, timers, branch/PR workflows).

#### How to get your token

1. Log in to your Teamwork account.
2. Click on your profile on the top-right corner
3. Select `Edit my details`
4. Select `API & Mobile`
5. Under `Your API Token` click `Show your token`

#### How to store it

```bash
wtc config auth set teamwork --token <your-token>
```

The `--token` flag is required. Replace `<your-token>` with your actual token. The value is stored in your OS keychain.

Alternatively you can also use the TUI by:

1. Open TUI with `wtc`
2. Open command palette with `control+p`
3. Navigate to `Open Settings`
4. Under `User config` add your token to `Teamwork auth`
5. Press `control+s` to save

---

### GitHub Personal Access Token

Required for branch creation and draft PR workflows.

GitHub recommends fine-grained PATs over classic tokens. You need a token with write-level permissions for Contents (create branches, push) and Pull requests.

#### How to get your token

1. Open your GitHub token settings:
   `https://github.com/settings/tokens`
2. Click **Generate new token** → **Fine-grained token**.
3. Fill in the fields:
   - **Token name** — `wtc-cli`
   - **Expiration** — choose a duration (90 days recommended)
   - **Resource owner** — your account or the relevant organization
   - **Repository access** — **Only select repositories** (preferred) or **All repositories**
4. Under **Repository permissions**, set these to **Read and write**:
   - **Contents** — needed to create branches and push
   - **Pull requests** — needed to create draft PRs
5. Click **Generate token**.
6. **Copy the token immediately** — you will not be able to see it again.

#### How to store it

```bash
wtc config auth set github --token <your-token>
```

The `--token` flag is required. Replace `<your-token>` with your actual token. The value is stored in your OS keychain.

Alternatively you can also use the TUI by:

1. Open TUI with `wtc`
2. Open command palette with `ctrl+p`
3. Navigate to `Open Settings`
4. Under `User config` add your token to `GitHub auth`
5. Press `ctrl+s` to save
