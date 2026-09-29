import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { getPortalUser } from "../../../../lib/auth";
import { mediaTypeForExtension, safeUploadName, uploadPath } from "../../../../lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ filename: string }> }) {
  if (!await getPortalUser(request)) return Response.json({ error: "Entre com sua conta Workspace para acessar este arquivo." }, { status: 401 });
  const { filename } = await context.params;
  if (!safeUploadName(filename)) return new Response("Não encontrado", { status: 404 });
  const mediaType = mediaTypeForExtension(filename.slice(filename.lastIndexOf(".")));
  if (!mediaType) return new Response("Não encontrado", { status: 404 });
  try {
    const path = uploadPath(filename);
    const file = await stat(path);
    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=300",
      "Content-Disposition": "inline",
      "Content-Type": mediaType.mime,
      "X-Content-Type-Options": "nosniff",
    });
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
      const start = match[1] ? Number(match[1]) : Math.max(0, file.size - Number(match[2]));
      const end = match[2] && match[1] ? Math.min(file.size - 1, Number(match[2])) : file.size - 1;
      if (start > end || start >= file.size) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${file.size}` } });
      headers.set("Content-Length", String(end - start + 1));
      headers.set("Content-Range", `bytes ${start}-${end}/${file.size}`);
      return new Response(Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream<Uint8Array>, { status: 206, headers });
    }
    headers.set("Content-Length", String(file.size));
    return new Response(Readable.toWeb(createReadStream(path)) as ReadableStream<Uint8Array>, { headers });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return new Response("Não encontrado", { status: 404 });
    return Response.json({ error: "Não foi possível ler o arquivo." }, { status: 500 });
  }
}
