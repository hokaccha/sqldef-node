#!/usr/bin/env tsx

import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import os from "os";
import fetch from "node-fetch";
import extract from "extract-zip";
import * as tar from "tar";

// Define the targets
const TARGETS = ["psqldef", "mysqldef", "sqlite3def", "mssqldef"];

// Define all supported platforms
const ALL_PLATFORMS = [
  { os: "darwin", arch: "amd64", ext: "zip" },
  { os: "darwin", arch: "arm64", ext: "zip" },
  { os: "linux", arch: "386", ext: "tar.gz" },
  { os: "linux", arch: "amd64", ext: "tar.gz" },
  { os: "linux", arch: "arm", ext: "tar.gz" },
  { os: "linux", arch: "arm64", ext: "tar.gz" },
  { os: "windows", arch: "amd64", ext: "zip" },
];

type DownloadOptions = {
  version: string;
  platform?: string;
  target?: string[];
};

type PlatformInfo = {
  os: string;
  arch: string;
  ext: string;
};

/**
 * Get platform information based on the current system or provided platform string
 */
function getPlatformInfo(platformStr?: string): PlatformInfo {
  if (platformStr) {
    const [osName, arch] = platformStr.split("/");
    const ext =
      osName === "windows" ? "zip" : osName === "darwin" ? "zip" : "tar.gz";
    return { os: osName, arch, ext };
  }

  // Auto-detect platform
  const currentOs = os.platform();
  const currentArch = os.arch();

  let osName: string;
  let arch: string;

  // Map Node.js os.platform() to sqldef platform names
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
      throw new Error(`Unsupported OS: ${currentOs}`);
  }

  // Map Node.js os.arch() to sqldef architecture names
  switch (currentArch) {
    case "x64":
      arch = "amd64";
      break;
    case "arm64":
      arch = "arm64";
      break;
    case "arm":
      arch = "arm";
      break;
    case "ia32":
      arch = "386";
      break;
    default:
      throw new Error(`Unsupported architecture: ${currentArch}`);
  }

  const ext =
    osName === "windows" ? "zip" : osName === "darwin" ? "zip" : "tar.gz";
  return { os: osName, arch, ext };
}

/**
 * Get the download URL for a specific target and platform
 */
function getDownloadUrl(
  target: string,
  version: string,
  platform: PlatformInfo
): string {
  const { os, arch, ext } = platform;
  return `https://github.com/sqldef/sqldef/releases/download/v${version}/${target}_${os}_${arch}.${ext}`;
}

/**
 * Download a file from a URL to a local path
 */
