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
    if (!input) return Response.json({ error: "Confira os dados do treinamento e as três etapas." }, { status: 400 });
    const result = database().prepare("UPDATE training_courses SET title = ?, description = ?, category = ?, duration = ?, lessons = ? WHERE id = ? AND active = 1")
      .run(input.title, input.description, input.category, input.duration, JSON.stringify(input.lessons), id);
    if (result.changes === 0) return Response.json({ error: "Treinamento não encontrado ou inativo." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Não foi possível editar o treinamento." }, { status: 503 });
  }
}
