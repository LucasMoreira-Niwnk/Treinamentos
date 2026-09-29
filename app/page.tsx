"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TrainingMedia, TrainingStep } from "../lib/training-content";

type User = { name: string; email: string; admin: boolean };
type Course = {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  coverImage: string;
  steps: TrainingStep[];
};
type Progress = { courseId: string; score: number; completedAt: number };
type CourseRow = Course & { completed: boolean; score: number | null };
type Stats = { people: number; completion: number; averageScore: number; totalCompleted: number; totalPossible: number; members: { name: string; email: string; lastSeenAt: number; done: number; total: number; courses: { courseId: string; title: string; active: boolean; score: number; completedAt: number }[] }[]; courseStats: { id: string; title: string; done: number; total: number; score: number | null }[] };

function formatDate(timestamp: number) {
  return timestamp ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(timestamp)) : "—";
}

function formatInlineText(text: string) {
  return text.split(/(\*\*.+?\*\*|__.+?__)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("__") && part.endsWith("__")) return <u key={index}>{part.slice(2, -2)}</u>;
    return part;
  });
}

function FormattedText({ text, className }: { text: string; className?: string }) {
  return <div className={className}>{text.split("\n").map((paragraph, index) => paragraph.trim() ? <p key={index}>{formatInlineText(paragraph)}</p> : <br key={index} />)}</div>;
}

