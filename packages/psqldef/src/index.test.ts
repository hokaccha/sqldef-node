import { describe, it, expect, vi } from "vitest";
import { psqldef } from "./index.js";
import * as core from "@sqldef/core";

// Mock the executeSqldef function
vi.mock("@sqldef/core", () => {
  return {
    executeSqldef: vi.fn().mockResolvedValue("mocked result"),
  };
});

describe("psqldef", () => {
  describe("apply", () => {
    it("should call executeSqldef with correct arguments", async () => {
      const options = {
        database: "testdb",
        desiredSql: "CREATE TABLE test (id INT);",
        user: "postgres",
        password: "password",
        host: "localhost",
        port: 5432,
        dryRun: true,
      };

      const result = await psqldef.apply(options);

      expect(core.executeSqldef).toHaveBeenCalledWith("psqldef", [
        "--user",
        "postgres",
        "--password",
        "password",
        "--host",
        "localhost",
        "--port",
        "5432",
        "--dry-run",
        "testdb",
      ]);
      expect(result).toBe("mocked result");
    });
  });

  describe("export", () => {
    it("should call executeSqldef with correct arguments", async () => {
      const options = {
        database: "testdb",
        user: "postgres",
        password: "password",
        host: "localhost",
        port: 5432,
      };

      const result = await psqldef.export(options);

      expect(core.executeSqldef).toHaveBeenCalledWith("psqldef", [
        "--user",
        "postgres",
        "--password",
        "password",
        "--host",
        "localhost",
        "--port",
        "5432",
        "--export",
        "testdb",
      ]);
      expect(result).toBe("mocked result");
    });
  });
});
