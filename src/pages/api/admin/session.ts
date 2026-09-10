// pages/api/admin/session.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { COOKIE_ADMIN, verificarToken } from "../../../lib/adminToken";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const payload = verificarToken(req.cookies?.[COOKIE_ADMIN]);
  return res.status(200).json({
    ok: Boolean(payload),
    ...(payload && { usuario: payload.sub }),
  });
}
