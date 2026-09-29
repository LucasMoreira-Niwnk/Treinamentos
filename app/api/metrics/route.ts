import { authorizedUser } from "../../../lib/auth";
import { database, seedCourses } from "../../../lib/training";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { user, response } = await authorizedUser(request);
  if (response) return response;
  if (!user!.admin) return Response.json({ error: "Somente gestores podem consultar as métricas." }, { status: 403 });
  try {
    const db = database();
    await seedCourses(db);
    const users = db.prepare("SELECT COUNT(*) AS total FROM portal_users").get() as { total: number } | undefined;
    const courses = db.prepare("SELECT id, title, description, category, duration, lessons, active, created_at FROM training_courses WHERE active = 1 ORDER BY created_at, id").all() as { id: string; title: string; description: string; category: string; duration: number; lessons: string; active: number; created_at: number }[];
    const completions = db.prepare("SELECT course_id, COUNT(*) AS done, AVG(score) AS score FROM training_completions GROUP BY course_id").all() as { course_id: string; done: number; score: number | null }[];
    const scores = db.prepare("SELECT AVG(score) AS average_score, COUNT(*) AS total FROM training_completions").get() as { average_score: number | null; total: number } | undefined;
    const people = users?.total ?? 0;
    const scoreByCourse = new Map(completions.map((row) => [row.course_id, row]));
    const courseStats = courses.map((course) => ({ id: course.id, title: course.title, total: people, done: scoreByCourse.get(course.id)?.done ?? 0, score: scoreByCourse.get(course.id)?.score == null ? null : Math.round(scoreByCourse.get(course.id)!.score!) }));
    const possible = people * courses.length;
    const done = courseStats.reduce((sum, item) => sum + item.done, 0);
    return Response.json({ people, completion: possible ? Math.round(done / possible * 100) : 0, averageScore: scores?.average_score == null ? 0 : Math.round(scores.average_score), courses: courses.map((course) => ({ ...course, lessons: JSON.parse(course.lessons) as string[], completed: false, score: null })), courseStats }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar as métricas." }, { status: 503 }); }
}
