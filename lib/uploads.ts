import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const extensions: Record<string, { mime: string; kind: "image" | "video" }> = {
  ".png": { mime: "image/png", kind: "image" },
  ".jpg": { mime: "image/jpeg", kind: "image" },
  ".jpeg": { mime: "image/jpeg", kind: "image" },
  ".webp": { mime: "image/webp", kind: "image" },
  ".gif": { mime: "image/gif", kind: "image" },
  ".mp4": { mime: "video/mp4", kind: "video" },
  ".webm": { mime: "video/webm", kind: "video" },
};

export const imageLimit = 10 * 1024 * 1024;
export const videoLimit = 700 * 1024 * 1024;
export const multipartVideoLimit = 100 * 1024 * 1024;

export function uploadDirectory() {
  const path = process.env.UPLOADS_PATH?.trim();
  const databasePath = resolve(/* turbopackIgnore: true */ process.env.DATABASE_PATH || ".data/treinamentos.sqlite");
  const directory = resolve(/* turbopackIgnore: true */ path || join(dirname(databasePath), "uploads"));
  mkdirSync(directory, { recursive: true, mode: 0o750 });
  return directory;
}

export function mediaTypeForExtension(extension: string) {
  return extensions[extension.toLowerCase()];
}

export function safeUploadName(filename: string) {
  return /^[0-9a-f-]{36}\.(?:png|jpe?g|webp|gif|mp4|webm)$/i.test(filename);
}

export function validFileSignature(bytes: Uint8Array, extension: string) {
  const ext = extension.toLowerCase();
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (ext === ".png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (ext === ".jpg" || ext === ".jpeg") return starts(0xff, 0xd8, 0xff);
  if (ext === ".gif") return starts(0x47, 0x49, 0x46, 0x38);
  if (ext === ".webp") return starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
  if (ext === ".mp4") return String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
  if (ext === ".webm") return starts(0x1a, 0x45, 0xdf, 0xa3);
  return false;
}

export function uploadPath(filename: string) {
  return join(uploadDirectory(), filename);
}
