// lib/adminToken.ts
// SOLO SERVIDOR. Token de sesión de administrador firmado con HMAC-SHA256.
// Usa únicamente `node:crypto`, sin dependencias nuevas.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const COOKIE_ADMIN = "udcgym_admin";
const DURACION_MS = 8 * 60 * 60 * 1000; // una jornada

interface Payload {
  sub: string;
  iat: number;
  exp: number;
  jti: string;
}

const b64u = (b: Buffer) => b.toString("base64url");

function secreto(): string {
  const s = process.env.ADMIN_TOKEN_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "ADMIN_TOKEN_SECRET ausente o demasiado corto (mínimo 32 caracteres)."
    );
  }
  return s;
}

const firmar = (datos: string) =>
  b64u(createHmac("sha256", secreto()).update(datos).digest());

export function emitirToken(usuario: string): string {
  const ahora = Date.now();
  const payload: Payload = {
    sub: usuario,
    iat: ahora,
    exp: ahora + DURACION_MS,
    jti: randomBytes(8).toString("hex"),
  };
  const cuerpo = b64u(Buffer.from(JSON.stringify(payload)));
  return `${cuerpo}.${firmar(cuerpo)}`;
}

export function verificarToken(token?: string): Payload | null {
  if (!token) return null;
  const [cuerpo, firma] = token.split(".");
  if (!cuerpo || !firma) return null;

  const esperada = Buffer.from(firmar(cuerpo));
  const recibida = Buffer.from(firma);
  // timingSafeEqual lanza si las longitudes difieren.
  if (esperada.length !== recibida.length) return null;
  if (!timingSafeEqual(esperada, recibida)) return null;

  try {
    const payload: Payload = JSON.parse(
      Buffer.from(cuerpo, "base64url").toString("utf8")
    );
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function cabeceraCookie(token: string): string {
  const seguro = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${COOKIE_ADMIN}=${token}; HttpOnly;${seguro} SameSite=Lax; Path=/; Max-Age=${
    DURACION_MS / 1000
  }`;
}

export function cabeceraCookieBorrado(): string {
  const seguro = process.env.NODE_ENV === "production" ? " Secure;" : "";
  return `${COOKIE_ADMIN}=; HttpOnly;${seguro} SameSite=Lax; Path=/; Max-Age=0`;
}
