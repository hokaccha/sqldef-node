import { describe, it, expect, beforeAll } from "vitest";
import { executeSqldef } from "@sqldef/core";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { psqldef } from "../src/index";
import { vi } from "vitest";

// Get directory path for tests
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const binPath = path.join(__dirname, "../bin/psqldef");

describe("psqldef", () => {
  // Check if binary exists before running tests
  beforeAll(() => {
    // Skip tests if binary doesn't exist
    if (!fs.existsSync(binPath)) {
      console.warn(
        `psqldef binary not found at ${binPath}. Some tests may be skipped.`
      );
    }
  });

  describe("version check", () => {
    it("should return version information", async () => {
      // Skip test if binary doesn't exist
      if (!fs.existsSync(binPath)) {
        console.warn("Skipping test: psqldef binary not found");
        return;
      }

      // Get version information using --version option
      const result = await executeSqldef("psqldef", ["--version"]);

      // Verify result is a string
      expect(typeof result).toBe("string");
      // Verify result contains version information
      expect(result).toMatch(/v\d+\.\d+\.\d+/);
      console.log("Version info:", result);
    });
  });

  describe("apply", () => {
    it("should execute psqldef apply command with dry-run", async () => {
      // Extend timeout (30 seconds)
      vi.setConfig({ testTimeout: 30000 });

      // Skip test if binary doesn't exist
      if (!fs.existsSync(binPath)) {
        console.warn("Skipping test: psqldef binary not found");
        return;
      }

      const options = {
        database: "sandbox",
        desiredSql: "CREATE TABLE users (id INT);",
        dryRun: true,
      };

      // Output debug information
      console.log("Test options:", options);
      console.log("Binary path:", binPath);

      // Execute command
      console.log("Executing psqldef.apply...");
      const result = await psqldef.apply(options);

      // Verify result is a string
      expect(typeof result).toBe("string");
      console.log("Apply result:", result);
    });
  });

  describe("export", () => {
    it("should execute psqldef export command", async () => {
      // Extend timeout (30 seconds)
      vi.setConfig({ testTimeout: 30000 });

      // Skip test if binary doesn't exist
      if (!fs.existsSync(binPath)) {
        console.warn("Skipping test: psqldef binary not found");
        return;
      }

      // Use the same database as in apply test
      const result = await psqldef.export({ database: "sandbox" });

      // Verify result is a string
      expect(typeof result).toBe("string");
      console.log("Export result:", result);
    });
  });
});
