import { authorizedUser } from "../../../lib/auth";
import { database } from "../../../lib/training";
import { parseTrainingSteps } from "../../../lib/training-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { user, response } = await authorizedUser(request);
  if (response) return response;
  try {
    const payload = await request.json() as { courseId?: string; answers?: number[] };
    if (!payload.courseId || typeof payload.courseId !== "string" || !Array.isArray(payload.answers) || payload.answers.some((answer) => !Number.isInteger(answer) || answer < 0)) {
      return Response.json({ error: "Responda às questões do treinamento para continuar." }, { status: 400 });
    }
    const db = database();
    const course = db.prepare("SELECT id, lessons FROM training_courses WHERE id = ? AND active = 1").get(payload.courseId) as { id: string; lessons: string } | undefined;
    if (!course) return Response.json({ error: "Este treinamento não está mais disponível." }, { status: 404 });
    const quizSteps = parseTrainingSteps(course.lessons).filter((step) => step.type === "quiz");
    if (quizSteps.length !== payload.answers.length || quizSteps.length === 0 || payload.answers.some((answer, index) => answer >= quizSteps[index].options.length)) {
      return Response.json({ error: "A avaliação do treinamento foi atualizada. Recarregue a página." }, { status: 409 });
    }
    const correct = quizSteps.reduce((total, step, index) => total + (payload.answers![index] === step.correctAnswer ? 1 : 0), 0);
    const total = quizSteps.length;
    const incorrect = total - correct;
    const score = Math.round(correct / total * 100);
    const passed = correct / total >= 0.75;
    const results = quizSteps.map((step, index) => ({ question: step.question, selectedAnswer: payload.answers![index], correctAnswer: step.correctAnswer, correct: payload.answers![index] === step.correctAnswer, explanation: step.explanation ?? "" }));
    if (passed) {
      db.prepare("INSERT INTO training_completions (user_sub, course_id, user_email, score, completed_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_sub, course_id) DO UPDATE SET user_email = excluded.user_email, score = excluded.score, completed_at = excluded.completed_at")
        .run(user!.sub, course.id, user!.email, score, Date.now());
    }
    return Response.json({ score, correct, incorrect, total, passed, results }, { status: passed ? 201 : 200 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível salvar a avaliação." }, { status: 503 }); }
}
