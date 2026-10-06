import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { authorizedUser } from "../../../lib/auth";
import { imageLimit, mediaTypeForExtension, multipartVideoLimit, uploadPath, validFileSignature, videoLimit } from "../../../lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function authorizeUpload(request: Request) {
  const { user, response } = await authorizedUser(request);
  if (response) return { user: null, response };
  if (!user!.admin) return { user: null, response: Response.json({ error: "Somente gestores podem anexar arquivos." }, { status: 403 }) };
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol || requestUrl.protocol.replace(":", "");
  const publicOrigin = `${protocol}://${host}`;
  if (origin) {
    let originValue = "";
    try { originValue = new URL(origin).origin; } catch { return { user: null, response: Response.json({ error: "Origem da solicitação inválida." }, { status: 403 }) }; }
    if (originValue !== publicOrigin) return { user: null, response: Response.json({ error: "Origem da solicitação inválida." }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function POST(request: Request) {
  const { user, response } = await authorizeUpload(request);
  if (response) return response;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Selecione uma imagem ou um vídeo." }, { status: 400 });
    const extension = extname(file.name).toLowerCase();
    const mediaType = mediaTypeForExtension(extension);
    if (!mediaType || (file.type && file.type !== mediaType.mime)) return Response.json({ error: "Formato não suportado. Use PNG, JPG, WebP, GIF, MP4 ou WebM." }, { status: 415 });
    const limit = mediaType.kind === "image" ? imageLimit : multipartVideoLimit;
    if (file.size > limit) return Response.json({ error: mediaType.kind === "image" ? "Imagens podem ter até 10 MB." : "Para vídeos maiores que 100 MB, use o envio de vídeo em fluxo." }, { status: 413 });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (!validFileSignature(bytes, extension)) return Response.json({ error: "O conteúdo do arquivo não corresponde ao formato selecionado." }, { status: 415 });
    const filename = `${randomUUID()}${extension}`;
    await writeFile(uploadPath(filename), bytes, { flag: "wx", mode: 0o640 });
    const name = file.name.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 255) || filename;
    return Response.json({ media: { url: `/api/uploads/${filename}`, kind: mediaType.kind, name } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar o arquivo." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const { user, response } = await authorizeUpload(request);
  if (response) return response;
  const url = new URL(request.url);
  const originalName = url.searchParams.get("filename")?.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, 255) ?? "";
  const extension = extname(originalName).toLowerCase();
  const mediaType = mediaTypeForExtension(extension);
  if (!mediaType || mediaType.kind !== "video") return Response.json({ error: "Envie um vídeo MP4 ou WebM." }, { status: 415 });
  const requestType = request.headers.get("content-type")?.split(";")[0].trim();
  if (requestType && requestType !== mediaType.mime && requestType !== "application/octet-stream") return Response.json({ error: "O tipo de conteúdo não corresponde à extensão do vídeo." }, { status: 415 });
  const announcedLength = Number(request.headers.get("content-length") ?? 0);
  if (announcedLength > videoLimit) return Response.json({ error: "Vídeos podem ter até 700 MB." }, { status: 413 });
  if (!request.body) return Response.json({ error: "O arquivo de vídeo está vazio." }, { status: 400 });

  const filename = `${randomUUID()}${extension}`;
  const destination = uploadPath(filename);
  let totalBytes = 0;
  let signature = Buffer.alloc(0);
  try {
    const limitStream = new Transform({
      transform(chunk: Buffer, _encoding, callback) {
        totalBytes += chunk.length;
        if (totalBytes > videoLimit) return callback(new Error("VIDEO_TOO_LARGE"));
        if (signature.length < 16) signature = Buffer.concat([signature, chunk.subarray(0, 16 - signature.length)]);
        callback(null, chunk);
      },
    });
    await pipeline(Readable.fromWeb(request.body as import("node:stream/web").ReadableStream<Uint8Array>), limitStream, createWriteStream(destination, { flags: "wx", mode: 0o640 }));
    if (totalBytes === 0) {
      await rm(destination, { force: true });
      return Response.json({ error: "O arquivo de vídeo está vazio." }, { status: 400 });
    }
    if (!validFileSignature(signature, extension)) {
      await rm(destination, { force: true });
      return Response.json({ error: "O conteúdo do arquivo não corresponde ao formato selecionado." }, { status: 415 });
    }
    return Response.json({ media: { url: `/api/uploads/${filename}`, kind: "video", name: originalName || filename } }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    await rm(destination, { force: true }).catch(() => undefined);
    if (error instanceof Error && error.message === "VIDEO_TOO_LARGE") return Response.json({ error: "Vídeos podem ter até 700 MB." }, { status: 413 });
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar o vídeo." }, { status: 500 });
  }
}
