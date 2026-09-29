import { readFileSync } from "node:fs";
import { SAML, ValidateInResponseTo } from "@node-saml/node-saml";

export const SP_ENTITY_ID = "https://treinamentos.casaeterra.com/saml/metadata";

export function getPortalBaseUrl() {
  const value = process.env.APP_BASE_URL?.trim() || "https://treinamentos.casaeterra.com";
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error("APP_BASE_URL precisa usar HTTPS.");
  }
  return url.origin;
}

export function portalUrl(path: string) {
  return new URL(path, getPortalBaseUrl());
}

let saml: SAML | undefined;

export function getSaml() {
  if (saml) return saml;
  const entryPoint = process.env.SAML_IDP_ENTRY_POINT?.trim();
  const idpIssuer = process.env.SAML_IDP_ISSUER?.trim();
  const certPath = process.env.SAML_IDP_CERT_PATH?.trim();
  if (!entryPoint || !idpIssuer || !certPath) throw new Error("Configure SAML_IDP_ENTRY_POINT, SAML_IDP_ISSUER e SAML_IDP_CERT_PATH.");
  const idpCert = readFileSync(/* turbopackIgnore: true */ certPath, "utf8");
  const callbackUrl = process.env.SAML_ACS_URL?.trim() || `${getPortalBaseUrl()}/api/auth/saml/acs`;
  const callback = new URL(callbackUrl);
  if (callback.origin !== getPortalBaseUrl() || callback.pathname !== "/api/auth/saml/acs") {
    throw new Error("SAML_ACS_URL deve apontar para /api/auth/saml/acs no mesmo domínio de APP_BASE_URL.");
  }
  saml = new SAML({
    entryPoint,
    idpIssuer,
    idpCert,
    issuer: process.env.SAML_SP_ENTITY_ID?.trim() || SP_ENTITY_ID,
    callbackUrl,
    audience: process.env.SAML_SP_ENTITY_ID?.trim() || SP_ENTITY_ID,
    validateInResponseTo: ValidateInResponseTo.always,
    wantAssertionsSigned: true,
    wantAuthnResponseSigned: false,
    identifierFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    acceptedClockSkewMs: 2_000,
    maxAssertionAgeMs: 5 * 60 * 1000,
  });
  return saml;
}

export function profileText(profile: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = profile[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (Array.isArray(value) && typeof value[0] === "string" && value[0].trim()) return value[0].trim();
  }
  return "";
}
