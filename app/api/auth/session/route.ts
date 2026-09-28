import { createSession, isAuthConfigured, sessionCookie } from "../../../../lib/auth";
import { env } from "cloudflare:workers";

export async function POST(request: Request) {
  if (!isAuthConfigured()) return Response.json({ error: "O login ainda precisa ser configurado pelo administrador do portal." }, { status: 503 });
  try {
    const payload = await request.json() as { credential?: string };
    if (!payload.credential) return Response.json({ error: "Credencial Google ausente." }, { status: 400 });
    const { response, user } = await createSession(request, payload.credential);
    if (!env.DB) return Response.json({ error: "O portal está aguardando a conexão com o banco de dados." }, { status: 503 });
    await env.DB.prepare("INSERT INTO portal_users (sub, name, email, last_seen_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(sub) DO UPDATE SET name = excluded.name, email = excluded.email, last_seen_at = excluded.last_seen_at")
      .bind(user.sub, user.name, user.email, Date.now()).run();
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível validar sua conta.";
    return Response.json({ error: message }, { status: 401 });
  }
}

export async function DELETE(request: Request) {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", await sessionCookie(request));
  return response;
}
