// https://github.com/privatenumber/tsx/tree/28a3e7d2b8fd72b683aab8a98dd1fcee4624e4cb
import net from "node:net";
import fs from "node:fs";
import { tmpdir } from "./utils/temporary-directory.mjs";
import { getPipePath } from "./utils/get-pipe-path.mjs";

type OnMessage = (message: Buffer) => void;

const bufferData = (onMessage: OnMessage) => {
  let buffer = Buffer.alloc(0);
  return (data: Buffer) => {
    buffer = Buffer.concat([buffer, data]);

    while (buffer.length > 4) {
      const messageLength = buffer.readInt32BE(0);
      if (buffer.length >= 4 + messageLength) {
        const message = buffer.slice(4, 4 + messageLength);
        onMessage(message);
        buffer = buffer.slice(4 + messageLength);
      } else {
        break;
      }
    }
  };
};

export const createIpcServer = async () => {
  const server = net.createServer((socket) => {
    socket.on(
      "data",
      bufferData((message: Buffer) => {
        const data = JSON.parse(message.toString());
        server.emit("data", data);
      })
    );
  });

  const pipePath = getPipePath(process.pid);
  await fs.promises.mkdir(tmpdir, { recursive: true });

  /**
   * Fix #457 (https://github.com/privatenumber/tsx/issues/457)
   *
   * Avoid the error "EADDRINUSE: address already in use"
   *
   * If the pipe file already exists, it means that the previous process has been closed abnormally.
   *
   * We can safely delete the pipe file, the previous process must has been closed,
   * as pid is unique at the same.
   */
  await fs.promises.rm(pipePath, { force: true });

  await new Promise<void>((resolve, reject) => {
    server.listen(pipePath, resolve);
    server.on("error", reject);
  });

  // Prevent Node from waiting for this socket to close before exiting
  server.unref();

  process.on("exit", () => {
    server.close();

    /**
     * Only clean on Unix
     *
     * https://nodejs.org/api/net.html#ipc-support:
     * On Windows, the local domain is implemented using a named pipe.
     * The path must refer to an entry in \\?\pipe\ or \\.\pipe\.
     * Any characters are permitted, but the latter may do some processing
     * of pipe names, such as resolving .. sequences. Despite how it might
     * look, the pipe namespace is flat. Pipes will not persist. They are
     * removed when the last reference to them is closed. Unlike Unix domain
     * sockets, Windows will close and remove the pipe when the owning process exits.
     */
    if (process.platform !== "win32") {
      try {
        fs.rmSync(pipePath);
      } catch {}
    }
  });

  return [process.pid, server] as [number, net.Server];
};
