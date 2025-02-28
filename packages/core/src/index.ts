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
 * @returns Promise that resolves with stdout
 */
export async function executeSqldef(
  command: string,
  args: string[]
): Promise<string> {
  const { spawn } = await import("child_process");
  const { platform, arch } = process;

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
  const { fileURLToPath } = await import("url");
  const { dirname, join, resolve } = await import("path");

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const packageDir = resolve(__dirname, "../../..");
  const binPath = join(
    packageDir,
    "packages",
    `${command}-${os}-${sqldefArch}`,
    "bin",
    command
  );

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
    const desiredSqlIndex = args.indexOf("--desiredSql");
    if (desiredSqlIndex !== -1 && desiredSqlIndex < args.length - 1) {
      const desiredSql = args[desiredSqlIndex + 1];
      // Remove the --desiredSql and its value from args
      args.splice(desiredSqlIndex, 2);
      child.stdin.write(desiredSql);
      child.stdin.end();
    }
  });
}
