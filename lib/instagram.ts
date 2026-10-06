export function getInstagramUrl(value: string): string | null {
  let handle = value.trim();
  if (/^https?:\/\//i.test(handle)) {
    try {
      const url = new URL(handle);
      if (!["instagram.com", "www.instagram.com"].includes(url.hostname) || url.port || url.username || url.password) return null;
      handle = url.pathname.replace(/^\/+|\/+$/g, "");
    } catch { return null; }
  } else {
    handle = handle.replace(/^@/, "");
  }
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle) || handle.startsWith(".") || handle.endsWith(".") || handle.includes("..")) return null;
  return `https://www.instagram.com/${handle}/`;
}
