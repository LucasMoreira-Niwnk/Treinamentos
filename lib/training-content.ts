export type ContentStep = { id: string; type: "content"; title: string; content: string };
export type QuizStep = { id: string; type: "quiz"; question: string; options: string[]; correctAnswer: number; explanation?: string };
export type TrainingStep = ContentStep | QuizStep;

export function parseTrainingSteps(value: string | unknown): TrainingStep[] {
  const parsed = typeof value === "string" ? JSON.parse(value) as unknown : value;
  if (!Array.isArray(parsed)) throw new Error("O conteúdo deste treinamento está inválido.");
  if (parsed.length === 0 || typeof parsed[0] !== "string") return parsed as TrainingStep[];

  return (parsed as string[]).flatMap((legacy, index) => {
    const separator = legacy.indexOf("|");
    const title = separator >= 0 ? legacy.slice(0, separator).trim() : `Etapa ${index + 1}`;
    const content = separator >= 0 ? legacy.slice(separator + 1).trim() : legacy.trim();
    return [
      { id: `legacy-content-${index + 1}`, type: "content" as const, title, content },
      {
        id: `legacy-quiz-${index + 1}`,
        type: "quiz" as const,
        question: `Qual é a conduta mais segura sobre “${title}”?`,
        options: ["Seguir a orientação e o procedimento seguro apresentados.", "Ignorar a orientação e improvisar para terminar mais rápido."],
        correctAnswer: 0,
        explanation: "Siga o procedimento seguro apresentado no conteúdo do treinamento.",
      },
    ];
  });
}
