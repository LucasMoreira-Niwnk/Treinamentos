import { sessionCookie } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request) {
  const response = Response.json({ ok: true });
  response.headers.append("Set-Cookie", await sessionCookie(request));
  return response;
}
