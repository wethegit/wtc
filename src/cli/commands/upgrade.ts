import { APP_VERSION } from "../../api/config/consts.ts";
import { checkForUpdate as checkForUpdateFn, type UpdateInfo } from "../../utils/update-check.ts";

const REPO = "wethegit/wtc";

interface UpgradeActions {
  checkForUpdate: () => Promise<UpdateInfo>;
}

const upgradeActions: UpgradeActions = {
  checkForUpdate: checkForUpdateFn,
};

/**
 * Checks GitHub Releases and prints the install command when an update exists.
 *
 * The `_args` shape is already wired for future upgrade modes. Today only
 * `--check` is accepted, so this command never mutates the local installation.
 */
export async function upgrade(_args: { check: boolean }, actions = upgradeActions): Promise<void> {
  const info = await actions.checkForUpdate();

  if (!info.updateAvailable) {
    console.log(`You're up to date (v${APP_VERSION}).`);
    return;
  }

  console.log(`Update available: v${APP_VERSION} \u2192 ${info.latestVersion}`);
  console.log(`  curl -fsSL https://raw.githubusercontent.com/${REPO}/main/install.sh | bash`);
}
