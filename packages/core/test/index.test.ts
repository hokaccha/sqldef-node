import { describe, it, expect } from "vitest";
import { executeSqldef } from "../src/index";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { platform, arch } from "os";

// テスト用のディレクトリパスを取得
const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("executeSqldef", () => {
  it("should find and execute the binary", async () => {
    // 実際のバイナリが存在するか確認
    const binaryName = "psqldef";

    // 実行
    const result = await executeSqldef(binaryName, ["--version"]);

    // バージョン情報が含まれていることを確認
    expect(result).toMatch(/v\d+\.\d+\.\d+/);
    console.log(`Successfully executed ${binaryName}: ${result}`);
  });

  it("should throw an error for non-existent binary", async () => {
    const nonExistentBinary = "non_existent_binary_" + Date.now();

    // 存在しないバイナリを実行しようとするとエラーになるはず
    await expect(
      executeSqldef(nonExistentBinary, ["--version"])
    ).rejects.toThrow();
  });

  it("should resolve binary path correctly for current platform", async () => {
    // 現在のプラットフォーム情報を取得
    const currentOs = platform();
    const currentArch = arch();

    // プラットフォーム名のマッピング
    let osName: string;
    switch (currentOs) {
      case "darwin":
        osName = "darwin";
        break;
      case "win32":
        osName = "windows";
        break;
      case "linux":
        osName = "linux";
        break;
      default:
        osName = currentOs;
    }

    // アーキテクチャ名のマッピング
    let archName: string;
    switch (currentArch) {
      case "x64":
        archName = "amd64";
        break;
      case "arm64":
        archName = "arm64";
        break;
      case "arm":
        archName = "arm";
        break;
      case "ia32":
        archName = "386";
        break;
      default:
        archName = currentArch;
    }

    console.log(`Current platform: ${osName}/${archName}`);

    // psqldef-darwin-amd64 のようなパッケージが存在するか確認
    const packagePath = path.resolve(
      __dirname,
      "../../../node_modules/@sqldef/psqldef-" + osName + "-" + archName
    );
    const exists = fs.existsSync(packagePath);

    console.log(`Checking package path: ${packagePath}, exists: ${exists}`);

    // テスト実行
    const result = await executeSqldef("psqldef", ["--version"]);
    expect(result).toBeTruthy();
    console.log(`Successfully executed psqldef: ${result}`);
  });
});
