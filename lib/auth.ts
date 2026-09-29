export type PortalUser = { sub: string; name: string; email: string; admin: boolean };

function envValue(name: string) { return process.env[name] ?? ""; }

export function displayNameFromEmail(emailValue: string) {
  const email = emailValue.trim();
  const localPart = email.split("@", 1)[0] ?? "";
  const parts = localPart.split(/[._-]+/).filter(Boolean);
  if (!parts.length) return email;
  return parts.map((part) => part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1).toLocaleLowerCase("pt-BR")).join(" ");
}

function encode(value: Uint8Array) {
  let binary = "";
  for (let index = 0; index < value.length; index += 0x8000) binary += String.fromCharCode(...value.subarray(index, index + 0x8000));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function cookie(request: Request, name: string) {
  for (const part of (request.headers.get("Cookie") ?? "").split(";")) {
    const separator = part.indexOf("=");
    if (separator >= 0 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return "";
}

function secureCookie(request: Request, sameSite: "Lax" | "None" = "Lax") {
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const secure = new URL(request.url).protocol === "https:" || forwardedProtocol === "https";
  return `Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=604800${secure ? "; Secure" : ""}`;
}

async function sign(value: string) {
  const secret = envValue("SESSION_SECRET");
  if (secret.length < 32) throw new Error("SESSION_SECRET precisa ter ao menos 32 caracteres.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return encode(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index++) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function seal(payload: object) {
  const value = encode(new TextEncoder().encode(JSON.stringify(payload)));
  return `${value}.${await sign(value)}`;
}

async function unseal<T>(value: string): Promise<T | null> {
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra || !constantTimeEqual(signature, await sign(payload))) return null;
  try { return JSON.parse(new TextDecoder().decode(decode(payload))) as T; } catch { return null; }
}

export function isAuthConfigured() {
  return Boolean(envValue("SAML_IDP_ENTRY_POINT") && envValue("SAML_IDP_ISSUER") && envValue("SAML_IDP_CERT_PATH") && envValue("SESSION_SECRET") && envValue("GOOGLE_WORKSPACE_DOMAIN"));
}

export async function createRelayState() {
  const state = encode(crypto.getRandomValues(new Uint8Array(32)));
  return { state, cookie: await seal({ state, expires: Date.now() + 5 * 60 * 1000 }) };
}

export async function verifyRelayState(request: Request, received: string) {
  const relay = await unseal<{ state: string; expires: number }>(cookie(request, "portal_saml_state"));
  return Boolean(relay && relay.expires > Date.now() && received && constantTimeEqual(relay.state, received));
}

export function clearRelayCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
  return `portal_saml_state=; Path=/; HttpOnly; SameSite=None; Max-Age=0${secure ? "; Secure" : ""}`;
}

function isAdmin(email: string) {
  const allowed = envValue("ADMIN_EMAILS").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export async function createSession(request: Request, emailValue: string) {
  const email = emailValue.trim().toLowerCase();
  const domain = envValue("GOOGLE_WORKSPACE_DOMAIN").trim().toLowerCase();
  if (!email || !domain || email.split("@").at(-1) !== domain) throw new Error(`Use uma conta Google Workspace @${domain}.`);
  const user: PortalUser = { sub: email, email, name: displayNameFromEmail(email), admin: isAdmin(email) };
  const value = await seal({ ...user, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const response = Response.json({ user: { name: user.name, email: user.email, admin: user.admin } });
  response.headers.append("Set-Cookie", `portal_session=${value}; ${secureCookie(request)}`);
  response.headers.append("Set-Cookie", await clearRelayCookie(request));
  response.headers.set("Cache-Control", "no-store");
  return { response, user };
}

export async function getPortalUser(request: Request): Promise<PortalUser | null> {
  try {
    const value = await unseal<PortalUser & { expires: number }>(cookie(request, "portal_session"));
    if (!value || value.expires <= Date.now() || !value.sub || !value.email) return null;
    return { sub: value.sub, name: displayNameFromEmail(value.email), email: value.email, admin: isAdmin(value.email) };
  } catch { return null; }
}

export function sessionCookie(request: Request) {
  const secure = new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() === "https";
  return `portal_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export async function authorizedUser(request: Request) {
  const user = await getPortalUser(request);
  if (!user) return { user: null, response: Response.json({ error: "Entre com sua conta Google Workspace para continuar." }, { status: 401 }) };
  return { user, response: null };
}
