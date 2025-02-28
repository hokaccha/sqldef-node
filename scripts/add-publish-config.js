#!/usr/bin/env node

/**
 * このスクリプトは、すべてのパッケージにpublishConfig.accessをpublicに設定します。
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// packagesディレクトリ内のすべてのパッケージを更新
const packagesDir = join(rootDir, "packages");
const packages = [
  "core",
  "psqldef",
  "psqldef-darwin-amd64",
  "psqldef-darwin-arm64",
  "psqldef-linux-386",
  "psqldef-linux-amd64",
  "psqldef-linux-arm",
  "psqldef-linux-arm64",
  "psqldef-windows-amd64",
];

for (const pkg of packages) {
  const packageJsonPath = join(packagesDir, pkg, "package.json");
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

    // publishConfigが存在しない場合は追加
    if (!packageJson.publishConfig) {
      packageJson.publishConfig = {
        access: "public",
      };

      writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + "\n"
      );
      console.log(`${pkg} にpublishConfig.accessを追加しました`);
    } else if (packageJson.publishConfig.access !== "public") {
      packageJson.publishConfig.access = "public";

      writeFileSync(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + "\n"
      );
      console.log(`${pkg} のpublishConfig.accessをpublicに更新しました`);
    } else {
      console.log(
        `${pkg} はすでにpublishConfig.accessがpublicに設定されています`
      );
    }
  } catch (error) {
    console.error(`${pkg} の更新中にエラーが発生しました:`, error.message);
  }
}

console.log("すべてのパッケージにpublishConfig.accessを設定しました");
