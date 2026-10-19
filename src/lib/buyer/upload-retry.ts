/** Remember only unacknowledged uploads, scoped to the member and resource. */
export async function uploadRetryKey(
  file: File,
  member: string,
  purpose: string,
  resourceId = "",
) {
  const bytes = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const digest = Array.from(new Uint8Array(hash), (n) =>
    n.toString(16).padStart(2, "0"),
  ).join("");
  const storageKey = `buyer-upload-v1:${member}:${purpose}:${resourceId}:${file.name}:${digest}`;
  const key = sessionStorage.getItem(storageKey) || crypto.randomUUID();
  sessionStorage.setItem(storageKey, key);
  return { key, acknowledge: () => sessionStorage.removeItem(storageKey) };
}
