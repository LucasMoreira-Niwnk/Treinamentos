import { getDb } from "../../../../../db";
import { clearRelayCookie, createSession, isAuthConfigured, verifyRelayState } from "../../../../../lib/auth";
import { getSaml, portalUrl, profileText } from "../../../../../lib/saml";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function failed(request: Request, reason: string, status = 303) {
  const response = new Response(null, { status, headers: { Location: portalUrl(`/?sso=${reason}`).toString() } });
  response.headers.append("Set-Cookie", clearRelayCookie(request));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) return failed(request, "not-configured", 303);
  try {
    const form = await request.formData();
    const samlResponse = form.get("SAMLResponse");
    const relayState = form.get("RelayState");
    if (typeof samlResponse !== "string" || samlResponse.length > 200_000 || typeof relayState !== "string" || !await verifyRelayState(request, relayState)) {
      return failed(request, "failed");
    }
    const { profile } = await getSaml().validatePostResponseAsync({ SAMLResponse: samlResponse, RelayState: relayState });
    if (!profile) return failed(request, "failed");
    const rawProfile = profile as unknown as Record<string, unknown>;
    const email = profileText(rawProfile, "email", "mail", "nameID", "nameId");
    const givenName = profileText(rawProfile, "firstName", "givenName", "given_name");
    const familyName = profileText(rawProfile, "lastName", "sn", "surname", "family_name");
    const fullName = profileText(rawProfile, "displayName", "name") || [givenName, familyName].filter(Boolean).join(" ") || email;
    if (!email) return failed(request, "failed");
    const { response: sessionResponse, user } = await createSession(request, email, fullName);
    getDb().prepare("INSERT INTO portal_users (sub, name, email, last_seen_at) VALUES (?, ?, ?, ?) ON CONFLICT(sub) DO UPDATE SET name = excluded.name, email = excluded.email, last_seen_at = excluded.last_seen_at")
      .run(user.sub, user.name, user.email, Date.now());
    const response = new Response(null, { status: 303, headers: { Location: portalUrl("/").toString() } });
    for (const setCookie of sessionResponse.headers.getSetCookie()) response.headers.append("Set-Cookie", setCookie);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("Falha ao validar resposta SAML:", error);
    return failed(request, "failed");
  }
}
