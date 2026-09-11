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

export async function downloadUpdate(update, onProgress) {
  try {
    let downloaded = 0;
    let total = 0;

    await update.download((event) => {
      switch (event.event) {
        case "Started":
          total = event.data.contentLength || 0;
          downloaded = 0;

          if (onProgress) {
            onProgress(0);
          }
          break;

        case "Progress":
          downloaded += event.data.chunkLength;

          if (total > 0 && onProgress) {
            const percentage = Math.min(
              100,
              Math.round((downloaded / total) * 100)
            );

            onProgress(percentage);
          }
          break;

        case "Finished":
          if (onProgress) {
            onProgress(100);
          }
          break;

        default:
          break;
      }
    });

    return true;
  } catch (error) {
    console.error("Failed to download update:", error);
    return false;
  }
}

export async function installUpdate(update) {
  try {
    await update.install();
    await relaunch();

    return true;
  } catch (error) {
    console.error("Failed to install update:", error);
    return false;
  }
}