function RichTextArea({ label, name, value, onChange, placeholder, maxLength, required = false, rows = 5 }: { label: string; name?: string; value: string; onChange: (value: string) => void; placeholder?: string; maxLength: number; required?: boolean; rows?: number }) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const applyFormat = (marker: "**" | "__") => {
    const input = inputRef.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = value.slice(start, end) || "texto";
    const next = `${value.slice(0, start)}${marker}${selected}${marker}${value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + marker.length, start + marker.length + selected.length);
    });
  };
  return <label>{label}<span className="text-format-toolbar" aria-label={`Formatação de ${label}`}><button type="button" title="Negrito" aria-label="Aplicar negrito" onClick={() => applyFormat("**")}><strong>B</strong></button><button type="button" title="Sublinhado" aria-label="Aplicar sublinhado" onClick={() => applyFormat("__")}><u>U</u></button><small>Selecione uma palavra ou trecho antes de formatar.</small></span><textarea ref={inputRef} name={name} required={required} maxLength={maxLength} rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function TrainingMediaViewer({ media, onClose }: { media: { url: string; kind: "image" | "video" } | null; onClose: () => void }) {
  const [originalSize, setOriginalSize] = useState(false);
  useEffect(() => {
    if (!media) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [media, onClose]);
  useEffect(() => setOriginalSize(false), [media?.url]);
  if (!media) return null;
  return <div className="media-viewer-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="media-viewer" role="dialog" aria-modal="true" aria-label={media.kind === "image" ? "Imagem ampliada" : "Vídeo ampliado"}><button type="button" className="media-viewer-close" onClick={onClose} aria-label="Fechar visualização">×</button>{media.kind === "image" ? <div className={`media-viewer-image-wrap ${originalSize ? "original-size" : ""}`}><img src={media.url} alt="Imagem do conteúdo do treinamento" onClick={() => setOriginalSize((current) => !current)} title="Clique para alternar entre ajustar à tela e resolução original" /></div> : <video className="media-viewer-video" src={media.url} controls autoPlay preload="metadata" />}<div className="media-viewer-actions">{media.kind === "image" && <button type="button" className="cancel-button" onClick={() => setOriginalSize((current) => !current)}>{originalSize ? "Ajustar à tela" : "Ver resolução original"}</button>}<a href={media.url} target="_blank" rel="noreferrer">Abrir em nova aba</a></div></section></div>;
}

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

function CourseBuilderModal({ course, busy, error, onClose, onSave }: { course?: CourseRow; busy: boolean; error: string; onClose: () => void; onSave: (form: FormData, steps: TrainingStep[], coverImage: string) => void }) {
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [coverImage, setCoverImage] = useState(course?.coverImage ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [coverUploading, setCoverUploading] = useState(false);
  const [steps, setSteps] = useState<TrainingStep[]>(() => {
    const initial = course?.steps ?? [
      { id: crypto.randomUUID(), type: "content" as const, title: "Introdução do módulo", content: "" },
      { id: crypto.randomUUID(), type: "quiz" as const, question: "", options: ["", ""], correctAnswer: 0, explanation: "" },
    ];
    return initial.some((step) => step.type === "completion") ? initial : [...initial, { id: crypto.randomUUID(), type: "completion", title: "Obrigado por concluir!", content: "Agradecemos por dedicar seu tempo a este treinamento. Leve esse aprendizado para sua rotina." }];
  });
  const move = (index: number, direction: -1 | 1) => setSteps((current) => {
    const next = [...current]; const target = index + direction;
    if (target < 0 || target >= next.length || next[index]?.type === "completion" || next[target]?.type === "completion") return current;
    [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const patchStep = (index: number, patch: Partial<TrainingStep>) => setSteps((current) => current.map((step, i) => i === index ? { ...step, ...patch } as TrainingStep : step));
  const uploadMedia = async (stepId: string, file: File) => {
    const form = new FormData(); form.set("file", file);
    setUploadErrors((current) => ({ ...current, [stepId]: "" }));
    setUploading((current) => ({ ...current, [stepId]: true }));
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível anexar o arquivo.");
      const media = data.media as TrainingMedia;
      setSteps((current) => current.map((step) => {
        if (step.id !== stepId) return step;
        if (step.type === "content") return { ...step, media: [...(step.media ?? []), media] };
        if (step.type === "completion" && media.kind === "video") return { ...step, video: media };
        return step;
      }));
    } catch (uploadError) {
      setUploadErrors((current) => ({ ...current, [stepId]: uploadError instanceof Error ? uploadError.message : "Não foi possível anexar o arquivo." }));
    } finally { setUploading((current) => ({ ...current, [stepId]: false })); }
  };
  const uploadCover = async (file: File) => {
    const form = new FormData(); form.set("file", file); setCoverUploading(true); setUploadErrors((current) => ({ ...current, cover: "" }));
    try {
      const response = await fetch("/api/uploads", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível enviar a capa.");
      if (data.media?.kind !== "image") throw new Error("A capa precisa ser uma imagem.");
      setCoverImage(data.media.url);
    } catch (uploadError) { setUploadErrors((current) => ({ ...current, cover: uploadError instanceof Error ? uploadError.message : "Falha ao enviar a capa." })); }
    finally { setCoverUploading(false); }
  };
  const addStep = (type: "content" | "quiz") => setSteps((current) => {
    const step: TrainingStep = type === "content"
      ? { id: crypto.randomUUID(), type, title: "", content: "" }
      : { id: crypto.randomUUID(), type, question: "", options: ["", ""], correctAnswer: 0, explanation: "" };
    const next = [...current];
    const closingIndex = next.findIndex((item) => item.type === "completion");
    const end = closingIndex >= 0 ? closingIndex : next.length;
    const insertAt = type === "content" && next[end - 1]?.type === "quiz" ? end - 1 : end;
    next.splice(insertAt, 0, step);
    return next;
  });
  return <div className="modal-backdrop" role="presentation"><form className="course-modal course-edit-modal" role="dialog" aria-modal="true" aria-labelledby="builder-title" onSubmit={(event) => { event.preventDefault(); onSave(new FormData(event.currentTarget), steps, coverImage); }}>
    <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">×</button>
    <p className="eyebrow">GESTÃO DE CONTEÚDO</p><h2 id="builder-title">{course ? "Editar treinamento" : "Novo treinamento"}</h2>
    <p>Monte o treinamento na ordem desejada, alternando explicações e quizzes. Cada quiz deve ter pelo menos duas opções.</p>
    <label>Título<input name="title" required maxLength={100} defaultValue={course?.title} placeholder="Ex.: Segurança contra phishing" /></label>
    <RichTextArea label="Descrição" name="description" required maxLength={240} value={description} onChange={setDescription} placeholder="O que a equipe vai aprender?" rows={3} />
    <div className="modal-row"><label>Categoria<input name="category" required maxLength={40} defaultValue={course?.category} placeholder="Segurança digital" /></label><label>Duração (min)<input name="duration" type="number" min={1} max={240} defaultValue={course?.duration ?? 10} required /></label></div>
    <section className="cover-editor"><div><strong>Banner do treinamento</strong><span>Imagem de capa exibida no cartão em “Meus treinamentos”.</span></div>{coverImage && <img src={coverImage} alt="Prévia do banner do treinamento" />}<div className="cover-actions"><label className="media-upload-button">{coverUploading ? "Enviando imagem…" : coverImage ? "Trocar banner" : "+ Adicionar banner"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={coverUploading} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void uploadCover(file); }} /></label>{coverImage && <button type="button" className="cancel-button" onClick={() => setCoverImage("")}>Remover banner</button>}</div>{uploadErrors.cover && <p className="error-message" role="alert">{uploadErrors.cover}</p>}</section>
    <div className="builder-steps"><h3>Etapas do treinamento</h3>{steps.map((step, index) => <fieldset className="lesson-editor builder-step" key={step.id}>
      <legend>{index + 1}. {step.type === "content" ? "Explicação" : step.type === "quiz" ? "Quiz de fixação" : "Conclusão"}</legend>
      <div className="step-tools"><button type="button" onClick={() => move(index, -1)} disabled={index === 0 || step.type === "completion" || steps[index - 1]?.type === "completion"} aria-label="Mover etapa para cima">↑</button><button type="button" onClick={() => move(index, 1)} disabled={index === steps.length - 1 || step.type === "completion" || steps[index + 1]?.type === "completion"} aria-label="Mover etapa para baixo">↓</button>{step.type !== "completion" && <button type="button" className="remove-step" onClick={() => setSteps((current) => current.filter((_, i) => i !== index))}>Remover</button>}</div>
      {step.type === "content" ? <>
        <label>Título da explicação<input required maxLength={100} value={step.title} onChange={(event) => patchStep(index, { title: event.target.value })} placeholder="Ex.: Verificar o domínio da mensagem" /></label>
        <RichTextArea label="Conteúdo" required maxLength={5000} value={step.content} onChange={(content) => patchStep(index, { content })} placeholder="Explique o procedimento e os sinais que a pessoa deve observar." />
        <div className="media-manager"><div><strong>Imagens e vídeos</strong><span>Até 10 arquivos por explicação · Imagem até 10 MB · Vídeo até 100 MB (MP4 ou WebM)</span></div><label className="media-upload-button">{uploading[step.id] ? "Enviando arquivo…" : (step.media?.length ?? 0) >= 10 ? "Limite de anexos atingido" : "+ Anexar arquivo"}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" disabled={uploading[step.id] || (step.media?.length ?? 0) >= 10} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void uploadMedia(step.id, file); }} /></label>{uploadErrors[step.id] && <p className="error-message" role="alert">{uploadErrors[step.id]}</p>}{step.media?.length ? <div className="media-preview-list">{step.media.map((media, mediaIndex) => <div className="media-preview" key={`${media.url}-${mediaIndex}`}>{media.kind === "image" ? <img src={media.url} alt={media.name} /> : <video src={media.url} controls preload="metadata" /> }<span title={media.name}>{media.name}</span><button type="button" onClick={() => patchStep(index, { media: step.media?.filter((_, itemIndex) => itemIndex !== mediaIndex) })} aria-label={`Remover ${media.name}`}>Remover</button></div>)}</div> : <p className="media-empty">Nenhum arquivo anexado a esta explicação.</p>}</div>
      </> : step.type === "quiz" ? <>
        <label>Pergunta<input required maxLength={500} value={step.question} onChange={(event) => patchStep(index, { question: event.target.value })} placeholder="Qual sinal pode indicar uma tentativa de phishing?" /></label>
        <div className="option-editor"><span>Alternativas — selecione a correta</span>{step.options.map((option, optionIndex) => <div className="option-row" key={optionIndex}><input type="radio" name={`correct-${step.id}`} checked={step.correctAnswer === optionIndex} onChange={() => patchStep(index, { correctAnswer: optionIndex })} aria-label={`Alternativa ${optionIndex + 1} é correta`} /><input required maxLength={300} value={option} onChange={(event) => patchStep(index, { options: step.options.map((item, i) => i === optionIndex ? event.target.value : item) })} placeholder={`Alternativa ${optionIndex + 1}`} />{step.options.length > 2 && <button type="button" onClick={() => patchStep(index, { options: step.options.filter((_, i) => i !== optionIndex), correctAnswer: step.correctAnswer === optionIndex ? 0 : step.correctAnswer > optionIndex ? step.correctAnswer - 1 : step.correctAnswer })} aria-label="Remover alternativa">×</button>}</div>)}{step.options.length < 5 && <button type="button" className="add-option" onClick={() => patchStep(index, { options: [...step.options, ""] })}>+ Adicionar alternativa</button>}</div>
        <RichTextArea label="Explicação da resposta correta (opcional)" maxLength={500} value={step.explanation ?? ""} onChange={(explanation) => patchStep(index, { explanation })} placeholder="Explique por que essa é a resposta mais segura." rows={3} />
      </> : <>
        <p className="completion-editor-hint">Esta tela aparece após a aprovação do treinamento.</p>
        <label>Título da conclusão<input required maxLength={100} value={step.title} onChange={(event) => patchStep(index, { title: event.target.value })} placeholder="Obrigado por concluir!" /></label>
        <RichTextArea label="Mensagem de agradecimento" maxLength={5000} value={step.content} onChange={(content) => patchStep(index, { content })} placeholder="Agradeça ao colaborador e reforce a importância do aprendizado." />
        <div className="media-manager"><div><strong>Vídeo de conclusão (opcional)</strong><span>Envie um vídeo MP4 ou WebM · até 100 MB</span></div><label className="media-upload-button">{uploading[step.id] ? "Enviando vídeo…" : step.video ? "Trocar vídeo" : "+ Anexar vídeo"}<input type="file" accept="video/mp4,video/webm" disabled={uploading[step.id]} onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void uploadMedia(step.id, file); }} /></label>{uploadErrors[step.id] && <p className="error-message" role="alert">{uploadErrors[step.id]}</p>}{step.video ? <div className="media-preview-list"><div className="media-preview"><video src={step.video.url} controls preload="metadata" /><span title={step.video.name}>{step.video.name}</span><button type="button" onClick={() => patchStep(index, { video: undefined })}>Remover</button></div></div> : <p className="media-empty">Nenhum vídeo anexado.</p>}</div>
      </>}
    </fieldset>)}<div className="add-step-actions"><button type="button" className="cancel-button" onClick={() => addStep("content")}>+ Adicionar explicação</button><button type="button" className="cancel-button" onClick={() => addStep("quiz")}>+ Adicionar quiz</button></div></div>
    {error && <p className="error-message" role="alert">{error}</p>}
    <div className="edit-modal-actions"><button type="button" className="cancel-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={busy || coverUploading || Object.values(uploading).some(Boolean)}>{coverUploading || Object.values(uploading).some(Boolean) ? "Aguarde o envio dos anexos…" : busy ? "Salvando…" : course ? "Salvar alterações" : "Cadastrar treinamento"}</button></div>
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
  const [mediaViewer, setMediaViewer] = useState<{ url: string; kind: "image" | "video" } | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [quizResult, setQuizResult] = useState<{ score: number; correct: number; incorrect: number; total: number; passed: boolean; results: { question: string; selectedAnswer: number; correctAnswer: number; correct: boolean; explanation: string }[] } | null>(null);
  const [tab, setTab] = useState<"courses" | "metrics">("courses");
  const [newCourse, setNewCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<CourseRow | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPage, setMemberPage] = useState(1);

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

  useEffect(() => { setMemberPage(1); }, [memberSearch]);

  const signIn = () => { setError(""); setBusy(true); window.location.assign("/api/auth/saml/login"); };

  const completeCourse = async () => {
    if (!active) return;
    const quizSteps = active.steps.filter((step) => step.type === "quiz");
    if (quizSteps.some((step) => answers[step.id] === undefined)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/completions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ courseId: active.id, answers: quizSteps.map((step) => answers[step.id]) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar a avaliação.");
      setQuizResult(data);
      if (data.passed) await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao registrar a avaliação."); }
    finally { setBusy(false); }
  };

  const saveCourse = async (form: FormData, steps: TrainingStep[], coverImage: string) => {
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const category = String(form.get("category") || "").trim();
    const duration = Number(form.get("duration") || 10);
    if (!title || !description || !category) return;
    setBusy(true);
    try {
      const response = await fetch("/api/courses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, category, duration, coverImage, steps }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar o treinamento.");
      setNewCourse(false); await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao cadastrar o treinamento."); }
    finally { setBusy(false); }
  };

  const updateCourse = async (course: CourseRow, form: FormData, steps: TrainingStep[], coverImage: string) => {
    const title = String(form.get("title") || "").trim();
    const description = String(form.get("description") || "").trim();
    const category = String(form.get("category") || "").trim();
    const duration = Number(form.get("duration") || 10);
    if (!title || !description || !category) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/courses/${course.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, category, duration, coverImage, steps }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o treinamento.");
      setEditingCourse(null); await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao atualizar o treinamento."); }
    finally { setBusy(false); }
  };

  const deleteCourse = async (course: CourseRow) => {
    if (!window.confirm(`Excluir o treinamento “${course.title}”? Ele deixará de aparecer para os colaboradores. O histórico de conclusões será mantido.`)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/courses/${course.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível excluir o treinamento.");
      await loadData();
    } catch (e) { setError(e instanceof Error ? e.message : "Falha ao excluir o treinamento."); }
    finally { setBusy(false); }
  };

  const exportMemberReport = () => {
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = [["Nome", "E-mail", "Último login", "Cursos aprovados", "Notas por curso", "Datas de conclusão"]];
    for (const member of stats?.members ?? []) {
      const courseNames = member.courses.map((course) => `${course.title}${course.active ? "" : " (arquivado)"}`).join(" | ") || "Nenhum curso aprovado";
      const scores = member.courses.map((course) => `${course.title}: ${course.score}%`).join(" | ") || "—";
      const dates = member.courses.map((course) => `${course.title}: ${formatDate(course.completedAt)}`).join(" | ") || "—";
      rows.push([member.name, member.email, formatDate(member.lastSeenAt), courseNames, scores, dates]);
    }
    const csv = `\uFEFF${rows.map((row) => row.map(escapeCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `relatorio-treinamentos-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const signOut = async () => { await fetch("/api/auth/session", { method: "DELETE" }); setUser(null); setCourses([]); setStats(null); setTab("courses"); };

  const allMembers = stats?.members ?? [];
  const filteredMembers = allMembers.filter((member) => `${member.name} ${member.email}`.toLocaleLowerCase("pt-BR").includes(memberSearch.trim().toLocaleLowerCase("pt-BR")));
  const memberPageSize = 10;
  const memberPageCount = Math.max(1, Math.ceil(filteredMembers.length / memberPageSize));
  const safeMemberPage = Math.min(memberPage, memberPageCount);
  const visibleMembers = filteredMembers.slice((safeMemberPage - 1) * memberPageSize, safeMemberPage * memberPageSize);

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

  if (active) {
    const lessonSteps = active.steps.filter((item) => item.type !== "completion");
    const completionStep = active.steps.find((item) => item.type === "completion");
    const step = lessonSteps[stepIndex];
    const quizSteps = active.steps.filter((item) => item.type === "quiz");
    const answeredCount = quizSteps.filter((item) => answers[item.id] !== undefined).length;
    const resetPlayer = () => { setActive(null); setAnswers({}); setStepIndex(0); setQuizResult(null); setError(""); };
    const restartPlayer = () => { setAnswers({}); setStepIndex(0); setQuizResult(null); setError(""); };
    const advance = () => {
      if (step?.type === "quiz" && answers[step.id] === undefined) { setError("Selecione uma alternativa para continuar."); return; }
      setError("");
      if (stepIndex === lessonSteps.length - 1) { void completeCourse(); return; }
      setStepIndex((index) => index + 1);
    };
    return <main className="course-page"><header className="topbar"><button className="back-button" onClick={resetPlayer}><span>{icon("back")}</span> Voltar aos treinamentos</button><div className="brand brand-small"><div className="brand-mark"><span className="brand-initials">CT</span></div><span>Casa & Terra</span></div><button className="user-chip" onClick={signOut}>{user.name.split(" ")[0]} <span>{icon("logout")}</span></button></header>
      <div className="lesson-wrap"><div className="lesson-meta"><span className="course-category">{active.category}</span><span><span className="meta-icon">{icon("clock")}</span>{active.duration} min</span></div><h1>{active.title}</h1><p className="lesson-intro">{formatInlineText(active.description)}</p>
        {quizResult ? quizResult.passed && completionStep?.type === "completion" ? <section className="assessment result-card result-passed completion-screen"><p className="eyebrow">TREINAMENTO CONCLUÍDO</p><h2>{completionStep.title}</h2>{completionStep.content && <FormattedText className="training-copy" text={completionStep.content} />}{completionStep.video && <div className="training-media-list"><figure><video src={completionStep.video.url} controls autoPlay preload="metadata" /><button type="button" className="media-expand-button" onClick={() => setMediaViewer({ url: completionStep.video!.url, kind: "video" })}>Assistir em tela grande</button></figure></div>}<div className="completion-score"><span>Nota final</span><strong>{quizResult.score}%</strong><small>{quizResult.correct} acertos de {quizResult.total} questões</small></div><button className="primary-button" onClick={resetPlayer}>Voltar aos treinamentos <span>{icon("check")}</span></button></section> : <section className={`assessment result-card ${quizResult.passed ? "result-passed" : "result-failed"}`}><p className="eyebrow">RESULTADO DO TREINAMENTO</p><h2>{quizResult.passed ? "Treinamento aprovado" : "Você ainda não atingiu a nota mínima"}</h2><p className="result-score">{quizResult.score}% <span>de acertos</span></p><div className="result-counts"><span>Acertos <strong>{quizResult.correct}</strong></span><span>Erros <strong>{quizResult.incorrect}</strong></span><span>Total <strong>{quizResult.total}</strong></span></div><p className="result-threshold">Aprovação: 75% de acertos. {quizResult.passed ? "Sua conclusão foi registrada." : "Revise o conteúdo e tente novamente."}</p><div className="result-details">{quizResult.results.map((item, index) => <article key={index} className={item.correct ? "answer-correct" : "answer-incorrect"}><strong>{index + 1}. {item.correct ? "Resposta correta" : "Resposta incorreta"}</strong>{!item.correct && <span>Resposta correta: {formatInlineText(active.steps.filter((entry) => entry.type === "quiz")[index]?.options[item.correctAnswer] ?? "")}</span>}{item.explanation && <p>{formatInlineText(item.explanation)}</p>}</article>)}</div><button className="primary-button" onClick={quizResult.passed ? resetPlayer : restartPlayer}>{quizResult.passed ? "Voltar aos treinamentos" : "Tentar novamente"} <span>{icon(quizResult.passed ? "check" : "arrow")}</span></button></section>
        : <><div className="training-progress"><div><span>ETAPA {stepIndex + 1} DE {lessonSteps.length}</span><span>{answeredCount} de {quizSteps.length} quizzes respondidos</span></div><span className="training-progress-track"><i style={{ width: `${Math.round((stepIndex + 1) / lessonSteps.length * 100)}%` }} /></span></div><section className="assessment training-step-card">{step?.type === "content" ? <><p className="eyebrow">CONTEÚDO DO MÓDULO</p><h2>{step.title}</h2><FormattedText className="training-copy" text={step.content} />{step.media?.length ? <div className="training-media-list">{step.media.map((media) => <figure key={media.url}>{media.kind === "image" ? <button type="button" className="training-image-button" onClick={() => setMediaViewer({ url: media.url, kind: "image" })} aria-label="Ampliar imagem do treinamento"><img src={media.url} alt="" /><span>Ampliar imagem</span></button> : <><video src={media.url} controls preload="metadata" /><button type="button" className="media-expand-button" onClick={() => setMediaViewer({ url: media.url, kind: "video" })}>Assistir em tela grande</button></>}</figure>)}</div> : null}</> : step?.type === "quiz" ? <><p className="eyebrow">QUIZ DE FIXAÇÃO</p><h2>{formatInlineText(step.question)}</h2><div className="learner-options">{step.options.map((option, index) => <label className={answers[step.id] === index ? "option-selected" : ""} key={index}><input type="radio" name={`quiz-${step.id}`} checked={answers[step.id] === index} onChange={() => { setAnswers((previous) => ({ ...previous, [step.id]: index })); setError(""); }} /><span className="option-letter">{String.fromCharCode(65 + index)}</span>{formatInlineText(option)}</label>)}</div></> : null}{error && <p className="error-message" role="alert">{error}</p>}<button className="primary-button" disabled={busy || (step?.type === "quiz" && answers[step.id] === undefined)} onClick={advance}>{busy ? "Calculando resultado…" : stepIndex === lessonSteps.length - 1 ? "Ver resultado" : "Continuar"}<span>{icon("arrow")}</span></button></section><p className="pass-reminder">Para concluir, é necessário acertar pelo menos 75% das questões.</p></>}
      </div><TrainingMediaViewer media={mediaViewer} onClose={() => setMediaViewer(null)} /></main>;
  }

  return <main className="app-shell"><aside className="sidebar"><div className="brand"><div className="brand-mark"><span className="brand-initials">CT</span></div><span>Casa & Terra<small>TREINAMENTOS CORPORATIVOS</small></span></div><div className="sidebar-label">PORTAL</div><button className={`nav-item ${tab === "courses" ? "selected" : ""}`} onClick={() => setTab("courses")}><span>{icon("book")}</span>Meus treinamentos</button>{user.admin && <><div className="sidebar-label management-label">GESTÃO</div><button className={`nav-item ${tab === "metrics" ? "selected" : ""}`} onClick={() => setTab("metrics")}><span>{icon("chart")}</span>Métricas</button></>}<div className="sidebar-bottom"><div className="help-card"><div className="help-icon">!</div><strong>Dúvida ou sugestão?</strong><span>Fale com o responsável por segurança da sua unidade.</span></div><div className="side-user"><div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div><div><strong>{user.name}</strong><span>{user.admin ? "Gestor" : "Colaborador"}</span></div><button onClick={signOut} aria-label="Sair" title="Sair">{icon("logout")}</button></div></div></aside>
    <section className="workspace"><header className="workspace-top"><div className="breadcrumb">Casa & Terra <span>/</span> {tab === "metrics" ? "Métricas" : "Treinamentos"}</div><div className="workspace-user">Olá, {user.name.split(" ")[0]} <div className="avatar">{user.name.slice(0, 1).toUpperCase()}</div></div></header>
      {user.admin && tab === "metrics" && <section className="course-management"><div className="management-heading"><div><p className="eyebrow">GESTÃO DE CONTEÚDO</p><h2>Gerenciar treinamentos</h2><p>Edite os dados e as etapas disponíveis para a equipe.</p></div><button className="secondary-button" onClick={() => setNewCourse(true)}><span>{icon("plus")}</span>Novo treinamento</button></div><div className="management-list">{courses.map((course) => <article className="management-course" key={course.id}><div className="management-course-icon">{icon("book")}</div><div className="management-course-copy"><strong>{course.title}</strong><span>{course.category} · {course.duration} min</span></div><div className="management-course-actions"><button className="table-action" onClick={() => setEditingCourse(course)}>Editar</button><button className="table-action danger-action" disabled={busy} onClick={() => void deleteCourse(course)}>Excluir</button></div></article>)}{courses.length === 0 && <p className="empty-state">Nenhum treinamento cadastrado.</p>}</div></section>}
      {tab === "courses" ? <div className="content-area"><div className="page-heading"><div><p className="eyebrow">SUA JORNADA DE APRENDIZADO</p><h1>Meus treinamentos</h1><p className="heading-copy">Conhecimento que protege você e quem trabalha ao seu lado.</p></div><div className="heading-stamp"><span>+</span><div><strong>Segurança em primeiro lugar</strong><small>Um cuidado por vez, todos os dias.</small></div></div></div>
        <div className="progress-banner"><div className="progress-copy"><div className="progress-icon">{icon("shield")}</div><div><span>SEU PROGRESSO</span><strong>{courses.filter((c) => c.completed).length} de {courses.length} treinamentos concluídos</strong></div></div><div className="progress-track"><span style={{ width: `${courses.length ? (courses.filter((c) => c.completed).length / courses.length) * 100 : 0}%` }} /></div><span className="progress-percent">{courses.length ? Math.round((courses.filter((c) => c.completed).length / courses.length) * 100) : 0}%</span></div>
        <div className="section-title"><div><h2>Disponíveis para você</h2><p>Conteúdos rápidos e práticos para o seu dia a dia.</p></div><span className="course-count">{courses.length} {courses.length === 1 ? "treinamento" : "treinamentos"}</span></div>
        <div className="course-grid">{courses.map((course, index) => <article className="course-tile" key={course.id}><div className={`course-art art-${index % 4} ${course.coverImage ? "has-cover" : ""}`}>{course.coverImage && <img className="course-cover-image" src={course.coverImage} alt="" />}<div className="art-lines"></div><div className="course-art-icon">{icon(index % 4 === 0 ? "shield" : index % 4 === 1 ? "book" : index % 4 === 2 ? "check" : "chart")}</div></div><div className="course-body"><div className="course-tags"><span className="course-category">{course.category}</span>{course.completed && <span className="completed-tag"><span>{icon("check")}</span> Concluído</span>}</div><h3>{course.title}</h3><p>{formatInlineText(course.description)}</p><div className="course-footer"><span><span className="meta-icon">{icon("clock")}</span>{course.duration} min</span>{course.completed && course.score !== null && <span className="score-tag">Nota {course.score}%</span>}</div><button className={course.completed ? "course-link completed-link" : "course-link"} onClick={() => { setActive(course); setAnswers({}); setStepIndex(0); setQuizResult(null); setError(""); }}>{course.completed ? "Revisar treinamento" : "Começar treinamento"}<span>{icon("arrow")}</span></button></div></article>)}</div>{courses.length === 0 && <div className="empty-state">Os treinamentos aparecerão aqui assim que forem cadastrados.</div>}
        {error && <p className="error-message" role="alert">{error}</p>}<footer className="workspace-footer"><span>Em caso de risco iminente, interrompa a atividade e comunique seu responsável.</span><span>Casa & Terra · Segurança em foco</span></footer></div> : <div className="content-area metrics-area"><div className="page-heading"><div><p className="eyebrow">VISÃO DA EQUIPE</p><h1>Métricas de treinamento</h1><p className="heading-copy">Acompanhe o avanço e a nota das avaliações da equipe.</p></div><button className="secondary-button" onClick={() => setNewCourse(true)}><span>{icon("plus")}</span>Novo treinamento</button></div><div className="metric-cards"><article className="metric-card"><span>COLABORADORES COM LOGIN</span><strong>{stats?.people ?? 0}</strong><small>Contas que já acessaram o portal</small></article><article className="metric-card metric-accent"><span>TAXA DE CONCLUSÃO</span><strong>{stats?.completion ?? 0}<i>%</i></strong><div className="mini-bar"><span style={{ width: `${stats?.completion ?? 0}%` }} /></div></article><article className="metric-card"><span>NOTA MÉDIA</span><strong>{stats?.averageScore ?? 0}<i>%</i></strong><small>Média das avaliações aprovadas</small></article><article className="metric-card"><span>CURSOS CONCLUÍDOS</span><strong>{stats?.totalCompleted ?? 0}</strong><small>de {stats?.totalPossible ?? 0} conclusões possíveis</small></article></div><div className="metrics-table-card"><div className="table-heading"><div><h2>Conclusão por treinamento</h2><p>Compare a conclusão e a nota média por curso.</p></div><span className="live-pill"><i></i> Dados atualizados</span></div><div className="table-scroll"><table><thead><tr><th>TREINAMENTO</th><th>CONCLUÍDOS</th><th>CONCLUSÃO</th><th>NOTA MÉDIA</th></tr></thead><tbody>{stats?.courseStats?.map((course) => { const rate = course.total ? Math.round(course.done / course.total * 100) : 0; return <tr key={course.id}><td><strong>{course.title}</strong></td><td>{course.done} / {course.total}</td><td><div className="table-progress"><span><i style={{ width: `${rate}%` }} /></span>{rate}%</div></td><td>{course.score === null ? "—" : `${course.score}%`}</td></tr>; })}</tbody></table>{!stats?.courseStats?.length && <div className="empty-state">Nenhum curso cadastrado. Use “Novo treinamento” para começar.</div>}</div></div><section className="metrics-table-card members-card"><div className="table-heading"><div><h2>Colaboradores e progresso individual</h2><p>Expanda uma pessoa para consultar seus cursos aprovados, notas e datas.</p></div><div className="member-tools"><label className="member-search">Pesquisar por nome ou e-mail<input type="search" value={memberSearch} onChange={(event) => setMemberSearch(event.target.value)} placeholder="Ex.: Ana ou ana@empresa.com" /></label><button type="button" className="secondary-button member-export" onClick={exportMemberReport} disabled={!allMembers.length}>Exportar CSV</button><span className="live-pill">{stats?.members.length ?? 0} com login</span></div></div><div className="table-scroll"><table><thead><tr><th>COLABORADOR</th><th>CURSOS CONCLUÍDOS</th><th>ÚLTIMO LOGIN</th></tr></thead><tbody>{visibleMembers.map((member) => <tr key={member.email}><td><details className="member-details"><summary><span><strong>{member.name}</strong><small>{member.email}</small></span><span className="member-expand-label">Ver detalhes</span></summary><div className="member-course-details"><p>Treinamentos aprovados: <strong>{member.done} de {member.total}</strong></p>{member.courses.length ? <ul>{member.courses.map((course) => <li key={course.courseId}><span>{course.title}{!course.active && <em> · Arquivado</em>}</span><strong>Nota {course.score}%</strong><time>{formatDate(course.completedAt)}</time></li>)}</ul> : <p className="member-no-courses">Ainda não há treinamentos aprovados.</p>}</div></details></td><td>{member.done} / {member.total}</td><td>{formatDate(member.lastSeenAt)}</td></tr>)}</tbody></table>{!allMembers.length ? <div className="empty-state">Nenhum colaborador acessou a plataforma até agora.</div> : !visibleMembers.length ? <div className="empty-state">Nenhum colaborador corresponde à pesquisa.</div> : null}</div><div className="member-pagination"><span>Exibindo {filteredMembers.length ? (safeMemberPage - 1) * memberPageSize + 1 : 0}–{Math.min(safeMemberPage * memberPageSize, filteredMembers.length)} de {filteredMembers.length} colaboradores</span><div><button type="button" className="cancel-button" disabled={safeMemberPage <= 1} onClick={() => setMemberPage((page) => Math.max(1, page - 1))}>Anterior</button><span>Página {safeMemberPage} de {memberPageCount}</span><button type="button" className="cancel-button" disabled={safeMemberPage >= memberPageCount} onClick={() => setMemberPage((page) => Math.min(memberPageCount, page + 1))}>Próxima</button></div></div></section>{error && <p className="error-message" role="alert">{error}</p>}<footer className="workspace-footer"><span>Os indicadores usam apenas conclusões e notas registradas no portal.</span><span>Casa & Terra · Segurança em foco</span></footer></div>}
    </section>
    {editingCourse && <CourseBuilderModal key={editingCourse.id} course={editingCourse} busy={busy} error={error} onClose={() => setEditingCourse(null)} onSave={(form, steps, coverImage) => { void updateCourse(editingCourse, form, steps, coverImage); }} />}
    {newCourse && <CourseBuilderModal key="new-course" busy={busy} error={error} onClose={() => setNewCourse(false)} onSave={(form, steps, coverImage) => { void saveCourse(form, steps, coverImage); }} />}
  </main>;
}
