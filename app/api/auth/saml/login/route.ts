import { createRelayState, isAuthConfigured } from "../../../../../lib/auth";
import { getSaml, portalUrl } from "../../../../../lib/saml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!isAuthConfigured()) return Response.redirect(portalUrl("/?sso=not-configured"));
  try {
    const { state, cookie } = await createRelayState();
    const target = await getSaml().getAuthorizeUrlAsync(state, undefined, {});
    const response = new Response(null, { status: 302, headers: { Location: target } });
    const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
    response.headers.append("Set-Cookie", `portal_saml_state=${cookie}; Path=/; HttpOnly; SameSite=None; Max-Age=300${secure ? "; Secure" : ""}`);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Falha ao iniciar SAML:", error);
    return Response.redirect(portalUrl("/?sso=failed"));
  }
}
