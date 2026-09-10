// pages/api/sedes.ts
// Público: el flujo de asistencia necesita las sedes y el estado del geofence
// antes de pedir la ubicación. No expone nada sensible — las coordenadas y los
// radios son públicos por diseño, la validación real ocurre en /api/asistencia.
import type { NextApiRequest, NextApiResponse } from "next";
import { cargarSedes } from "../../lib/sedes.server";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ mensaje: "Método no permitido" });
  }

  const { sedes, config } = await cargarSedes();
  // Corta pero no nula: un cambio de radio debe propagarse en el siguiente
  // minuto, no en el siguiente despliegue.
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return res.status(200).json({
    sedes: sedes.filter((s) => s.activa),
    config,
  });
}
