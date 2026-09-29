import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { extname } from "node:path";
import { authorizedUser } from "../../../lib/auth";
import { imageLimit, mediaTypeForExtension, uploadPath, validFileSignature, videoLimit } from "../../../lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await authorizedUser(request);
  if (response) return response;
  if (!user!.admin) return Response.json({ error: "Somente gestores podem anexar arquivos." }, { status: 403 });
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== new URL(request.url).origin) return Response.json({ error: "Origem da solicitação inválida." }, { status: 403 });
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Selecione uma imagem ou um vídeo." }, { status: 400 });
    const extension = extname(file.name).toLowerCase();
    const mediaType = mediaTypeForExtension(extension);
    if (!mediaType || (file.type && file.type !== mediaType.mime)) return Response.json({ error: "Formato não suportado. Use PNG, JPG, WebP, GIF, MP4 ou WebM." }, { status: 415 });
    const limit = mediaType.kind === "image" ? imageLimit : videoLimit;
    if (file.size > limit) return Response.json({ error: mediaType.kind === "image" ? "Imagens podem ter até 10 MB." : "Vídeos podem ter até 100 MB." }, { status: 413 });
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
