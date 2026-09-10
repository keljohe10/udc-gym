// pages/api/admin/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { obtenerDbAdmin } from "../../../lib/firebaseAdmin";
import { cabeceraCookie, emitirToken } from "../../../lib/adminToken";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ mensaje: "Método no permitido" });
  }

  const { usuario, password } = req.body ?? {};
  if (typeof usuario !== "string" || typeof password !== "string") {
    return res.status(400).json({ mensaje: "Usuario y contraseña son obligatorios." });
  }

  try {
    const db = obtenerDbAdmin();
    const snap = await db
      .collection("admin")
      .where("usuario", "==", usuario)
      .limit(1)
      .get();

    // Mismo mensaje para usuario inexistente y contraseña incorrecta: no hay
    // razón para revelar cuáles usuarios existen.
    const generico = "Usuario o contraseña incorrectos";

    if (snap.empty) {
      // Coste constante aproximado para no filtrar la existencia por tiempo.
      await bcrypt.compare(password, "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidu");
      return res.status(401).json({ mensaje: generico });
    }

    const admin = snap.docs[0].data();
    const valida = await bcrypt.compare(password, admin.password);
    if (!valida) return res.status(401).json({ mensaje: generico });

    res.setHeader("Set-Cookie", cabeceraCookie(emitirToken(usuario)));
    return res.status(200).json({ ok: true, usuario });
  } catch (error) {
    console.error("Error en login de administrador:", error);
    return res.status(500).json({ mensaje: "Error al iniciar sesión." });
  }
}
