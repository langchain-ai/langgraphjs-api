import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

export async function spawnServer(
  args: {
    host: string;
    port: string;
    nJobsPerWorker: string;
  },
  context: {
    config: {
      graphs: Record<string, string>;
      ui?: Record<string, string>;
      ui_config?: { shared?: string[] };
    };
    env: NodeJS.ProcessEnv;
    hostUrl: string;
  },
  options: {
    pid: number;
    projectCwd: string;
  },
) {
  const localUrl = `http://${args.host}:${args.port}`;
  const studioUrl = `${context.hostUrl}/studio?baseUrl=${localUrl}`;

  console.log(`
          Welcome to

╦  ┌─┐┌┐┌┌─┐╔═╗┬─┐┌─┐┌─┐┬ ┬
║  ├─┤││││ ┬║ ╦├┬┘├─┤├─┘├─┤
╩═╝┴ ┴┘└┘└─┘╚═╝┴└─┴ ┴┴  ┴ ┴.js

- 🚀 API: \x1b[36m${localUrl}\x1b[0m
- 🎨 Studio UI: \x1b[36m${studioUrl}\x1b[0m

This in-memory server is designed for development and testing.
For production use, please use LangGraph Cloud.

`);

  return spawn(
    process.execPath,
    [
      fileURLToPath(
        new URL("../../cli.mjs", import.meta.resolve("tsx/esm/api")),
      ),
      "watch",
      "--clear-screen=false",
      "--import",
      new URL(import.meta.resolve("../preload.mjs")).toString(),
      fileURLToPath(new URL(import.meta.resolve("./entrypoint.mjs"))),
      options.pid.toString(),
      JSON.stringify({
        port: Number.parseInt(args.port, 10),
        nWorkers: Number.parseInt(args.nJobsPerWorker, 10),
        host: args.host,
        graphs: context.config.graphs,
        ui: context.config.ui,
        ui_config: context.config.ui_config,
        cwd: options.projectCwd,
      }),
    ],
    {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: {
        ...context.env,
        NODE_ENV: "development",
        LANGGRAPH_API_URL: localUrl,
      },
    },
  );
}
