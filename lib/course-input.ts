import type { TrainingMedia, TrainingStep } from "./training-content";

export type CourseInput = { title: string; description: string; category: string; duration: number; coverImage: string; steps: TrainingStep[] };

export function parseCourseInput(value: unknown): CourseInput | null {
  if (!value || typeof value !== "object") return null;
  const payload = value as Record<string, unknown>;
  const title = typeof payload.title === "string" ? payload.title.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const category = typeof payload.category === "string" ? payload.category.trim() : "";
  const duration = Number(payload.duration);
  const coverImage = typeof payload.coverImage === "string" ? payload.coverImage.trim() : "";
  if (!title || title.length > 100 || !description || description.length > 240 || !category || category.length > 40 || !Number.isInteger(duration) || duration < 1 || duration > 240 || (coverImage && !/^\/api\/uploads\/[0-9a-f-]{36}\.(?:png|jpe?g|webp|gif)$/i.test(coverImage)) || !Array.isArray(payload.steps) || payload.steps.length < 2 || payload.steps.length > 41) return null;

  const steps: TrainingStep[] = [];
  const ids = new Set<string>();
  for (const raw of payload.steps) {
    if (!raw || typeof raw !== "object") return null;
    const step = raw as Record<string, unknown>;
    const candidateId = typeof step.id === "string" ? step.id.trim().slice(0, 80) : "";
    const id = candidateId && !ids.has(candidateId) ? candidateId : crypto.randomUUID();
    ids.add(id);
    if (step.type === "content") {
      const heading = typeof step.title === "string" ? step.title.trim() : "";
      const content = typeof step.content === "string" ? step.content.trim() : "";
      if (!heading || heading.length > 100 || !content || content.length > 5000) return null;
      const mediaPayload = step.media === undefined ? [] : step.media;
      if (!Array.isArray(mediaPayload) || mediaPayload.length > 10) return null;
      const media: TrainingMedia[] = [];
      for (const rawMedia of mediaPayload) {
        if (!rawMedia || typeof rawMedia !== "object") return null;
        const item = rawMedia as Record<string, unknown>;
        const url = typeof item.url === "string" ? item.url : "";
        const name = typeof item.name === "string" ? item.name.trim().slice(0, 255) : "";
        const kind = item.kind;
        if (!/^\/api\/uploads\/[0-9a-f-]{36}\.(?:png|jpe?g|webp|gif|mp4|webm)$/i.test(url) || !name || (kind !== "image" && kind !== "video")) return null;
        media.push({ url, name, kind });
      }
      steps.push({ id, type: "content", title: heading, content, ...(media.length ? { media } : {}) });
    } else if (step.type === "quiz") {
      const question = typeof step.question === "string" ? step.question.trim() : "";
      const options = Array.isArray(step.options) ? step.options.map((option) => typeof option === "string" ? option.trim() : "") : [];
      const correctAnswer = step.correctAnswer;
      const explanation = typeof step.explanation === "string" ? step.explanation.trim() : "";
      if (!question || question.length > 500 || options.length < 2 || options.length > 5 || options.some((option) => !option || option.length > 300) || !Number.isInteger(correctAnswer) || Number(correctAnswer) < 0 || Number(correctAnswer) >= options.length || explanation.length > 500) return null;
      steps.push({ id, type: "quiz", question, options, correctAnswer: Number(correctAnswer), ...(explanation ? { explanation } : {}) });
    } else if (step.type === "completion") {
      const heading = typeof step.title === "string" ? step.title.trim() : "";
      const content = typeof step.content === "string" ? step.content.trim() : "";
      let video: TrainingMedia | undefined;
      if (step.video !== undefined) {
        if (!step.video || typeof step.video !== "object") return null;
        const media = step.video as Record<string, unknown>;
        const url = typeof media.url === "string" ? media.url : "";
        const name = typeof media.name === "string" ? media.name.trim().slice(0, 255) : "";
        if (media.kind !== "video" || !/^\/api\/uploads\/[0-9a-f-]{36}\.(?:mp4|webm)$/i.test(url) || !name) return null;
        video = { url, name, kind: "video" };
      }
      if (!heading || heading.length > 100 || content.length > 5000 || (!content && !video)) return null;
      steps.push({ id, type: "completion", title: heading, content, ...(video ? { video } : {}) });
    } else return null;
  }

  const completionSteps = steps.filter((step) => step.type === "completion");
  if (steps[0]?.type !== "content" || (steps.at(-1)?.type !== "quiz" && steps.at(-1)?.type !== "completion") || completionSteps.length > 1 || (completionSteps.length === 1 && steps.at(-1)?.type !== "completion") || !steps.some((step) => step.type === "content") || !steps.some((step) => step.type === "quiz")) return null;
  return { title, description, category, duration, coverImage, steps };
}
