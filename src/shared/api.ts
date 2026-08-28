/** Generic error detail for all responses. */
export type ErrorRsp = { error: string; status: number };

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint];
export const Endpoint = {
  OnAppInstall: "internal/on/app/install",
  OnCommentCreate: "internal/on/comment/create",
  OnPostCreate: "internal/on/post/create",
  SchedulerSync: "internal/scheduler/sync",
} as const;

export const EndpointMethod = {
  [Endpoint.OnAppInstall]: "POST",
  [Endpoint.OnCommentCreate]: "POST",
  [Endpoint.OnPostCreate]: "POST",
  [Endpoint.SchedulerSync]: "POST",
} as const satisfies { [endpoint: string]: "GET" | "POST" };
