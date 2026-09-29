import { readFileSync } from "node:fs";
import { SAML, ValidateInResponseTo } from "@node-saml/node-saml";

export const SP_ENTITY_ID = "https://treinamentos.casaeterra.com/saml/metadata";
export const ACS_URL = "https://treinamentos.casaeterra.com/api/auth/saml/acs";

let saml: SAML | undefined;

export function getSaml() {
  if (saml) return saml;
  const entryPoint = process.env.SAML_IDP_ENTRY_POINT?.trim();
  const idpIssuer = process.env.SAML_IDP_ISSUER?.trim();
  const certPath = process.env.SAML_IDP_CERT_PATH?.trim();
  if (!entryPoint || !idpIssuer || !certPath) throw new Error("Configure SAML_IDP_ENTRY_POINT, SAML_IDP_ISSUER e SAML_IDP_CERT_PATH.");
  const idpCert = readFileSync(/* turbopackIgnore: true */ certPath, "utf8");
  saml = new SAML({
    entryPoint,
    idpIssuer,
    idpCert,
    issuer: process.env.SAML_SP_ENTITY_ID?.trim() || SP_ENTITY_ID,
    callbackUrl: process.env.SAML_ACS_URL?.trim() || ACS_URL,
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
