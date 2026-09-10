import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export async function checkForUpdate() {
  try {
    const update = await check();

    if (update) {
      return update;
    }

    return null;
  } catch (error) {
    console.error("Failed to check for updates:", error);
    return null;
  }
}

export async function installUpdate(update) {
  try {
    await update.downloadAndInstall();
    await relaunch();
    return true;
  } catch (error) {
    console.error("Failed to install update:", error);
    return false;
  }
}