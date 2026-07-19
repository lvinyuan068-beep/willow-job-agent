import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { extname, resolve } from "node:path";

import { getRuntimeProvider, runJobAgent } from "./researched-agent.js";
import type {
  JobAnalysisOutput,
  JobInput,
} from "./contracts.js";

import {
  buildApplicationActionPack,
  type ApplicationActionPack,
} from "./action-pack.js";

import {
  createApplicationRecord,
  getApplicationTrackerSnapshot,
  updateApplicationRecord,
  type ApplicationUpdate,
  type CreateApplicationDetails,
} from "./application-tracker.js";

const DEFAULT_PORT = 4310;
const MAX_BODY_BYTES = 1024 * 1024;

const STATIC_FILES: Record<string, string> = {
  "/": "index.html",
  "/index.html": "index.html",
  "/app.js": "app.js",
  "/action-pack.js": "action-pack.js",
  "/application-tracker.js": "application-tracker.js",
  "/styles.css": "styles.css",
};

const CONTENT_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

export interface WillowServerOptions {
  projectRoot?: string;
  outputDirectory?: string;
}

function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });

  response.end(`${JSON.stringify(payload, null, 2)}\n`);
}

function sendText(
  response: ServerResponse,
  statusCode: number,
  contentType: string,
  body: string,
): void {
  response.writeHead(statusCode, {
    "content-type": contentType,
    "cache-control": "no-store",
  });

  response.end(body);
}

async function readJsonBody(
  request: IncomingMessage,
): Promise<unknown> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk)
      ? chunk
      : Buffer.from(chunk);

    totalBytes += buffer.length;

    if (totalBytes > MAX_BODY_BYTES) {
      throw new Error(
        "输入内容超过 1 MB，请缩短 JD 后重试。",
      );
    }

    chunks.push(buffer);
  }

  const rawBody = Buffer.concat(chunks)
    .toString("utf8")
    .trim();

  if (!rawBody) {
    throw new Error(
      "请求内容为空，请先填写岗位信息。",
    );
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw new Error(
      "请求不是有效的 JSON 数据。",
    );
  }
}

function timestampForFile(
  date = new Date(),
): string {
  return date
    .toISOString()
    .replace(/[:.]/g, "-");
}

function saveResult(
  result: JobAnalysisOutput,
  outputDirectory: string,
): {
  latestPath: string;
  historyPath: string;
} {
  const historyDirectory = resolve(
    outputDirectory,
    "history",
  );

  const latestPath = resolve(
    outputDirectory,
    "latest.json",
  );

  const historyPath = resolve(
    historyDirectory,
    `${timestampForFile()}-${result.grade}-${result.decision}.json`,
  );

  const serialized =
    `${JSON.stringify(result, null, 2)}\n`;

  mkdirSync(historyDirectory, {
    recursive: true,
  });

  writeFileSync(
    latestPath,
    serialized,
    "utf8",
  );

  writeFileSync(
    historyPath,
    serialized,
    "utf8",
  );

  return {
    latestPath,
    historyPath,
  };
}

function saveApplicationPack(
  applicationPack: ApplicationActionPack,
  result: JobAnalysisOutput,
  outputDirectory: string,
): {
  latestActionPackPath: string;
  historyActionPackPath: string;
} {
  const historyDirectory = resolve(
    outputDirectory,
    "history",
    "action-packs",
  );

  const latestActionPackPath = resolve(
    outputDirectory,
    "latest-action-pack.json",
  );

  const historyActionPackPath = resolve(
    historyDirectory,
    `${timestampForFile()}-${result.grade}-${result.decision}-action-pack.json`,
  );

  const serialized =
    `${JSON.stringify(applicationPack, null, 2)}\n`;

  mkdirSync(historyDirectory, {
    recursive: true,
  });

  writeFileSync(
    latestActionPackPath,
    serialized,
    "utf8",
  );

  writeFileSync(
    historyActionPackPath,
    serialized,
    "utf8",
  );

  return {
    latestActionPackPath,
    historyActionPackPath,
  };
}
function serveStaticFile(
  response: ServerResponse,
  pathname: string,
  webDirectory: string,
): boolean {
  const relativePath = STATIC_FILES[pathname];

  if (!relativePath) {
    return false;
  }

  const absolutePath = resolve(
    webDirectory,
    relativePath,
  );

  if (!existsSync(absolutePath)) {
    sendText(
      response,
      500,
      "text/plain; charset=utf-8",
      `缺少页面文件：${relativePath}`,
    );

    return true;
  }

  const contentType =
    CONTENT_TYPES[extname(absolutePath)] ??
    "application/octet-stream";

  sendText(
    response,
    200,
    contentType,
    readFileSync(absolutePath, "utf8"),
  );

  return true;
}

function errorMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export function createWillowServer(
  options: WillowServerOptions = {},
) {
  const projectRoot =
    options.projectRoot ?? process.cwd();

  const webDirectory = resolve(
    projectRoot,
    "web",
  );

  const outputDirectory =
    options.outputDirectory ??
    resolve(projectRoot, "outputs");

  return createServer(
    async (request, response) => {
      const method =
        request.method ?? "GET";

      const requestUrl = new URL(
        request.url ?? "/",
        "http://127.0.0.1",
      );

      if (
        method === "GET" &&
        requestUrl.pathname === "/health"
      ) {
        sendJson(response, 200, {
          status: "ok",
          service: "willow-job-agent",
          version: "2.0",
          provider: getRuntimeProvider(),
        });

        return;
      }

      if (
        method === "GET" &&
        requestUrl.pathname === "/api/latest"
      ) {
        const latestPath = resolve(
          outputDirectory,
          "latest.json",
        );

        if (!existsSync(latestPath)) {
          sendJson(response, 404, {
            error: "还没有分析结果。",
          });

          return;
        }

        sendText(
          response,
          200,
          CONTENT_TYPES[".json"],
          readFileSync(latestPath, "utf8"),
        );

        return;
      }

      if (
        method === "GET" &&
        requestUrl.pathname === "/api/applications"
      ) {
        try {
          const snapshot =
            getApplicationTrackerSnapshot(
              outputDirectory,
            );

          sendJson(
            response,
            200,
            snapshot,
          );
        } catch (error) {
          sendJson(
            response,
            500,
            {
              error:
                errorMessage(
                  error,
                ),
            },
          );
        }

        return;
      }

      if (
        method === "POST" &&
        requestUrl.pathname === "/api/applications"
      ) {
        try {
          const rawPayload =
            await readJsonBody(
              request,
            );

          const payload =
            rawPayload as {
              input: JobInput;
              analysis:
                JobAnalysisOutput;
              details?:
                CreateApplicationDetails;
            };

          const created =
            createApplicationRecord(
              payload.input,
              payload.analysis,
              payload.details ??
                {},
              outputDirectory,
            );

          sendJson(
            response,
            201,
            created,
          );
        } catch (error) {
          sendJson(
            response,
            400,
            {
              error:
                errorMessage(
                  error,
                ),
            },
          );
        }

        return;
      }

      const applicationUpdateMatch =
        requestUrl.pathname.match(
          /^\/api\/applications\/([0-9a-f-]+)$/i,
        );

      if (
        method === "PATCH" &&
        applicationUpdateMatch
      ) {
        try {
          const rawUpdate =
            await readJsonBody(
              request,
            );

          const updated =
            updateApplicationRecord(
              applicationUpdateMatch[1],
              rawUpdate as
                ApplicationUpdate,
              outputDirectory,
            );

          sendJson(
            response,
            200,
            updated,
          );
        } catch (error) {
          sendJson(
            response,
            400,
            {
              error:
                errorMessage(
                  error,
                ),
            },
          );
        }

        return;
      }

      if (
        method === "POST" &&
        requestUrl.pathname === "/api/analyze"
      ) {
        try {
          const rawInput =
            await readJsonBody(request);

          const input =
            rawInput as JobInput;

          const result =
            await runJobAgent(input);

          const applicationPack =
            buildApplicationActionPack(
              input,
              result,
            );

          const saved = {
            ...saveResult(
              result,
              outputDirectory,
            ),

            ...saveApplicationPack(
              applicationPack,
              result,
              outputDirectory,
            ),
          };

          sendJson(response, 200, {
            result,
            applicationPack,
            saved,
          });
        } catch (error) {
          sendJson(response, 400, {
            error: errorMessage(error),
          });
        }

        return;
      }

      if (
        method === "GET" &&
        serveStaticFile(
          response,
          requestUrl.pathname,
          webDirectory,
        )
      ) {
        return;
      }

      sendJson(response, 404, {
        error: "页面或接口不存在。",
      });
    },
  );
}

export function startWillowServer(): void {
  const portValue = Number(
    process.env.PORT ?? DEFAULT_PORT,
  );

  const port =
    Number.isInteger(portValue) &&
    portValue > 0
      ? portValue
      : DEFAULT_PORT;

  const host =
    process.env.HOST ??
    (process.env.PORT
      ? "0.0.0.0"
      : "127.0.0.1");

  const server = createWillowServer();

  server.listen(port, host, () => {
    const displayHost =
      host === "0.0.0.0"
        ? "127.0.0.1"
        : host;

    console.log("");
    console.log(
      "WILLOW JOB AGENT 2.0 已启动",
    );

    console.log(
      `运行模式：${getRuntimeProvider().toUpperCase()}`,
    );

    console.log(
      `浏览器地址：http://${displayHost}:${port}`,
    );

    console.log(
      "停止运行：在终端按 Ctrl+C",
    );

    console.log("");
  });
}

if (require.main === module) {
  startWillowServer();
}
