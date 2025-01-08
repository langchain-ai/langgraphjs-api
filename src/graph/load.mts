import { z } from "zod";
import * as uuid from "uuid";
import { Assistants } from "../storage/ops.mjs";
import type {
  BaseCheckpointSaver,
  BaseStore,
  CompiledGraph,
} from "@langchain/langgraph";
import { HTTPException } from "hono/http-exception";
import {
  GraphSchema,
  GraphSpec,
  resolveGraph,
  runGraphSchemaWorker,
} from "./load.utils.mjs";
import { checkpointer } from "../storage/checkpoint.mjs";
import { store } from "../storage/store.mjs";
import { logger } from "../logging.mjs";

export const GRAPHS: Record<string, CompiledGraph<string>> = {};
export const GRAPH_SPEC: Record<string, GraphSpec> = {};
export const GRAPH_SCHEMA: Record<string, Record<string, GraphSchema>> = {};

export const NAMESPACE_GRAPH = uuid.parse(
  "6ba7b821-9dad-11d1-80b4-00c04fd430c8"
);

const SpecSchema = z.record(z.string());
const ConfigSchema = z.record(z.unknown());

export const getAssistantId = (graphId: string) => {
  if (graphId in GRAPHS) return uuid.v5(graphId, NAMESPACE_GRAPH);
  return graphId;
};

export async function registerFromEnv() {
  const specs = SpecSchema.parse(JSON.parse(process.env.LANGSERVE_GRAPHS));
  const envConfig = process.env.LANGGRAPH_CONFIG
    ? ConfigSchema.parse(JSON.parse(process.env.LANGGRAPH_CONFIG))
    : undefined;

  await Promise.all(
    Object.entries(specs).map(async ([graphId, rawSpec]) => {
      logger.info(`Registering graph with id '${graphId}'`, {
        graph_id: graphId,
      });

      const config = envConfig?.[graphId];
      const { resolved, ...spec } = await resolveGraph(rawSpec);

      // registering the graph runtime
      GRAPHS[graphId] = resolved;
      GRAPH_SPEC[graphId] = spec;

      await Assistants.put(uuid.v5(graphId, NAMESPACE_GRAPH), {
        graph_id: graphId,
        metadata: { created_by: "system" },
        config: config ?? {},
        if_exists: "do_nothing",
      });
    })
  );
}

export function getGraph(
  graphId: string,
  options?: {
    checkpointer?: BaseCheckpointSaver | null;
    store?: BaseStore;
  }
) {
  if (!GRAPHS[graphId])
    throw new HTTPException(404, { message: `Graph "${graphId}" not found` });

  // TODO: have a check for the type of graph

  const compiled = GRAPHS[graphId];
  if (typeof options?.checkpointer !== "undefined") {
    compiled.checkpointer = options?.checkpointer ?? undefined;
  } else {
    compiled.checkpointer = checkpointer;
  }

  compiled.store = options?.store ?? store;

  return compiled;
}

export async function getGraphSchema(graphId: string) {
  if (!GRAPH_SPEC[graphId])
    throw new HTTPException(404, {
      message: `Spec for "${graphId}" not found`,
    });

  if (!GRAPH_SCHEMA[graphId] || true) {
    try {
      GRAPH_SCHEMA[graphId] = await runGraphSchemaWorker(GRAPH_SPEC[graphId]);
    } catch (error) {
      throw new Error(`Failed to extract schema for "${graphId}": ${error}`);
    }
  }

  return GRAPH_SCHEMA[graphId];
}
