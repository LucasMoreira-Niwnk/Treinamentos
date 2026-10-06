import { authorizedUser } from "../../../lib/auth";
import { parseCourseInput } from "../../../lib/course-input";
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
    const input = parseCourseInput(await request.json());
    if (!input) {
      return Response.json({ error: "Confira os dados e as etapas. Inclua pelo menos uma explicação ou pergunta e uma alternativa correta em cada quiz." }, { status: 400 });
    }
    const db = database();
    db.prepare("INSERT INTO training_courses (id, title, description, category, duration, cover_image, lessons, active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)")
      .run(crypto.randomUUID(), input.title, input.description, input.category, input.duration, input.coverImage, JSON.stringify(input.steps), Date.now());
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível cadastrar o treinamento." }, { status: 503 }); }
}
