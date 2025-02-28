import { ApplyOptions, ExportOptions, executeSqldef } from "@sqldef/core";

/**
 * PostgreSQL schema management functions
 */
export const psqldef = {
  /**
   * Apply schema to database
   * @param options Options for apply command
   * @returns Promise that resolves with stdout
   */
  async apply(options: ApplyOptions): Promise<string> {
    const args = buildApplyArgs(options);
    return executeSqldef("psqldef", args, options.desiredSql);
  },

  /**
   * Export schema from database
   * @param options Options for export command
   * @returns Promise that resolves with stdout
   */
  async export(options: ExportOptions): Promise<string> {
    const args = buildExportArgs(options);
    return executeSqldef("psqldef", args);
  },
};

/**
 * Build arguments for apply command
 * @param options Options for apply command
 * @returns Array of arguments
 */
function buildApplyArgs(options: ApplyOptions): string[] {
  const args: string[] = [];

  if (options.user) {
    args.push("--user", options.user);
  }

  if (options.password) {
    args.push("--password", options.password);
  }

  if (options.host) {
    args.push("--host", options.host);
  }

  if (options.port) {
    args.push("--port", options.port.toString());
  }

  if (options.dryRun) {
    args.push("--dry-run");
  }

  if (options.enableDropTable) {
    args.push("--enable-drop-table");
  }

  if (options.skipView) {
    args.push("--skip-view");
  }

  if (options.skipExtension) {
    args.push("--skip-extension");
  }

  if (options.beforeApply) {
    args.push("--before-apply", options.beforeApply);
  }

  if (options.config) {
    args.push("--config", options.config);
  }

  args.push(options.database);

  return args;
}

/**
 * Build arguments for export command
 * @param options Options for export command
 * @returns Array of arguments
 */
function buildExportArgs(options: ExportOptions): string[] {
  const args: string[] = [];

  if (options.user) {
    args.push("--user", options.user);
  }

  if (options.password) {
    args.push("--password", options.password);
  }

  if (options.host) {
    args.push("--host", options.host);
  }

  if (options.port) {
    args.push("--port", options.port.toString());
  }

  args.push("--export");
  args.push(options.database);

  return args;
}
