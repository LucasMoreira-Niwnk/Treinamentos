import { authorizedUser } from "../../../lib/auth";
import { database } from "../../../lib/training";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await authorizedUser(request);
  if (response) return response;
  try {
    const payload = await request.json() as { courseId?: string; answers?: number[] };
    if (!payload.courseId || typeof payload.courseId !== "string" || !Array.isArray(payload.answers) || payload.answers.length !== 3 || payload.answers.some((answer) => answer !== 0 && answer !== 1)) {
      return Response.json({ error: "Responda às três questões para concluir o treinamento." }, { status: 400 });
    }
    const db = database();
    const course = db.prepare("SELECT id, lessons FROM training_courses WHERE id = ? AND active = 1").get(payload.courseId) as { id: string; lessons: string } | undefined;
    if (!course) return Response.json({ error: "Este treinamento não está mais disponível." }, { status: 404 });
    if ((JSON.parse(course.lessons) as unknown[]).length !== payload.answers.length) return Response.json({ error: "A avaliação do treinamento foi atualizada. Recarregue a página." }, { status: 409 });
    const score = Math.round(payload.answers.filter((answer) => answer === 0).length / payload.answers.length * 100);
    db.prepare("INSERT INTO training_completions (user_sub, course_id, user_email, score, completed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_sub, course_id) DO UPDATE SET user_email = excluded.user_email, score = excluded.score, completed_at = excluded.completed_at")
      .run(user!.sub, course.id, user!.email, score, Date.now());
    return Response.json({ score }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a avaliação." }, { status: 503 }); }
}
