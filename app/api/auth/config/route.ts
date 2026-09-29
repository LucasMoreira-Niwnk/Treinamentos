import { configuredClientId } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ clientId: configuredClientId() }, { headers: { "Cache-Control": "no-store" } });
}