async function downloadFile(url: string, destPath: string): Promise<void> {
  console.log(`Downloading from ${url} to ${destPath}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  if (!response.body) {
    throw new Error(`No response body from ${url}`);
  }

  // Ensure the directory exists
  await fs.mkdir(path.dirname(destPath), { recursive: true });

  // Download the file
  const fileStream = createWriteStream(destPath);
  await pipeline(response.body, fileStream);
}

/**
 * Extract a downloaded archive
 */
async function extractArchive(
  archivePath: string,
  destDir: string,
  ext: string
): Promise<void> {
  console.log(`Extracting ${archivePath} to ${destDir}`);

  // Ensure the destination directory exists
  await fs.mkdir(destDir, { recursive: true });

  if (ext === "zip") {
    await extract(archivePath, { dir: destDir });
  } else if (ext === "tar.gz") {
    await tar.extract({
      file: archivePath,
      cwd: destDir,
    });
  } else {
    throw new Error(`Unsupported archive format: ${ext}`);
  }
}

/**
 * Make a file executable
 */
async function makeExecutable(filePath: string): Promise<void> {
  console.log(`Making ${filePath} executable`);
  await fs.chmod(filePath, 0o755);
}

/**
 * Verify the downloaded binary works correctly
 */
async function verifyBinary(binPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const process = spawn(binPath, ["--version"]);

    let stdout = "";
    let stderr = "";

    process.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    process.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    process.on("close", (code) => {
      if (code === 0) {
        console.log(`Verified ${binPath}: ${stdout.trim()}`);
        resolve();
      } else {
        reject(new Error(`Verification failed for ${binPath}: ${stderr}`));
      }
    });
  });
}

/**
 * Check if the platform is the current platform
 */
function isCurrentPlatform(platform: PlatformInfo): boolean {
  const currentOs = os.platform();
  const currentArch = os.arch();

  let osMatches = false;
  let archMatches = false;

  // Check if OS matches
  if (
    (currentOs === "darwin" && platform.os === "darwin") ||
    (currentOs === "win32" && platform.os === "windows") ||
    (currentOs === "linux" && platform.os === "linux")
  ) {
    osMatches = true;
  }

  // Check if architecture matches
  if (
    (currentArch === "x64" && platform.arch === "amd64") ||
    (currentArch === "arm64" && platform.arch === "arm64") ||
    (currentArch === "arm" && platform.arch === "arm") ||
    (currentArch === "ia32" && platform.arch === "386")
  ) {
    archMatches = true;
  }

  return osMatches && archMatches;
}

/**
 * Download and install a specific sqldef binary
 */
async function downloadTarget(
  target: string,
  version: string,
  platform: PlatformInfo
): Promise<void> {
  const url = getDownloadUrl(target, version, platform);
  const tempDir = path.join(
    os.tmpdir(),
    `sqldef-${target}-${version}-${Date.now()}`
  );
  const archivePath = path.join(tempDir, `${target}.${platform.ext}`);

  try {
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // Download the archive
    await downloadFile(url, archivePath);

    // Extract the archive
    await extractArchive(archivePath, tempDir, platform.ext);

    // Get the directory where this script is located
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    // Determine the path to the package directory
    const packageDir = path.resolve(
      __dirname,
      "../../packages",
      `${target}-${platform.os}-${platform.arch}`
    );
    const binDir = path.join(packageDir, "bin");

    // Ensure the bin directory exists
    await fs.mkdir(binDir, { recursive: true });

    // Determine source and destination file names
    // Windows binaries have .exe extension
    const sourceFileName = platform.os === "windows" ? `${target}.exe` : target;
    const destFileName = platform.os === "windows" ? `${target}.exe` : target;

    // Check if the source file exists
    try {
      await fs.access(path.join(tempDir, sourceFileName));
    } catch (error) {
      console.error(
        `Source file ${path.join(tempDir, sourceFileName)} does not exist`
      );
      // List directory contents for debugging
      const files = await fs.readdir(tempDir);
      console.error(`Files in temp directory: ${files.join(", ")}`);
      throw error;
    }

    // Move the binary to the bin directory
    const binPath = path.join(binDir, destFileName);
    await fs.copyFile(path.join(tempDir, sourceFileName), binPath);

    // Make the binary executable (not needed for Windows)
    if (platform.os !== "windows") {
      await makeExecutable(binPath);
    }

    // Only verify the binary if it's for the current platform
    const isCurrent = isCurrentPlatform(platform);
    if (isCurrent) {
      // Verify the binary works
      await verifyBinary(binPath);
    } else {
      console.log(
        `Skipping verification for ${target} on ${platform.os}/${platform.arch} (not current platform)`
      );
    }

    console.log(
      `Successfully installed ${target} v${version} for ${platform.os}/${platform.arch}`
    );
  } catch (error) {
    console.error(`Failed to download ${target}: ${error}`);
    throw error;
  } finally {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to clean up temp directory ${tempDir}: ${error}`);
    }
  }
}

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option("version", {
      type: "string",
      description: "Version of sqldef to download",
      demandOption: true,
    })
    .option("platform", {
      type: "string",
      description: "Platform to download for (e.g. darwin/amd64, linux/arm64)",
    })
    .option("target", {
      type: "array",
      description: "Target sqldef to download (e.g. psqldef, mysqldef)",
    })
    .version(false) // Disable the default --version option
    .help()
    .parse();

  const options: DownloadOptions = {
    version: argv.version as string,
    platform: argv.platform as string | undefined,
    target: argv.target as string[] | undefined,
  };

  console.log("Downloading sqldef binaries...");
  console.log(`Version: ${options.version}`);
  console.log(`Platform: ${options.platform || "all platforms"}`);
  console.log(`Targets: ${options.target?.join(", ") || "all"}`);

  const targets = options.target || TARGETS;

  // If platform is specified, download for that platform only
  if (options.platform) {
    const platform = getPlatformInfo(options.platform);
    console.log(
      `Detected platform: ${platform.os}/${platform.arch} (${platform.ext})`
    );

    for (const target of targets) {
      if (!TARGETS.includes(target)) {
        console.warn(`Unknown target: ${target}, skipping`);
        continue;
      }

      try {
        await downloadTarget(target, options.version, platform);
      } catch (error) {
        console.error(`Failed to download ${target}: ${error}`);
        process.exit(1);
      }
    }
  } else {
    // If no platform is specified, download for all platforms
    console.log("Downloading for all supported platforms");

    for (const target of targets) {
      if (!TARGETS.includes(target)) {
        console.warn(`Unknown target: ${target}, skipping`);
        continue;
      }

      for (const platform of ALL_PLATFORMS) {
        try {
          console.log(
            `Processing ${target} for ${platform.os}/${platform.arch}`
          );
          await downloadTarget(target, options.version, platform);
        } catch (error) {
          console.error(
            `Failed to download ${target} for ${platform.os}/${platform.arch}: ${error}`
          );
          process.exit(1);
        }
      }
    }
  }

  console.log("All downloads completed successfully!");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
