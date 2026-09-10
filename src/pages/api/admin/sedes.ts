// pages/api/admin/sedes.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { obtenerDbAdmin } from "../../../lib/firebaseAdmin";
import { requireAdmin } from "../../../lib/requireAdmin";
import { cargarSedes } from "../../../lib/sedes.server";
import { SEDES } from "../../../data/sedes";

const esNumeroFinito = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const admin = requireAdmin(req, res);
  if (!admin) return;

  try {
    if (req.method === "GET") {
      const { sedes, config } = await cargarSedes();
      // `porDefecto` permite a la pantalla marcar qué valores fueron ajustados.
      return res.status(200).json({
        sedes,
        config,
        porDefecto: SEDES,
      });
    }

    if (req.method === "PUT") {
      const { sedes, config } = req.body ?? {};
      const db = obtenerDbAdmin();
      const lote = db.batch();

      if (Array.isArray(sedes)) {
        for (const sede of sedes) {
          const base = SEDES.find((s) => s.id === sede?.id);
          if (!base) {
            return res
              .status(400)
              .json({ mensaje: `La sede "${sede?.id}" no existe.` });
          }
          if (
            !esNumeroFinito(sede.lat) ||
            !esNumeroFinito(sede.lng) ||
            sede.lat < -90 ||
            sede.lat > 90 ||
            sede.lng < -180 ||
            sede.lng > 180
          ) {
            return res
              .status(400)
              .json({ mensaje: `Coordenadas inválidas en "${base.nombre}".` });
          }
          // Vacío o nulo significa «heredar el radio general».
          const heredaRadio =
            sede.radioMetros === null ||
            sede.radioMetros === undefined ||
            sede.radioMetros === "";
          if (
            !heredaRadio &&
            (!esNumeroFinito(sede.radioMetros) ||
              sede.radioMetros < 20 ||
              sede.radioMetros > 20000)
          ) {
            return res.status(400).json({
              mensaje: `El radio de "${base.nombre}" debe estar entre 20 y 20000 metros, o vacío para heredar el general.`,
            });
          }

          lote.set(
            db.collection("sedes").doc(base.id),
            {
              lat: sede.lat,
              lng: sede.lng,
              radioMetros: heredaRadio ? null : Math.round(sede.radioMetros),
              exentaGeofence: Boolean(sede.exentaGeofence),
              activa: Boolean(sede.activa),
              actualizadoPor: admin,
              actualizadoEn: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }

      if (config) {
        if (
          !esNumeroFinito(config.radioPorDefectoMetros) ||
          config.radioPorDefectoMetros < 20 ||
          config.radioPorDefectoMetros > 20000
        ) {
          return res.status(400).json({
            mensaje: "El radio por defecto debe estar entre 20 y 20000 metros.",
          });
        }
        lote.set(
          db.collection("config").doc("geofence"),
          {
            radioPorDefectoMetros: Math.round(config.radioPorDefectoMetros),
            geofenceActivo: Boolean(config.geofenceActivo),
            actualizadoPor: admin,
            actualizadoEn: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await lote.commit();
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ mensaje: "Método no permitido" });
  } catch (error) {
    console.error("Error en administración de sedes:", error);
    return res.status(500).json({ mensaje: "Error al guardar la configuración." });
  }
}
