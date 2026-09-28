import { env } from "cloudflare:workers";

export type PortalUser = { sub: string; name: string; email: string; admin: boolean };

type GoogleClaims = { iss?: string; aud?: string; exp?: number; iat?: number; sub?: string; email?: string; email_verified?: boolean; name?: string; hd?: string; nonce?: string };
type Jwks = { keys: JsonWebKey[] };
let cachedJwks: { value: Jwks; expiresAt: number } | undefined;

function encode(value: Uint8Array) {
  let binary = "";
  for (let index = 0; index < value.length; index += 0x8000) binary += String.fromCharCode(...value.subarray(index, index + 0x8000));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function decode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function envValue(name: keyof typeof env) {
  const value = env[name];
  return typeof value === "string" ? value : "";
}

export function isAuthConfigured() {
  return Boolean(envValue("GOOGLE_CLIENT_ID") && envValue("GOOGLE_WORKSPACE_DOMAIN") && envValue("SESSION_SECRET"));
}

function cookie(request: Request, name: string) {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator >= 0 && part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return "";
}

function setCookie(name: string, value: string, request: Request, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

function clearCookie(name: string, request: Request) {
  return setCookie(name, "", request, 0);
}

async function sign(value: string) {
  const secret = envValue("SESSION_SECRET");
  if (!secret || secret.length < 32) throw new Error("O segredo de sessão precisa ter ao menos 32 caracteres.");
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

async function unseal<T>(value: string) {
  const [payload, signature, extra] = value.split(".");
  if (!payload || !signature || extra) return null;
  if (!constantTimeEqual(signature, await sign(payload))) return null;
  try { return JSON.parse(new TextDecoder().decode(decode(payload))) as T; } catch { return null; }
}

export async function createNonce(request: Request) {
  const nonceBytes = crypto.getRandomValues(new Uint8Array(32));
  const nonce = encode(nonceBytes);
  const response = Response.json({ nonce });
  response.headers.append("Set-Cookie", setCookie("portal_nonce", await seal({ nonce, expires: Date.now() + 10 * 60 * 1000 }), request, 600));
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function getGoogleKeys() {
  if (cachedJwks && cachedJwks.expiresAt > Date.now()) return cachedJwks.value;
  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs", { cf: { cacheTtl: 600, cacheEverything: true } } as RequestInit);
  if (!response.ok) throw new Error("Não foi possível validar a assinatura do Google.");
  const value = await response.json() as Jwks;
  cachedJwks = { value, expiresAt: Date.now() + 10 * 60 * 1000 };
  return value;
}

async function verifyGoogleCredential(token: string, expectedNonce: string): Promise<GoogleClaims> {
  if (token.length > 12_000) throw new Error("Credencial Google inválida.");
  const [encodedHeader, encodedClaims, encodedSignature, extra] = token.split(".");
  if (!encodedHeader || !encodedClaims || !encodedSignature || extra) throw new Error("Credencial Google inválida.");
  const header = JSON.parse(new TextDecoder().decode(decode(encodedHeader))) as { alg?: string; kid?: string };
  const claims = JSON.parse(new TextDecoder().decode(decode(encodedClaims))) as GoogleClaims;
  if (header.alg !== "RS256" || !header.kid) throw new Error("Assinatura Google inválida.");
  const jwk = (await getGoogleKeys()).keys.find((key) => key.kid === header.kid);
  if (!jwk) throw new Error("Chave de assinatura Google desconhecida.");
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const signed = new TextEncoder().encode(`${encodedHeader}.${encodedClaims}`);
  if (!await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, decode(encodedSignature), signed)) throw new Error("Assinatura Google inválida.");
  const audience = envValue("GOOGLE_CLIENT_ID");
  const domain = envValue("GOOGLE_WORKSPACE_DOMAIN").toLowerCase();
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") throw new Error("Conta Google inválida.");
  if (claims.aud !== audience || !claims.exp || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error("Credencial Google expirada ou destinada a outro portal.");
  if (!claims.iat || claims.iat > Math.floor(Date.now() / 1000) + 60) throw new Error("Credencial Google inválida.");
  if (!claims.sub || !claims.email || claims.email_verified !== true) throw new Error("O Google não confirmou o e-mail desta conta.");
  if ((claims.hd ?? "").toLowerCase() !== domain) throw new Error(`Entre com uma conta Google Workspace @${domain}.`);
  if (claims.nonce !== expectedNonce) throw new Error("Esta autenticação expirou. Inicie o login novamente.");
  return claims;
}

function isAdmin(email: string) {
  const allowed = envValue("ADMIN_EMAILS").split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export async function createSession(request: Request, credential: string) {
  const nonceCookie = await unseal<{ nonce: string; expires: number }>(cookie(request, "portal_nonce"));
  if (!nonceCookie || nonceCookie.expires <= Date.now()) throw new Error("Esta autenticação expirou. Inicie o login novamente.");
  const claims = await verifyGoogleCredential(credential, nonceCookie.nonce);
  const user = { sub: claims.sub!, name: claims.name || claims.email!, email: claims.email!, admin: isAdmin(claims.email!) } satisfies PortalUser;
  const value = await seal({ ...user, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  const response = Response.json({ user: { name: user.name, email: user.email, admin: user.admin } });
  response.headers.append("Set-Cookie", setCookie("portal_session", value, request, 7 * 24 * 60 * 60));
  response.headers.append("Set-Cookie", clearCookie("portal_nonce", request));
  response.headers.set("Cache-Control", "no-store");
  return { response, user };
}

export async function getPortalUser(request: Request): Promise<PortalUser | null> {
  try {
    const value = await unseal<PortalUser & { expires: number }>(cookie(request, "portal_session"));
    if (!value || value.expires <= Date.now() || !value.sub || !value.email || !value.admin && isAdmin(value.email)) return null;
    return { sub: value.sub, name: value.name, email: value.email, admin: isAdmin(value.email) };
  } catch { return null; }
}

export async function sessionCookie(request: Request) {
  return clearCookie("portal_session", request);
}

export async function authorizedUser(request: Request) {
  const user = await getPortalUser(request);
  if (!user) return { user: null, response: Response.json({ error: "Entre com sua conta Google Workspace para continuar." }, { status: 401 }) };
  return { user, response: null };
}

export function configuredClientId() { return envValue("GOOGLE_CLIENT_ID"); }

