import { env } from "cloudflare:workers";

export type Course = { id: string; title: string; description: string; category: string; duration: number; lessons: string[]; active: number; created_at: number };

const starterCourses = [
  { title: "Equipamentos de proteção", description: "Escolha, uso e conservação dos EPIs na rotina de trabalho.", category: "EPIs", duration: 12, lessons: ["Escolha do equipamento|Confira o risco da atividade e use o EPI indicado para aquela tarefa.", "Uso correto e ajuste|Ajuste o equipamento antes de iniciar e verifique se está íntegro.", "Conservação e troca|Limpe, guarde no local correto e peça a substituição de itens danificados."] },
  { title: "Prevenção de acidentes", description: "Reconheça perigos e interrompa situações que possam causar acidentes.", category: "Prevenção", duration: 10, lessons: ["Identificação de riscos|Observe piso, máquinas, ferramentas e circulação antes de começar.", "Organização da área|Mantenha passagens livres e materiais guardados após o uso.", "Comunicação de incidentes|Comunique riscos, incidentes e quase acidentes ao responsável da unidade."] },
  { title: "Emergências e evacuação", description: "Saiba como reagir, comunicar e seguir a rota de saída em uma emergência.", category: "Emergência", duration: 8, lessons: ["Primeira resposta|Mantenha a calma, avise as pessoas próximas e acione o canal de emergência.", "Rota de evacuação|Siga a rota sinalizada e não use elevadores durante uma evacuação.", "Ponto de encontro|Dirija-se ao ponto indicado e aguarde instruções da equipe responsável."] },
  { title: "Segurança no manuseio de materiais", description: "Reduza o risco de lesões ao levantar, transportar e armazenar materiais.", category: "Operação", duration: 11, lessons: ["Avaliação da carga|Confira o peso, o formato e o caminho antes de mover um material.", "Movimentação segura|Use equipamento auxiliar ou peça ajuda para cargas pesadas e volumosas.", "Armazenamento estável|Empilhe dentro do limite e mantenha o material firme e organizado."] },
];

export function database() {
  if (!env.DB) throw new Error("Banco de dados indisponível. Configure o banco D1 do portal.");
  return env.DB;
}

export async function seedCourses(db: D1Database) {
  const row = await db.prepare("SELECT COUNT(*) AS total FROM training_courses WHERE active = 1").first<{ total: number }>();
  if ((row?.total ?? 0) > 0) return;
  const now = Date.now();
  await db.batch(starterCourses.map((course, index) => db.prepare("INSERT INTO training_courses (id, title, description, category, duration, lessons, active, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7)")
    .bind(`base-${index + 1}`, course.title, course.description, course.category, course.duration, JSON.stringify(course.lessons), now)));
}

export async function listCoursesForUser(db: D1Database, sub: string) {
  await seedCourses(db);
  const result = await db.prepare("SELECT c.id, c.title, c.description, c.category, c.duration, c.lessons, c.active, c.created_at, p.score, p.completed_at FROM training_courses c LEFT JOIN training_completions p ON p.course_id = c.id AND p.user_sub = ?1 WHERE c.active = 1 ORDER BY c.created_at, c.id")
    .bind(sub).all<Course & { score: number | null; completed_at: number | null }>();
  return result.results.map((course) => ({ ...course, lessons: JSON.parse(course.lessons) as string[], completed: course.completed_at !== null }));
}

