// this script creates or updates latest.json automatically


const fs = require("fs");
const path = require("path");

const projectRoot = path.resolve(__dirname, "..");

const tauriConfigPath = path.join(
  projectRoot,
  "src-tauri",
  "tauri.conf.json"
);

const config = JSON.parse(fs.readFileSync(tauriConfigPath, "utf8"));

const version = config.version;

const installerName = `CashBook_${version}_x64-setup.exe`;

const installerPath = path.join(
  projectRoot,
  "src-tauri",
  "target",
  "release",
  "bundle",
  "nsis",
  installerName
);

const signaturePath = `${installerPath}.sig`;

if (!fs.existsSync(installerPath)) {
  console.error(`Installer not found: ${installerPath}`);
  process.exit(1);
}

if (!fs.existsSync(signaturePath)) {
  console.error(`Signature not found: ${signaturePath}`);
  process.exit(1);
}

const signature = fs.readFileSync(signaturePath, "utf8").trim();

const latestJson = {
  version,
  notes: `CashBook ${version}`,
  pub_date: new Date().toISOString(),
  platforms: {
    "windows-x86_64": {
      url: `https://github.com/riissshu/CashBookApp/releases/download/v${version}/${installerName}`,
      signature
    }
  }
};

const outputPath = path.join(projectRoot, "latest.json");

fs.writeFileSync(
  outputPath,
  JSON.stringify(latestJson, null, 2),
  "utf8"
);

console.log(`latest.json created successfully for CashBook ${version}`);