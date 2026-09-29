import { authorizedUser } from "../../../../lib/auth";
import { parseCourseInput } from "../../../../lib/course-input";
import { database } from "../../../../lib/training";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await authorizedUser(request);
  if (response) return response;
  if (!user!.admin) return Response.json({ error: "Somente gestores podem editar treinamentos." }, { status: 403 });
  try {
    const { id } = await context.params;
    const input = parseCourseInput(await request.json());
    if (!input) return Response.json({ error: "Confira os dados e as etapas do treinamento." }, { status: 400 });
    const result = database().prepare("UPDATE training_courses SET title = ?, description = ?, category = ?, duration = ?, cover_image = ?, lessons = ? WHERE id = ? AND active = 1")
      .run(input.title, input.description, input.category, input.duration, input.coverImage, JSON.stringify(input.steps), id);
    if (result.changes === 0) return Response.json({ error: "Treinamento não encontrado ou inativo." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível editar o treinamento." }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { user, response } = await authorizedUser(request);
  if (response) return response;
  if (!user!.admin) return Response.json({ error: "Somente gestores podem excluir treinamentos." }, { status: 403 });
  try {
    const { id } = await context.params;
    const result = database().prepare("UPDATE training_courses SET active = 0 WHERE id = ? AND active = 1").run(id);
    if (result.changes === 0) return Response.json({ error: "Treinamento não encontrado ou já excluído." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível excluir o treinamento." }, { status: 500 });
  }
}
