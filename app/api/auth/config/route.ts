import { configuredClientId } from "../../../../lib/auth";

export function GET() {
  return Response.json({ clientId: configuredClientId() }, { headers: { "Cache-Control": "no-store" } });
}
