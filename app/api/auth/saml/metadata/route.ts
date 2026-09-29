import { isAuthConfigured } from "../../../../../lib/auth";
import { getSaml } from "../../../../../lib/saml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  if (!isAuthConfigured()) return new Response("SAML não configurado", { status: 503 });
  try {
    return new Response(getSaml().generateServiceProviderMetadata(null), {
      headers: { "Content-Type": "application/samlmetadata+xml; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch {
    return new Response("Não foi possível gerar os metadados SAML", { status: 503 });
  }
}
