"use client";

import { useCallback, useEffect, useState } from "react";

type User = { name: string; email: string; admin: boolean };
type Course = {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  lessons: string[];
};
type Progress = { courseId: string; score: number; completedAt: number };
type CourseRow = Course & { completed: boolean; score: number | null };
type Stats = { people: number; completion: number; averageScore: number; courseStats: { id: string; title: string; done: number; total: number; score: number | null }[] };

const icon = (name: string) => {
  const paths: Record<string, string> = {
    shield: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z M9 12l2 2 4-4",
    book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z",
    chart: "M3 3v18h18 M18 17V9 M13 17V5 M8 17v-3",
    clock: "M12 8v4l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z",
    check: "m5 12 4 4L19 6",
    arrow: "M5 12h14 M12 5l7 7-7 7",
    plus: "M12 5v14 M5 12h14",
    logout: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9",
    back: "m15 18-6-6 6-6",
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? paths.shield} /></svg>;
};

function GoogleButton({ onSignIn, disabled }: { onSignIn: () => void; disabled: boolean }) {
  return <button type="button" className="google-button" onClick={onSignIn} disabled={disabled}>
    <svg aria-hidden="true" viewBox="0 0 48 48" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.89c-.58 2.96-2.26 5.47-4.71 7.16l7.63 5.92c4.45-4.11 7.17-10.17 7.17-17.55Z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.12.76-4.59l-7.98-6.2A23.95 23.95 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19Z"/><path fill="#34A853" d="M24 48c6.47 0 11.91-2.13 15.88-5.9l-7.63-5.92c-2.12 1.42-4.84 2.27-8.25 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z"/></svg>
    Entrar com Google Workspace
  </button>;
}

function CourseEditModal({ course, busy, error, onClose, onSave }: { course: CourseRow; busy: boolean; error: string; onClose: () => void; onSave: (form: FormData) => void }) {
  const lessonParts = (index: number) => {
    const [title = "", ...description] = (course.lessons[index] ?? "").split("|");
    return { title, description: description.join("|") };
  };

  return <div className="modal-backdrop" role="presentation"><form className="course-modal course-edit-modal" role="dialog" aria-modal="true" aria-labelledby="edit-course-title" onSubmit={(event) => { event.preventDefault(); onSave(new FormData(event.currentTarget)); }}>
    <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
    <p className="eyebrow">GESTÃO DE CONTEÚDO</p><h2 id="edit-course-title">Editar treinamento</h2>
    <p>Atualize os dados e as três etapas do treinamento. As conclusões e notas já registradas serão mantidas.</p>
    <label>Título<input name="title" required maxLength={100} defaultValue={course.title} /></label>
    <label>Descrição<textarea name="description" required maxLength={240} defaultValue={course.description} /></label>
    <div className="modal-row"><label>Categoria<input name="category" required maxLength={40} defaultValue={course.category} /></label><label>Duração (min)<input name="duration" type="number" min={1} max={240} defaultValue={course.duration} required /></label></div>
    <div className="lesson-editor-list">{[0, 1, 2].map((index) => { const lesson = lessonParts(index); return <fieldset className="lesson-editor" key={index}><legend>Etapa {index + 1}</legend><label>Nome da etapa<input name={`lessonTitle${index + 1}`} required maxLength={100} defaultValue={lesson.title} /></label><label>Conteúdo<textarea name={`lessonDescription${index + 1}`} required maxLength={500} defaultValue={lesson.description} /></label></fieldset>; })}</div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="edit-modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? "Salvando…" : "Salvar alterações"}</button></div>
  </form></div>;
}

