import { HttpError } from "../http/types";
import { buyerCopy } from "./copy";
export function buyerError(error: unknown, locale: string) {
  const t = buyerCopy(locale);
  if (error instanceof HttpError) {
    if (error.errorKey === "session_changed") return t.sessionExpired;
    if (error.status === 401 || error.bizCode === 40001)
      return t.sessionExpired;
    if (
      error.errorKey?.startsWith("INVALID") ||
      error.errorKey === "UNKNOWN_FIELD"
    )
      return t.invalid;
    if (error.errorKey === "FILE_NOT_ALLOWED") return t.uploadHint;
    if (
      error.errorKey === "STATE_NOT_ALLOWED" ||
      error.errorKey === "NOT_FOUND"
    )
      return t.unavailable;
    if (error.errorKey === "VERSION_CONFLICT") return t.loadFailed;
  }
  if (error instanceof Error && error.message.startsWith("INVALID"))
    return t.invalid;
  return t.failed;
}
