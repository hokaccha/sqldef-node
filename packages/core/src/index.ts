/**
 * Core functionality for sqldef Node.js wrappers
 */

/**
 * Base options for sqldef commands
 */
export type BaseOptions = {
  /**
   * Database name
   */
  database: string;
  /**
   * Database user
   */
  user?: string;
  /**
   * Database password
   */
  password?: string;
  /**
   * Database host
   */
  host?: string;
  /**
   * Database port
   */
  port?: number;
};

/**
 * Options for apply command
 */
export type ApplyOptions = BaseOptions & {
  /**
   * Desired SQL schema
   */
  desiredSql: string;
  /**
   * Don't run DDLs but just show them
   */
  dryRun?: boolean;
  /**
   * Enable destructive changes such as DROP (enable only table drops)
   */
  enableDropTable?: boolean;
  /**
   * Skip managing views/materialized views
   */
  skipView?: boolean;
  /**
   * Skip managing extensions
   */
  skipExtension?: boolean;
  /**
   * Execute the given string before applying the regular DDLs
   */
  beforeApply?: string;
  /**
   * YAML file to specify: target_tables, skip_tables, target_schema
   */
  config?: string;
};

/**
 * Options for export command
 */
export type ExportOptions = BaseOptions;

/**
 * Execute sqldef command
 * @param command Command to execute
 * @param args Command arguments
 * @param desiredSql SQL schema to apply (optional)
 * @returns Promise that resolves with stdout
 */
export async function executeSqldef(
  command: string,
  args: string[],
  desiredSql?: string
): Promise<string> {
  const { spawn } = await import("child_process");
  const { platform, arch } = process;
  const { existsSync } = await import("fs");
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");

  // Map Node.js platform to sqldef platform names
  let os: string;
  switch (platform) {
    case "darwin":
      os = "darwin";
      break;
    case "win32":
      os = "windows";
      break;
    case "linux":
      os = "linux";
      break;
    default:
      throw new Error(`Unsupported OS: ${platform}`);
  }

  // Map Node.js arch to sqldef architecture names
  let sqldefArch: string;
  switch (arch) {
    case "x64":
      sqldefArch = "amd64";
      break;
    case "arm64":
      sqldefArch = "arm64";
      break;
    case "arm":
      sqldefArch = "arm";
      break;
    case "ia32":
      sqldefArch = "386";
      break;
    default:
      throw new Error(`Unsupported architecture: ${arch}`);
  }

  // Get path to the binary
  const __dirname = dirname(fileURLToPath(import.meta.url));

  // Try to find the binary in the following locations:
  // 1. First, check in the platform-specific package
  // 2. Then, check in the main package's bin directory
  // 3. Finally, check in the node_modules/.bin directory

  // Path to platform-specific binary
  const platformBinPath = join(
    __dirname,
    "../../..",
    "node_modules",
    `@sqldef/${command}-${os}-${sqldefArch}`,
    "bin",
    os === "windows" ? `${command}.exe` : command
  );

  // Path to main package binary
  const mainPackageBinPath = join(
    __dirname,
    "../../..",
    "node_modules",
    `@sqldef/${command}`,
    "bin",
    os === "windows" ? `${command}.exe` : command
  );

  // Path to node_modules/.bin binary
  const nodeModulesBinPath = join(
    __dirname,
    "../../..",
    "node_modules",
    ".bin",
    os === "windows" ? `${command}.exe` : command
  );

  // Path for development environment
  const devBinPath = join(
    __dirname,
    "../../..",
    "packages",
    `${command}-${os}-${sqldefArch}`,
    "bin",
    os === "windows" ? `${command}.exe` : command
  );

  // Choose the first path that exists
  let binPath: string;
  if (existsSync(platformBinPath)) {
    binPath = platformBinPath;
  } else if (existsSync(mainPackageBinPath)) {
    binPath = mainPackageBinPath;
  } else if (existsSync(nodeModulesBinPath)) {
    binPath = nodeModulesBinPath;
  } else if (existsSync(devBinPath)) {
    binPath = devBinPath;
  } else {
    throw new Error(
      `Could not find ${command} binary for ${os}-${sqldefArch}. ` +
        `Looked in: ${platformBinPath}, ${mainPackageBinPath}, ${nodeModulesBinPath}, ${devBinPath}`
    );
  }

  return new Promise((resolve, reject) => {
    const child = spawn(binPath, args);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with exit code ${code}: ${stderr}`));
      }
    });

    child.on("error", (error) => {
      reject(error);
    });

    // If desiredSql is provided, write it to stdin
    if (desiredSql) {
      child.stdin.write(desiredSql);
      child.stdin.end();
    }
  });
}
