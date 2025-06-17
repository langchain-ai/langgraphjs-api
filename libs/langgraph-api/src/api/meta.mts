import { Hono } from "hono";
import { createRequire } from "module";

const api = new Hono();

// Get the version from package.json using require.resolve
const require = createRequire(import.meta.url);
let version: string;
try {
  // Try to resolve the package.json from the installed package
  const packageJson = require("@langchain/langgraph-api/package.json");
  version = packageJson.version;
} catch {
  // Fallback for development environment
  try {
    const packageJson = require("../../../package.json");
    version = packageJson.version;
  } catch {
    console.warn("Could not determine version of langgraph-api");
  }
}

// read env variable
const env = process.env;

api.get("/info", (c) => {
  const langsmithApiKey = env["LANGSMITH_API_KEY"] || env["LANGCHAIN_API_KEY"];

  const langsmithTracing = (() => {
    if (langsmithApiKey) {
      // Check if any tracing variable is explicitly set to "false"
      const tracingVars = [
        env["LANGCHAIN_TRACING_V2"],
        env["LANGCHAIN_TRACING"],
        env["LANGSMITH_TRACING_V2"],
        env["LANGSMITH_TRACING"],
      ];

      // Return true unless explicitly disabled
      return !tracingVars.some((val) => val === "false" || val === "False");
    }
    return undefined;
  })();
  return c.json({
    version,
    context: "js",
    flags: {
      assistants: true,
      crons: false,
      langsmith: !!langsmithTracing,
      langsmith_tracing_replicas: true,
    },
  });
});

api.get("/ok", (c) => c.json({ ok: true }));

export default api;
