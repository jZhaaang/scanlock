import { once } from "node:events";
import type { IncomingMessage, ServerResponse } from "node:http";
import { context, reddit, type TaskResponse } from "@devvit/web/server";
import type {
  OnCommentCreateRequest,
  OnPostCreateRequest,
  PartialJsonValue,
  T1,
  T3,
  TriggerResponse,
  UiResponse,
} from "@devvit/web/shared";
import { isT1, isT3 } from "@devvit/web/shared";
import { Endpoint, EndpointMethod, type ErrorRsp } from "../shared/api.ts";
import { normalize } from "../shared/normalize.ts";
import { extractTokens } from "../shared/reply/brackets.ts";
import { renderReply } from "../shared/reply/render.ts";
import { resolveAll } from "../shared/reply/resolve.ts";
import { readEntries, readHead } from "./store.ts";
import { sync } from "./sync.ts";

type AnyRsp = UiResponse | TriggerResponse | TaskResponse | ErrorRsp;

const MAX_LOGGED_LENGTH = 40;

export async function onReq(
  reqMsg: IncomingMessage,
  rspMsg: ServerResponse,
): Promise<void> {
  try {
    await route(reqMsg, rspMsg);
  } catch (err) {
    const msg = `server error; ${err instanceof Error ? err.stack : err}`;
    console.error(msg);
    writeJson<ErrorRsp>(500, { error: msg, status: 500 }, rspMsg);
  }
}

async function route(
  reqMsg: IncomingMessage,
  rspMsg: ServerResponse,
): Promise<void> {
  const endpoint = reqMsg.url?.slice(1) as Endpoint;
  const method = EndpointMethod[endpoint];

  let rsp: AnyRsp;
  if (method !== reqMsg.method) {
    rsp = { error: "not found", status: 404 };
  } else {
    switch (endpoint) {
      case Endpoint.OnAppInstall:
      case Endpoint.SchedulerSync:
        rsp = await routeSync();
        break;
      case Endpoint.OnCommentCreate:
        rsp = await routeCommentCreate(reqMsg);
        break;
      case Endpoint.OnPostCreate:
        rsp = await routePostCreate(reqMsg);
        break;
      default:
        endpoint satisfies never;
        rsp = { error: "not found", status: 404 };
        break;
    }
  }

  writeJson<PartialJsonValue>("status" in rsp ? rsp.status : 200, rsp, rspMsg);
}

async function routeSync(): Promise<TaskResponse> {
  console.log((await sync()) ? "synced" : "already current");
  return {};
}

async function routeCommentCreate(
  reqMsg: IncomingMessage,
): Promise<TriggerResponse> {
  const req = await readJson<OnCommentCreateRequest>(reqMsg);
  const comment = req.comment;
  if (!comment?.body || !isT1(comment.id)) return {};
  return respond(comment.id, comment.body, req.author?.name);
}

async function routePostCreate(
  reqMsg: IncomingMessage,
): Promise<TriggerResponse> {
  const req = await readJson<OnPostCreateRequest>(reqMsg);
  const post = req.post;
  if (!post?.title || !isT3(post.id)) return {};
  return respond(post.id, `${post.selftext}`, req.author?.name);
}

async function respond(
  id: T1 | T3,
  text: string,
  author: string | undefined,
): Promise<TriggerResponse> {
  if (author === context.appSlug) return {};

  const tokens = extractTokens(text);
  if (!tokens.length) return {};

  const head = await readHead();
  if (!head) {
    console.warn(`no snapshot; id=${id} tokens=${tokens.length}`);
    return {};
  }

  const results = resolveAll(tokens, head.index);
  const ids = results.flatMap((r) => r.ids.slice(0, 1));

  const missed = results.filter((r) => r.via === "none");
  if (missed.length) {
    const names = missed
      .map((r) => normalize(r.token).slice(0, MAX_LOGGED_LENGTH))
      .join(", ");
    console.warn(`unmatched; id=${id} names=${names}`);
  }

  if (!ids.length) return {};

  const entries = await readEntries(head.meta.build, ids);
  if (!entries.length) return {};

  await reddit.submitComment({
    id,
    text: renderReply(entries, head.meta),
    runAs: "APP",
  });
  console.log(`id=${id} tokens=${tokens.length} replied=${entries.length}`);
  return {};
}

async function readJson<T>(reqMsg: IncomingMessage): Promise<T> {
  const chunks: Uint8Array[] = [];
  reqMsg.on("data", (chunk) => chunks.push(chunk));
  await once(reqMsg, "end");
  return JSON.parse(`${Buffer.concat(chunks)}`);
}

function writeJson<T extends PartialJsonValue>(
  status: number,
  json: Readonly<T>,
  rsp: ServerResponse,
): void {
  const body = JSON.stringify(json);
  const len = Buffer.byteLength(body);
  rsp.writeHead(status, {
    "Content-Length": len,
    "Content-Type": "application/json",
  });
  rsp.end(body);
}
