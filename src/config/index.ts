import { config as loadEnv } from "dotenv";
import path from "node:path";
import { z } from "zod";

loadEnv();

const booleanFromEnv = (value: string | undefined, defaultValue: boolean) => {
  if (value === undefined) {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

const rawConfigSchema = z.object({
  server: z.object({
    host: z.string().min(1),
    port: z.number().int().positive(),
    httpEnabled: z.boolean()
  }),
  ingest: z.object({
    snapshotDir: z.string().min(1)
  }),
  ingestion: z.object({
    forceRefresh: z.boolean()
  })
});

export type AppConfig = z.infer<typeof rawConfigSchema>;

let cachedConfig: AppConfig | null = null;

export const loadConfig = (): AppConfig => {
  if (cachedConfig) {
    return cachedConfig;
  }

  const snapshotDir = path.resolve(
    process.cwd(),
    process.env.SNAPSHOT_DIR ?? "src/ingest/out"
  );

  const parsed = rawConfigSchema.parse({
    server: {
      host: process.env.HOST ?? "127.0.0.1",
      port: Number.parseInt(process.env.PORT ?? "3333", 10),
      httpEnabled: booleanFromEnv(process.env.HTTP_ENABLED, true)
    },
    ingest: {
      snapshotDir
    },
    ingestion: {
      forceRefresh: booleanFromEnv(process.env.INGEST_FORCE_REFRESH, false)
    }
  });

  cachedConfig = parsed;
  return parsed;
};

export const resetConfigCache = () => {
  cachedConfig = null;
};
