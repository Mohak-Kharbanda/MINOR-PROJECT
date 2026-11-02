/**
 * Storage drivers keep every file private. Clients never get a permanent
 * public URL: after the API checks project access it hands out a short-lived
 * signed URL for one file.
 */

export function safeFilename(name) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .replace(/\s+/g, "_")
      .slice(-120) || "file"
  );
}

export function contentDisposition(disposition, filename) {
  const ascii = safeFilename(filename);
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
