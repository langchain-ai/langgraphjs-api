# LangGraph.js CLI

The official command-line interface for LangGraph.js, providing tools to create, develop, and deploy LangGraph.js applications.

## Installation

The `@langchain/langgraph-cli` is a CLI binary that can be run via `npx` or installed via your package manager of choice:

```bash
npx @langchain/langgraph-cli
```

## Commands

### `langgraph dev`

Run LangGraph.js API server in development mode with hot reloading.

```bash
langgraph dev
```

### `langgraph build`

Build a Docker image for your LangGraph.js application.

```bash
langgraph build
```

### `langgraph up`

Run LangGraph.js API server in Docker.

```bash
langgraph up
```

### `langgraph dockerfile`

Generate a Dockerfile for custom deployments

```bash
langgraph dockerfile <save path>
```

## Configuration

The CLI uses a `langgraph.json` configuration file with these key settings:

```json5
{
  // Required: Graph definitions
  "graphs": {
    "graph": "./src/graph.ts:graph" 
  },

  // Optional: Node version (20 only at the moment)
  "node_version": "20",

  // Optional: Environment variables
  "env": ".env",
  
  // Optional: Additional Dockerfile commands
  "dockerfile_lines": []
}
```

See the [full documentation](https://langchain-ai.github.io/langgraph/cloud/reference/cli) for detailed configuration options.
