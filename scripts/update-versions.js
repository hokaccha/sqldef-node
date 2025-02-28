#!/usr/bin/env node

/**
 * このスクリプトは、packagesディレクトリ内のすべてのパッケージのバージョンを一括で更新します。
 * libsディレクトリ内のパッケージは更新対象外です。
 * 使用方法: node scripts/update-versions.js <version>
 * 例: node scripts/update-versions.js 1.0.0
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// コマンドライン引数からバージョンを取得
const newVersion = process.argv[2];

if (!newVersion) {
  console.error("エラー: バージョンを指定してください");
  console.error("使用方法: node scripts/update-versions.js <version>");
  process.exit(1);
}

// ルートのpackage.jsonを更新
const rootPackageJsonPath = join(rootDir, "package.json");
const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, "utf8"));
rootPackageJson.version = newVersion;
writeFileSync(
  rootPackageJsonPath,
  JSON.stringify(rootPackageJson, null, 2) + "\n"
);

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
    packageJson.version = newVersion;

    // 依存関係も更新
    if (packageJson.dependencies) {
      Object.keys(packageJson.dependencies).forEach((dep) => {
        if (dep.startsWith("@sqldef/")) {
          packageJson.dependencies[dep] = newVersion;
        }
      });
    }

    // オプション依存関係も更新
    if (packageJson.optionalDependencies) {
      Object.keys(packageJson.optionalDependencies).forEach((dep) => {
        if (dep.startsWith("@sqldef/")) {
          packageJson.optionalDependencies[dep] = newVersion;
        }
      });
    }

    writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
    console.log(`${pkg} のバージョンを ${newVersion} に更新しました`);
  } catch (error) {
    console.error(`${pkg} の更新中にエラーが発生しました:`, error.message);
  }
}

console.log(`すべてのパッケージのバージョンを ${newVersion} に更新しました`);
