import { getPortalUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const user = await getPortalUser(request);
  return Response.json({ user: user ? { name: user.name, email: user.email, admin: user.admin } : null }, { headers: { "Cache-Control": "no-store" } });
}
