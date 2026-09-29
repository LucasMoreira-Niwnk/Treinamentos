export type CourseInput = { title: string; description: string; category: string; duration: number; lessons: string[] };

export function parseCourseInput(value: unknown): CourseInput | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const category = typeof payload.category === "string" ? payload.category.trim() : "";
  const duration = Number(payload.duration);
  const lessons = payload.lessons === undefined
    ? [`Conteúdo principal|${description}`, "Aplicação segura|Siga o procedimento da sua unidade para aplicar esta orientação.", "Confirmação de aprendizado|Se não tiver certeza do procedimento, procure seu responsável antes de agir."]
    : payload.lessons;

  if (!title || title.length > 100 || !description || description.length > 240 || !category || category.length > 40 || !Number.isInteger(duration) || duration < 1 || duration > 240 || !Array.isArray(lessons) || lessons.length !== 3) return null;
  if (lessons.some((lesson) => typeof lesson !== "string" || !lesson.includes("|") || lesson.split("|")[0].trim().length < 1 || lesson.split("|")[0].trim().length > 100 || lesson.slice(lesson.indexOf("|") + 1).trim().length < 1 || lesson.slice(lesson.indexOf("|") + 1).trim().length > 500)) return null;

  return { title, description, category, duration, lessons: lessons as string[] };
}
