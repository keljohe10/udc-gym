// pages/api/asistencia.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { obtenerDbAdmin } from "../../lib/firebaseAdmin";
import { cargarSedes } from "../../lib/sedes.server";
import { ventanaDelDiaColombia } from "../../lib/fechas";
import {
  PRECISION_MAXIMA_ABSOLUTA_METROS,
  precisionMaximaParaRadio,
  sedesEnRango,
  sedeMasCercana,
} from "../../lib/geo";

interface Cuerpo {
  userId?: unknown;
  sedeId?: unknown;
  lat?: unknown;
  lng?: unknown;
  precision?: unknown;
}

const esNumeroFinito = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ mensaje: "Método no permitido" });
  }

  const { userId, sedeId, lat, lng, precision } = req.body as Cuerpo;

  if (typeof userId !== "string" || !userId.trim()) {
    return res.status(400).json({ mensaje: "Falta el identificador del usuario." });
  }
  if (typeof sedeId !== "string" || !sedeId.trim()) {
    return res.status(400).json({ mensaje: "Falta la sede." });
  }
  if (
    !esNumeroFinito(lat) ||
    !esNumeroFinito(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  ) {
    return res.status(400).json({ mensaje: "Coordenadas inválidas." });
  }
  if (!esNumeroFinito(precision) || precision < 0) {
    return res.status(400).json({ mensaje: "Margen de precisión inválido." });
  }

  try {
    // La configuración se resuelve primero y sin exigir la base: un rechazo por
    // geofence no debe gastar lecturas de Firestore ni depender de ella.
    const { sedes, config } = await cargarSedes();
    const activas = sedes.filter((s) => s.activa);

    const sede = activas.find((s) => s.id === sedeId);
    if (!sede) {
      return res.status(400).json({ mensaje: "La sede indicada no existe o está inactiva." });
    }

    const coord = { lat, lng };
    let distancia = 0;
    let candidatas: string[] = [];

    // El interruptor permite operar sin geofence durante una incidencia sin
    // tener que desplegar; los registros quedan marcados como no verificados.
    if (config.geofenceActivo) {
      if (precision > PRECISION_MAXIMA_ABSOLUTA_METROS) {
        return res.status(422).json({
          mensaje:
            "La precisión de tu ubicación es demasiado baja. Sal a un espacio abierto e intenta de nuevo.",
        });
      }

      // Se recalcula todo aquí: el cliente nunca envía el radio ni decide solo
      // en qué sede está.
      const enRango = sedesEnRango(
        coord,
        activas,
        config.radioPorDefectoMetros,
        precision
      );
      candidatas = enRango.map((c) => c.sede.id);

      const elegida = enRango.find((c) => c.sede.id === sedeId);
      if (!elegida) {
        const masCercana = sedeMasCercana(
          coord,
          activas,
          config.radioPorDefectoMetros,
          precision
        );
        return res.status(403).json({
          mensaje: "No estás dentro del perímetro del gimnasio.",
          distanciaMetros: masCercana ? Math.round(masCercana.distanciaMetros) : null,
          radioMetros: masCercana ? masCercana.radioMetros : null,
          sedeMasCercana: masCercana ? masCercana.sede.nombre : null,
        });
      }

      if (precision > precisionMaximaParaRadio(elegida.radioMetros)) {
        return res.status(422).json({
          mensaje:
            "La precisión de tu ubicación es demasiado baja para confirmar esta sede. Intenta de nuevo.",
        });
      }

      distancia = elegida.distanciaMetros;
    }

    const db = obtenerDbAdmin();

    // Los datos del usuario se leen aquí y no se aceptan del cliente.
    const snapUsuario = await db
      .collection("users")
      .where("id", "==", userId)
      .limit(1)
      .get();
    if (snapUsuario.empty) {
      return res.status(404).json({ mensaje: "Usuario no encontrado." });
    }
    const usuario = snapUsuario.docs[0].data();

    // Ventana anclada a la hora de Colombia: esta route corre en UTC.
    const { inicio, fin } = ventanaDelDiaColombia();
    const yaRegistrado = await db
      .collection("history")
      .where("userId", "==", userId)
      .where("branch", "==", sede.nombre)
      .where("createdAt", ">=", inicio)
      .where("createdAt", "<=", fin)
      .limit(1)
      .get();
    if (!yaRegistrado.empty) {
      return res
        .status(409)
        .json({ mensaje: "Ya has registrado tu asistencia hoy en esta sede." });
    }

    await db.collection("history").add({
      userId,
      name: usuario.name,
      userType: usuario.userType,
      branch: sede.nombre,
      sedeId: sede.id,
      lat,
      lng,
      precisionMetros: precision,
      distanciaMetros: Math.round(distancia),
      sedesCandidatas: candidatas,
      registroAmbiguo: candidatas.length > 1,
      precisionBaja: precision > 50,
      geoVerificado: config.geofenceActivo,
      origenValidacion: "servidor",
      createdAt: FieldValue.serverTimestamp(),
      ...(usuario.department && { department: usuario.department }),
      ...(usuario.studentCode && { studentCode: usuario.studentCode }),
      ...(usuario.program && { program: usuario.program }),
    });

    return res.status(201).json({ mensaje: "Asistencia registrada!" });
  } catch (error) {
    console.error("Error registrando asistencia:", error);
    return res
      .status(500)
      .json({ mensaje: "No pudimos registrar tu asistencia. Intenta de nuevo." });
  }
}
