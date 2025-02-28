import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn } from "child_process";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const downloaderPath = path.resolve(__dirname, "index.ts");
const testVersion = "0.17.32"; // Use a known version for testing

describe("sqldef-downloader", () => {
  // Create a temporary directory for testing
  const tempDir = path.join(os.tmpdir(), `sqldef-test-${Date.now()}`);
  const psqldefBinPath = path.resolve(
    __dirname,
    "../../packages/psqldef/bin/psqldef"
  );

  beforeAll(async () => {
    // Create the temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // Ensure the bin directory exists
    const binDir = path.dirname(psqldefBinPath);
    await fs.mkdir(binDir, { recursive: true });
  });

  afterAll(async () => {
    // Clean up the temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("should download psqldef binary", async () => {
    // Skip this test in CI environments or if it would take too long
    if (process.env.CI || process.env.SKIP_DOWNLOAD_TEST) {
      console.log("Skipping download test in CI environment");
      return;
    }

    return new Promise<void>((resolve, reject) => {
      // Run the downloader script with tsx
      const process = spawn("tsx", [
        downloaderPath,
        "--version",
        testVersion,
        "--target",
        "psqldef",
      ]);

      // We need to collect stdout and stderr to prevent the process from hanging
      // and to log the output for debugging
      process.stdout.on("data", (data) => {
        console.log(data.toString());
      });

      process.stderr.on("data", (data) => {
        console.error(data.toString());
      });

      process.on("close", async (code) => {
        try {
          expect(code).toBe(0);

          // Check if the binary exists
          const stats = await fs.stat(psqldefBinPath);
          expect(stats.isFile()).toBe(true);

          // Check if the binary is executable
          const mode = stats.mode & 0o777;
          expect(mode & 0o111).not.toBe(0); // Check if executable bits are set

          // Run the binary to check version
          await new Promise<void>((resolveVersion, rejectVersion) => {
            const versionProcess = spawn(psqldefBinPath, ["--version"]);

            let versionOutput = "";

            versionProcess.stdout.on("data", (data) => {
              versionOutput += data.toString();
            });

            versionProcess.stderr.on("data", (data) => {
              console.error(data.toString());
            });

            versionProcess.on("close", (versionCode) => {
              try {
                expect(versionCode).toBe(0);
                expect(versionOutput).toContain(`v${testVersion}`);
                resolveVersion();
              } catch (error) {
                rejectVersion(error);
              }
            });
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }, 60000); // Increase timeout to 60 seconds for download
});
