/** Generic error detail for all responses. */
export type ErrorRsp = { error: string; status: number };

export type Endpoint = (typeof Endpoint)[keyof typeof Endpoint];
export const Endpoint = {
  OnCommentCreate: "internal/on/comment/create",
  OnPostCreate: "internal/on/post/create",
} as const;

export const EndpointMethod = {
  [Endpoint.OnCommentCreate]: "POST",
  [Endpoint.OnPostCreate]: "POST",
} as const satisfies { [endpoint: string]: "GET" | "POST" };
