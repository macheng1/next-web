export const SESSION_EVENT = "manulink-session-changed";
export const SESSION_STORAGE_KEY = "manulink_session_signal";
export function signalSessionChange() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      SESSION_STORAGE_KEY,
      String(Date.now()) + ":" + Math.random(),
    );
  } catch {
    /* Cookie remains authoritative even when browser storage is unavailable. */
  }
  window.dispatchEvent(new Event(SESSION_EVENT));
}
