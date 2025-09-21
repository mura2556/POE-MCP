import Fastify, { FastifyInstance } from "fastify";

import type { AppConfig } from "../config/index.js";
import type { DataContext } from "../data/index.js";
import type { Logger } from "../logging/index.js";

export interface HttpServerHandle {
  app: FastifyInstance;
  close: () => Promise<void>;
}

export const startHttpServer = async (
  config: AppConfig,
  dataContext: DataContext,
  logger: Logger
): Promise<HttpServerHandle> => {
  const app = Fastify({ logger: false });

  app.get("/health", async () => {
    const priceIndex = await dataContext.getPriceIndex();
    return {
      status: "ok",
      snapshot: {
        createdAt: priceIndex.createdAt,
        version: priceIndex.version
      }
    };
  });

  app.get<{
    Params: { name: string };
  }>("/prices/:name", async (request, reply) => {
    const priceIndex = await dataContext.getPriceIndex();
    const item = priceIndex.getByName(request.params.name);
    if (!item) {
      reply.status(404);
      return { error: `Item ${request.params.name} not found` };
    }

    return priceIndex.toStructuredResult(item);
  });

  app.get<{
    Querystring: { q?: string; limit?: string };
  }>("/prices", async (request) => {
    const query = request.query.q ?? "";
    const limit = request.query.limit
      ? Number.parseInt(request.query.limit, 10)
      : 10;

    const priceIndex = await dataContext.getPriceIndex();
    const results = query
      ? priceIndex
          .search(query, Number.isNaN(limit) ? 10 : limit)
          .map((item) => priceIndex.toStructuredResult(item))
      : priceIndex.list().map((item) => priceIndex.toStructuredResult(item));

    return { results };
  });

  app.get("/snapshots", async () => {
    const snapshots = await dataContext.listSnapshots();
    return { snapshots };
  });

  await app.listen({
    host: config.server.host,
    port: config.server.port
  });

  logger.info(
    {
      host: config.server.host,
      port: config.server.port
    },
    "HTTP server listening"
  );

  return {
    app,
    close: () => app.close()
  };
};
