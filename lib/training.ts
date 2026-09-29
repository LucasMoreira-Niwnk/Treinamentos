import type { DatabaseSync } from "node:sqlite";
import { getDb } from "../db";
import { parseTrainingSteps, type TrainingStep } from "./training-content";

export type Course = { id: string; title: string; description: string; category: string; duration: number; coverImage: string; steps: TrainingStep[]; active: number; created_at: number };

const starterCourses = [
  { title: "Equipamentos de proteção", description: "Escolha, uso e conservação dos EPIs na rotina de trabalho.", category: "EPIs", duration: 12, lessons: ["Escolha do equipamento|Confira o risco da atividade e use o EPI indicado para aquela tarefa.", "Uso correto e ajuste|Ajuste o equipamento antes de iniciar e verifique se está íntegro.", "Conservação e troca|Limpe, guarde no local correto e peça a substituição de itens danificados."] },
  { title: "Prevenção de acidentes", description: "Reconheça perigos e interrompa situações que possam causar acidentes.", category: "Prevenção", duration: 10, lessons: ["Identificação de riscos|Observe piso, máquinas, ferramentas e circulação antes de começar.", "Organização da área|Mantenha passagens livres e materiais guardados após o uso.", "Comunicação de incidentes|Comunique riscos, incidentes e quase acidentes ao responsável da unidade."] },
  { title: "Emergências e evacuação", description: "Saiba como reagir, comunicar e seguir a rota de saída em uma emergência.", category: "Emergência", duration: 8, lessons: ["Primeira resposta|Mantenha a calma, avise as pessoas próximas e acione o canal de emergência.", "Rota de evacuação|Siga a rota sinalizada e não use elevadores durante uma evacuação.", "Ponto de encontro|Dirija-se ao ponto indicado e aguarde instruções da equipe responsável."] },
  { title: "Segurança no manuseio de materiais", description: "Reduza o risco de lesões ao levantar, transportar e armazenar materiais.", category: "Operação", duration: 11, lessons: ["Avaliação da carga|Confira o peso, o formato e o caminho antes de mover um material.", "Movimentação segura|Use equipamento auxiliar ou peça ajuda para cargas pesadas e volumosas.", "Armazenamento estável|Empilhe dentro do limite e mantenha o material firme e organizado."] },
];

export function database() {
  return getDb();
}

export async function seedCourses(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS total FROM training_courses WHERE active = 1").get() as { total: number } | undefined;
  if ((row?.total ?? 0) > 0) return;
  const now = Date.now();
  const insert = db.prepare("INSERT INTO training_courses (id, title, description, category, duration, lessons, active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)");
  db.exec("BEGIN IMMEDIATE");
  try {
    starterCourses.forEach((course, index) => insert.run(`base-${index + 1}`, course.title, course.description, course.category, course.duration, JSON.stringify(course.lessons), now));
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export async function listCoursesForUser(db: DatabaseSync, sub: string) {
  await seedCourses(db);
  const result = db.prepare("SELECT c.id, c.title, c.description, c.category, c.duration, c.cover_image, c.lessons, c.active, c.created_at, p.score, p.completed_at FROM training_courses c LEFT JOIN training_completions p ON p.course_id = c.id AND p.user_sub = ? WHERE c.active = 1 ORDER BY c.created_at, c.id")
    .all(sub) as unknown as (Omit<Course, "steps" | "coverImage"> & { cover_image: string; lessons: string; score: number | null; completed_at: number | null })[];
  return result.map((course) => ({ ...course, coverImage: course.cover_image, steps: parseTrainingSteps(course.lessons), completed: course.score !== null && course.score >= 75 }));
}
