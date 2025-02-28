import { ApplyOptions, ExportOptions, executeSqldef } from "@sqldef/core";

/**
 * SQLite schema management functions
 */
export const sqlite3def = {
  /**
   * Apply schema to database
   * @param options Options for apply command
   * @returns Promise that resolves with stdout
   */
  async apply(options: ApplyOptions): Promise<string> {
    const args = buildApplyArgs(options);
    return executeSqldef("sqlite3def", args);
  },

  /**
   * Export schema from database
   * @param options Options for export command
   * @returns Promise that resolves with stdout
   */
  async export(options: ExportOptions): Promise<string> {
    const args = buildExportArgs(options);
    return executeSqldef("sqlite3def", args);
  },
};

/**
 * Build arguments for apply command
 * @param options Options for apply command
 * @returns Array of arguments
 */
function buildApplyArgs(options: ApplyOptions): string[] {
  const args: string[] = [];

  if (options.dryRun) {
    args.push("--dry-run");
  }

  if (options.enableDropTable) {
    args.push("--enable-drop-table");
  }

  if (options.skipView) {
    args.push("--skip-view");
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

  args.push("--export");
  args.push(options.database);

  return args;
}
