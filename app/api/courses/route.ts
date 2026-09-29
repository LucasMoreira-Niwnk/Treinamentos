import { authorizedUser } from "../../../lib/auth";
import { database, listCoursesForUser } from "../../../lib/training";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await authorizedUser(request);
  if (response) return response;
  try { return Response.json({ courses: await listCoursesForUser(database(), user!.sub) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar os treinamentos." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const { user, response } = await authorizedUser(request);
  if (response) return response;
  if (!user!.admin) return Response.json({ error: "Somente gestores podem cadastrar treinamentos." }, { status: 403 });
  try {
    const payload = await request.json() as { title?: string; description?: string; category?: string; duration?: number };
    const title = payload.title?.trim() ?? "";
    const description = payload.description?.trim() ?? "";
    const category = payload.category?.trim() ?? "";
    const duration = Number(payload.duration);
    if (!title || !description || !category || !Number.isInteger(duration) || duration < 1 || duration > 240 || title.length > 100 || description.length > 240 || category.length > 40) {
      return Response.json({ error: "Confira o título, a descrição, a categoria e a duração do treinamento." }, { status: 400 });
    }
    const db = database();
    db.prepare("INSERT INTO training_courses (id, title, description, category, duration, lessons, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)")
      .run(crypto.randomUUID(), title, description, category, duration, JSON.stringify([`Conteúdo principal|${description}`, "Aplicação segura|Siga o procedimento da sua unidade para aplicar esta orientação.", "Confirmação de aprendizado|Se não tiver certeza do procedimento, procure seu responsável antes de agir."]), Date.now());
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível cadastrar o treinamento." }, { status: 503 }); }
}
