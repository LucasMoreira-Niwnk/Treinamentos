import { createNonce, isAuthConfigured } from "../../../../lib/auth";

export async function POST(request: Request) {
  if (!isAuthConfigured()) return Response.json({ error: "O login ainda precisa ser configurado pelo administrador do portal." }, { status: 503 });
  try { return await createNonce(request); }
  catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Não foi possível iniciar o login." }, { status: 503 }); }
}
