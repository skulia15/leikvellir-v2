// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  buildPostgresOptions,
  isPooledDatabaseUrl,
  resolveSslOption,
} from "~/server/db/pool-config";

describe("postgres.js serverless pool config", () => {
  describe("isPooledDatabaseUrl", () => {
    it("detects pgbouncer query parameter", () => {
      expect(
        isPooledDatabaseUrl("postgresql://user:pass@db.example.com:5432/app?pgbouncer=true"),
      ).toBe(true);
    });

    it("detects Supabase/PgBouncer transaction pooler port 6543", () => {
      expect(
        isPooledDatabaseUrl("postgresql://user:pass@db.example.com:6543/app"),
      ).toBe(true);
    });

    it("detects pooler hostnames (e.g. Neon/Supabase)", () => {
      expect(
        isPooledDatabaseUrl("postgresql://user:pass@ep-cool-123-pooler.eu-central-1.aws.neon.tech/neondb"),
      ).toBe(true);
    });

    it("returns false for direct local Postgres URL", () => {
      expect(
        isPooledDatabaseUrl("postgresql://postgres:postgres@localhost:5432/leikvellir"),
      ).toBe(false);
    });
  });

  describe("buildPostgresOptions", () => {
    it("uses conservative serverless defaults in production", () => {
      const opts = buildPostgresOptions({
        databaseUrl: "postgresql://user:pass@db.example.com:5432/app",
        nodeEnv: "production",
      });

      expect(opts.max).toBe(3);
      expect(opts.idle_timeout).toBe(20);
      expect(opts.connect_timeout).toBe(10);
      expect(opts.max_lifetime).toBe(1800);
      expect(opts.prepare).toBe(false);
    });

    it("disables prepared statements in development when connected to a pooler", () => {
      const opts = buildPostgresOptions({
        databaseUrl: "postgresql://user:pass@ep-foo-pooler.neon.tech/db",
        nodeEnv: "development",
      });

      expect(opts.max).toBe(5);
      expect(opts.prepare).toBe(false);
    });

    it("keeps prepared statements enabled for direct local development DB", () => {
      const opts = buildPostgresOptions({
        databaseUrl: "postgresql://postgres:postgres@localhost:5432/leikvellir",
        nodeEnv: "development",
      });

      expect(opts.max).toBe(5);
      expect(opts.prepare).toBe(true);
    });

    it("respects explicit poolMax and prepare overrides", () => {
      const opts = buildPostgresOptions({
        databaseUrl: "postgresql://user:pass@ep-foo-pooler.neon.tech/db",
        nodeEnv: "production",
        poolMax: 8,
        prepare: true,
      });

      expect(opts.max).toBe(8);
      expect(opts.prepare).toBe(true);
    });
  });

  describe("resolveSslOption", () => {
    it("upgrades sslmode=require to verify-full (workerd has no rejectUnauthorized)", () => {
      expect(
        resolveSslOption("postgres://u:p@ep-x-pooler.neon.tech/db?sslmode=require"),
      ).toBe("verify-full");
      expect(
        buildPostgresOptions({
          databaseUrl: "postgres://u:p@ep-x-pooler.neon.tech/db?sslmode=require",
          nodeEnv: "production",
        }).ssl,
      ).toBe("verify-full");
    });

    it("leaves other modes and plain URLs to postgres.js", () => {
      expect(resolveSslOption("postgres://u:p@localhost:5432/db")).toBeUndefined();
      expect(resolveSslOption("postgres://u:p@h/db?sslmode=disable")).toBeUndefined();
      expect(resolveSslOption("postgres://u:p@h/db?sslmode=verify-full")).toBeUndefined();
      expect(
        buildPostgresOptions({ databaseUrl: "postgres://u:p@localhost/db", nodeEnv: "development" }),
      ).not.toHaveProperty("ssl");
    });
  });
});
