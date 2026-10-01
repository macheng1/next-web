export type ErrorKind = "network" | "timeout" | "aborted" | "http" | "business";
export class HttpError extends Error {
  constructor(
    public kind: ErrorKind,
    message: string,
    public status?: number,
    public bizCode?: number,
    public traceId?: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}
export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  fallbackMessage?: string;
  maxResponseBytes?: number;
}
