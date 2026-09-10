// lib/requireAdmin.ts
// SOLO SERVIDOR.
import type { NextApiRequest, NextApiResponse } from "next";
import { COOKIE_ADMIN, verificarToken } from "./adminToken";

/**
 * Devuelve el usuario administrador de la sesión, o escribe la respuesta de
 * error y devuelve null. Toda route que modifique datos debe empezar por aquí.
 *
 * `SameSite=Lax` ya bloquea los POST desde otro sitio; la comprobación de
 * `origin` cubre el resto de vectores CSRF sin añadir dependencias.
 */
export function requireAdmin(
  req: NextApiRequest,
  res: NextApiResponse
): string | null {
  const origin = req.headers.origin;
  if (origin && req.headers.host) {
    try {
      if (new URL(origin).host !== req.headers.host) {
        res.status(403).json({ mensaje: "Origen no permitido." });
        return null;
      }
    } catch {
      res.status(403).json({ mensaje: "Origen no permitido." });
      return null;
    }
  }

  const payload = verificarToken(req.cookies?.[COOKIE_ADMIN]);
  if (!payload) {
    res.status(401).json({ mensaje: "Sesión expirada o no autorizada." });
    return null;
  }
  return payload.sub;
}