function CourseCreateModal({ busy, error, onClose, onSave }: { busy: boolean; error: string; onClose: () => void; onSave: (form: FormData) => void }) {
  return <div className="modal-backdrop" role="presentation"><form className="course-modal course-edit-modal" role="dialog" aria-modal="true" aria-labelledby="new-course-title" onSubmit={(event) => { event.preventDefault(); onSave(new FormData(event.currentTarget)); }}>
    <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
    <p className="eyebrow">GESTÃO DE CONTEÚDO</p><h2 id="new-course-title">Novo treinamento</h2>
    <p>Cadastre o treinamento com três etapas e uma pergunta de avaliação por etapa.</p>
    <label>Título<input name="title" required maxLength={100} placeholder="Ex.: Trabalho em altura" /></label>
    <label>Descrição<textarea name="description" required maxLength={240} placeholder="O que a equipe vai aprender?" /></label>
    <div className="modal-row"><label>Categoria<input name="category" required maxLength={40} placeholder="Segurança operacional" /></label><label>Duração (min)<input name="duration" type="number" min={1} max={240} defaultValue={10} required /></label></div>
    <div className="lesson-editor-list">{[1, 2, 3].map((index) => <fieldset className="lesson-editor" key={index}><legend>Etapa {index}</legend><label>Nome da etapa<input name={`lessonTitle${index}`} required maxLength={100} placeholder={`Ex.: Procedimento seguro ${index}`} /></label><label>Conteúdo<textarea name={`lessonDescription${index}`} required maxLength={500} placeholder="Descreva a orientação que o colaborador deve aprender." /></label></fieldset>)}</div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="edit-modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={busy}>{busy ? "Salvando…" : "Cadastrar treinamento"}</button></div>
  </form></div>;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [active, setActive] = useState<CourseRow | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [tab, setTab] = useState<"courses" | "metrics">("courses");
  const [newCourse, setNewCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);

  const loadData = useCallback(async () => {
    const response = await fetch(user?.admin ? "/api/metrics" : "/api/courses", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível carregar seus treinamentos.");
    if (user?.admin) {
      setStats(data);
      setCourses(data.courses ?? []);
    } else setCourses(data.courses ?? []);
  }, [user]);

  useEffect(() => {
    let live = true;
    const ssoStatus = new URLSearchParams(window.location.search).get("sso");
    if (ssoStatus === "failed") setError("Não foi possível validar seu acesso. Inicie o login novamente ou fale com o administrador.");
    if (ssoStatus === "not-configured") setError("O login SAML ainda precisa ser configurado pelo administrador do portal.");
    if (ssoStatus) window.history.replaceState({}, "", window.location.pathname);
    fetch("/api/me", { cache: "no-store" }).then((r) => r.json()).then((data) => {
      if (live) setUser(data.user ?? null);
    }).catch(() => { if (live) setError("Não foi possível verificar o acesso. Tente novamente."); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!user) return;
    loadData().catch((e) => setError(e instanceof Error ? e.message : "Falha ao carregar os dados."));
  }, [user, loadData]);

  const signIn = () => { setError(""); setBusy(true); window.location.assign("/api/auth/saml/login"); };

  const completeCourse = async () => {
    if (!active || answers.length !== active.lessons.length) return;
    setBusy(true); setError("");
    const score = Math.round((answers.filter((answer) => answer === 0).length / active.lessons.length) * 100);
    try {
      const response = await fetch("/api/completions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: active.id, answers }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar a conclusão.");
      setActive(null); setAnswers([]); await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao registrar a avaliação."); }
    finally { setBusy(false); }
  };

  const saveCourse = async (form: FormData) => {
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const category = String(form.get("category") || "").trim();
    const duration = Number(form.get("duration") || 10);
    if (!title || !description || !category) return;
    const lessons = [1, 2, 3].map((index) => `${String(form.get(`lessonTitle${index}`) || "").trim()}|${String(form.get(`lessonDescription${index}`) || "").trim()}`);
    setBusy(true);
    try {
      const response = await fetch("/api/courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, category, duration, lessons }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar o treinamento.");
      setNewCourse(false); await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao cadastrar o treinamento."); }
    finally { setBusy(false); }
  };

  const updateCourse = async (course: CourseRow, form: FormData) => {
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const category = String(form.get("category") || "").trim();
    const duration = Number(form.get("duration") || 10);
    const lessons = [1, 2, 3].map((index) => `${String(form.get(`lessonTitle${index}`) || "").trim()}|${String(form.get(`lessonDescription${index}`) || "").trim()}`);
    if (!title || !description || !category) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/courses/${course.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, category, duration, lessons }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o treinamento.");
      setEditingCourse(null); await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao atualizar o treinamento."); }
    finally { setBusy(false); }
  };

  const signOut = async () => { await fetch("/api/auth/session", { method: "DELETE" }); setUser(null); setCourses([]); setStats(null); setTab("courses"); };

  if (loading) return <main className="loading-screen"><div className="brand-mark"><span className="brand-initials">CT</span></div><p>Preparando seus treinamentos…</p></main>;

  if (!user) return <main className="login-page">
    <aside className="login-art">
      <div className="brand"><div className="brand-mark"><span className="brand-initials">CT</span></div><span>Casa & Terra <small>TREINAMENTOS CORPORATIVOS</small></span></div>
      <div className="art-copy"><p className="eyebrow">APRENDER · PREVENIR · CUIDAR</p><h1>Segurança começa com conhecimento.</h1><p>Treinamentos práticos para uma operação mais segura, todos os dias.</p></div>
      <div className="art-orbit" aria-hidden="true"><div className="orbit-ring ring-one"></div><div className="orbit-ring ring-two"></div><div className="orbit-wordmark">C&amp;T<span>.tech</span></div><div className="orbit-dot dot-one"></div><div className="orbit-dot dot-two"></div><div className="orbit-dot dot-three"></div><div className="orbit-tag">SEGURANÇA EM FOCO</div></div>
      <div className="art-footer"><span>Formação contínua para equipes mais seguras.</span><span>CASA & TERRA</span></div>
    </aside>
    <section className="login-main"><div className="login-card">
      <div className="login-emblem"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></svg></div>
      <p className="eyebrow">PORTAL DO COLABORADOR</p><h2>Bem-vindo de volta</h2><p className="login-subtitle">Entre para acessar seus treinamentos e acompanhar seu progresso.</p>
      <GoogleButton onSignIn={signIn} disabled={busy} />
      {busy && <p className="signin-status">Redirecionando para o login corporativo…</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
    </div><footer className="login-bottom"><span>© 2026 Casa & Terra</span><span>Ambiente de aprendizagem e segurança</span></footer></section>
  </main>;

  if (active) return <main className="course-page"><header className="topbar"><button className="back-button" onClick={() => { setActive(null); setAnswers([]); }}><span>{icon("back")}</span> Voltar aos treinamentos</button><div className="brand brand-small"><div className="brand-mark"><span className="brand-initials">CT</span></div><span>Casa & Terra</span></div><button className="user-chip" onClick={signOut}>{user.name.split(" ")[0]} <span>{icon("logout")}</span></button></header><div className="lesson-wrap"><div className="lesson-meta"><span className="course-category">{active.category}</span><span><span className="meta-icon">{icon("clock")}</span>{active.duration} min</span></div><h1>{active.title}</h1><p className="lesson-intro">{active.description}</p><div className="lesson-list">{active.lessons.map((lesson, index) => <article className="lesson-card" key={lesson}><div className="lesson-number">{String(index + 1).padStart(2, "0")}</div><div><h2>{lesson.split("|")[0]}</h2><p>{lesson.split("|")[1]}</p></div><span className="lesson-check">{icon("check")}</span></article>)}</div><section className="assessment"><p className="eyebrow">VERIFICAÇÃO DE APRENDIZADO</p><h2>Marque a conduta mais segura em cada situação.</h2>{active.lessons.map((lesson, index) => <fieldset className="question" key={lesson}><legend>{index + 1}. {lesson.split("|")[0]}</legend><label><input type="radio" name={`q${index}`} checked={answers[index] === 0} onChange={() => setAnswers((prev) => Object.assign([...prev], { [index]: 0 }))} /> Seguir o procedimento seguro indicado no treinamento</label><label><input type="radio" name={`q${index}`} checked={answers[index] === 1} onChange={() => setAnswers((prev) => Object.assign([...prev], { [index]: 1 }))} /> Improvisar para terminar a tarefa mais rápido</label></fieldset>)}<button className="primary-button" disabled={answers.length !== active.lessons.length || busy} onClick={completeCourse}>{busy ? "Salvando avaliação…" : "Concluir treinamento"} <span>{icon("arrow")}</span></button>{error && <p className="error-message" role="alert">{error}</p>}</section></div></main>;

  return <main className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark"><span className="brand-initials">CT</span></div><span>Casa & Terra<small>TREINAMENTOS CORPORATIVOS</small></span></div><div className="sidebar-label">PORTAL</div><button className={`nav-item ${tab === "courses" ? "selected" : ""}`} onClick={() => setTab("courses")}><span>{icon("book")}</span>Meus treinamentos</button>{user.admin && <><div className="sidebar-label management-label">GESTÃO</div><button className={`nav-item ${tab === "metrics" ? "selected" : ""}`} onClick={() => setTab("metrics")}><span>{icon("chart")}</span>Métricas</button></>}<div className="sidebar-bottom"><div className="help-card"><div className="help-icon">!</div><strong>Dúvida ou sugestão?</strong><span>Fale com o responsável por segurança da sua unidade.</span></div><div className="side-user"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.admin ? "Gestor" : "Colaborador"}</span></div><button onClick={signOut} aria-label="Sair" title="Sair">{icon("logout")}</button></div></div></aside>
    <section className="workspace"><header className="workspace-top"><div className="breadcrumb">Casa & Terra <span>/</span> {tab === "metrics" ? "Métricas" : "Treinamentos"}</div><div className="workspace-user">Olá, {user.name.split(" ")[0]} <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div></div></header>
      {user.admin && tab === "metrics" && <section className="course-management"><div className="management-heading"><div><p className="eyebrow">GESTÃO DE CONTEÚDO</p><h2>Gerenciar treinamentos</h2><p>Edite os dados e as etapas disponíveis para a equipe.</p></div><button className="secondary-button" onClick={() => setNewCourse(true)}><span>{icon("plus")}</span>Novo treinamento</button></div><div className="management-list">{courses.map((course) => <article className="management-course" key={course.id}><div className="management-course-icon">{icon("book")}</div><div className="management-course-copy"><strong>{course.title}</strong><span>{course.category} · {course.duration} min</span></div><button className="table-action" onClick={() => setEditingCourse(course)}>Editar</button></article>)}{courses.length === 0 && <p className="empty-state">Nenhum treinamento cadastrado.</p>}</div></section>}
      {tab === "courses" ? <div className="content-area"><div className="page-heading"><div><p className="eyebrow">SUA JORNADA DE APRENDIZADO</p><h1>Meus treinamentos</h1><p className="heading-copy">Conhecimento que protege você e quem trabalha ao seu lado.</p></div><div className="heading-stamp"><span>+</span><div><strong>Segurança em primeiro lugar</strong><small>Um cuidado por vez, todos os dias.</small></div></div></div>
        <div className="progress-banner"><div className="progress-copy"><div className="progress-icon">{icon("shield")}</div><div><span>SEU PROGRESSO</span><strong>{courses.filter((c) => c.completed).length} de {courses.length} treinamentos concluídos</strong></div></div><div className="progress-track"><span style={{ width: `${courses.length ? (courses.filter((c) => c.completed).length / courses.length) * 100 : 0}%` }} /></div><span className="progress-percent">{courses.length ? Math.round((courses.filter((c) => c.completed).length / courses.length) * 100) : 0}%</span></div>
        <div className="section-title"><div><h2>Disponíveis para você</h2><p>Conteúdos rápidos e práticos para o seu dia a dia.</p></div><span className="course-count">{courses.length} {courses.length === 1 ? "treinamento" : "treinamentos"}</span></div>
        <div className="course-grid">{courses.map((course, index) => <article className="course-tile" key={course.id}><div className={`course-art art-${index % 4}`}><div className="art-lines"></div><div className="course-art-icon">{icon(index % 4 === 0 ? "shield" : index % 4 === 1 ? "book" : index % 4 === 2 ? "check" : "chart")}</div><span className="art-index">{String(index + 1).padStart(2, "0")}</span></div><div className="course-body"><div className="course-tags"><span className="course-category">{course.category}</span>{course.completed && <span className="completed-tag"><span>{icon("check")}</span> Concluído</span>}</div><h3>{course.title}</h3><p>{course.description}</p><div className="course-footer"><span><span className="meta-icon">{icon("clock")}</span>{course.duration} min</span>{course.completed && course.score !== null && <span className="score-tag">Nota {course.score}%</span>}</div><button className={course.completed ? "course-link completed-link" : "course-link"} onClick={() => { setActive(course); setAnswers([]); }}>{course.completed ? "Revisar treinamento" : "Começar treinamento"}<span>{icon("arrow")}</span></button></div></article>)}</div>{courses.length === 0 && <div className="empty-state">Os treinamentos aparecerão aqui assim que forem cadastrados.</div>}
        {error && <p className="error-message" role="alert">{error}</p>}<footer className="workspace-footer"><span>Em caso de risco iminente, interrompa a atividade e comunique seu responsável.</span><span>Casa & Terra · Segurança em foco</span></footer></div> : <div className="content-area metrics-area"><div className="page-heading"><div><p className="eyebrow">VISÃO DA EQUIPE</p><h1>Métricas de treinamento</h1><p className="heading-copy">Acompanhe o avanço e a nota das avaliações da equipe.</p></div><button className="secondary-button" onClick={() => setNewCourse(true)}><span>{icon("plus")}</span>Novo treinamento</button></div><div className="metric-cards"><article className="metric-card"><span>COLABORADORES AVALIADOS</span><strong>{stats?.people ?? 0}</strong><small>Pessoas com ao menos uma avaliação</small></article><article className="metric-card metric-accent"><span>TAXA DE CONCLUSÃO</span><strong>{stats?.completion ?? 0}<i>%</i></strong><div className="mini-bar"><span style={{ width: `${stats?.completion ?? 0}%` }} /></div></article><article className="metric-card"><span>NOTA MÉDIA</span><strong>{stats?.averageScore ?? 0}<i>%</i></strong><small>Média das avaliações concluídas</small></article></div><div className="metrics-table-card"><div className="table-heading"><div><h2>Conclusão por treinamento</h2><p>Compare a conclusão e a nota média por curso.</p></div><span className="live-pill"><i></i> Dados atualizados</span></div><div className="table-scroll"><table><thead><tr><th>TREINAMENTO</th><th>CONCLUÍDOS</th><th>CONCLUSÃO</th><th>NOTA MÉDIA</th></tr></thead><tbody>{stats?.courseStats?.map((course) => { const rate = course.total ? Math.round(course.done / course.total * 100) : 0; return <tr key={course.id}><td><strong>{course.title}</strong></td><td>{course.done} / {course.total}</td><td><div className="table-progress"><span><i style={{ width: `${rate}%` }} /></span>{rate}%</div></td><td>{course.score === null ? "—" : `${course.score}%`}</td></tr>; })}</tbody></table>{!stats?.courseStats?.length && <div className="empty-state">Nenhum curso cadastrado. Use “Novo treinamento” para começar.</div>}</div></div>{error && <p className="error-message" role="alert">{error}</p>}<footer className="workspace-footer"><span>Os indicadores usam apenas conclusões e notas registradas no portal.</span><span>Casa & Terra · Segurança em foco</span></footer></div>}
    </section>
    {editingCourse && <CourseEditModal course={editingCourse} busy={busy} error={error} onClose={() => setEditingCourse(null)} onSave={(form) => { void updateCourse(editingCourse, form); }} />}
    {newCourse && <CourseCreateModal busy={busy} error={error} onClose={() => setNewCourse(false)} onSave={(form) => { void saveCourse(form); }} />}
  </main>;
}
