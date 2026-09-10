// pages/api/admin/logout.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { cabeceraCookieBorrado } from "../../../lib/adminToken";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Set-Cookie", cabeceraCookieBorrado());
  return res.status(200).json({ ok: true });
}
