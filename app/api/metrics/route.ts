import { authorizedUser, displayNameFromEmail } from "../../../lib/auth";
import { database, seedCourses } from "../../../lib/training";
import { parseTrainingSteps } from "../../../lib/training-content";

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
    const loggedUsers = db.prepare("SELECT sub, name, email, last_seen_at FROM portal_users ORDER BY name COLLATE NOCASE, email COLLATE NOCASE").all() as { sub: string; name: string; email: string; last_seen_at: number }[];
    const courses = db.prepare("SELECT c.id, c.title, c.description, c.category, c.duration, c.cover_image, c.lessons, c.active, c.created_at, p.score AS viewer_score, p.completed_at AS viewer_completed_at FROM training_courses c LEFT JOIN training_completions p ON p.course_id = c.id AND p.user_sub = ? WHERE c.active = 1 ORDER BY c.created_at, c.id").all(user!.sub) as { id: string; title: string; description: string; category: string; duration: number; cover_image: string; lessons: string; active: number; created_at: number; viewer_score: number | null; viewer_completed_at: number | null }[];
    const completions = db.prepare("SELECT course_id, COUNT(*) AS done, AVG(score) AS score FROM training_completions WHERE score IS NULL OR score >= 75 GROUP BY course_id").all() as { course_id: string; done: number; score: number | null }[];
    const scores = db.prepare("SELECT AVG(p.score) AS average_score, COUNT(*) AS total FROM training_completions p JOIN training_courses c ON c.id = p.course_id WHERE p.score >= 75 AND c.active = 1").get() as { average_score: number | null; total: number } | undefined;
    const passedCourses = db.prepare("SELECT p.user_sub, p.course_id, c.title, c.active, p.score, p.completed_at FROM training_completions p JOIN training_courses c ON c.id = p.course_id WHERE p.score IS NULL OR p.score >= 75 ORDER BY p.completed_at DESC").all() as { user_sub: string; course_id: string; title: string; active: number; score: number | null; completed_at: number }[];
    const people = users?.total ?? 0;
    const scoreByCourse = new Map(completions.map((row) => [row.course_id, row]));
    const courseStats = courses.map((course) => ({ id: course.id, title: course.title, total: people, done: scoreByCourse.get(course.id)?.done ?? 0, score: scoreByCourse.get(course.id)?.score == null ? null : Math.round(scoreByCourse.get(course.id)!.score!) }));
    const possible = people * courses.length;
    const done = courseStats.reduce((sum, item) => sum + item.done, 0);
    const passedByUser = new Map<string, typeof passedCourses>();
    for (const completion of passedCourses) passedByUser.set(completion.user_sub, [...(passedByUser.get(completion.user_sub) ?? []), completion]);
    const members = loggedUsers.map((member) => {
      const memberCourses = passedByUser.get(member.sub) ?? [];
      return { name: displayNameFromEmail(member.email), email: member.email, lastSeenAt: member.last_seen_at, done: memberCourses.filter((course) => course.active).length, total: courses.length, courses: memberCourses.map(({ course_id, title, active, score, completed_at }) => ({ courseId: course_id, title, active: Boolean(active), score, completedAt: completed_at })) };
    });
    return Response.json({ people, completion: possible ? Math.round(done / possible * 100) : 0, averageScore: scores?.average_score == null ? 0 : Math.round(scores.average_score), totalCompleted: done, totalPossible: possible, members, courses: courses.map((course) => ({ ...course, coverImage: course.cover_image, steps: parseTrainingSteps(course.lessons), completed: course.viewer_completed_at !== null && (course.viewer_score === null || course.viewer_score >= 75), score: course.viewer_score })), courseStats }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível carregar as métricas." }, { status: 503 }); }
}
