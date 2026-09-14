// pages/api/asistencia.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { FieldValue } from "firebase-admin/firestore";
import { obtenerDbAdmin } from "../../lib/firebaseAdmin";
import { cargarSedes } from "../../lib/sedes.server";
import { partesColombia } from "../../lib/fechas";
import {
  PRECISION_MAXIMA_ABSOLUTA_METROS,
  formatearDistancia,
  precisionMaximaParaRadio,
  sedesPorCercania,
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

/**
 * Firestore responde ALREADY_EXISTS (gRPC 6) cuando `create()` cae sobre un
 * documento que ya existe. Se comprueba también el texto porque el código no
 * viaja en todos los caminos de error del SDK.
 */
const esConflicto = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  ((error as { code?: unknown }).code === 6 ||
    /already exists/i.test(String((error as { message?: unknown }).message ?? "")));

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
  try {
    // La configuración se resuelve primero y sin exigir la base: un rechazo por
    // geofence no debe gastar lecturas de Firestore ni depender de ella.
    const { sedes, config } = await cargarSedes();
    const activas = sedes.filter((s) => s.activa);

    const sede = activas.find((s) => s.id === sedeId);
    if (!sede) {
      return res.status(400).json({ mensaje: "La sede indicada no existe o está inactiva." });
    }

    let distancia = 0;
    let candidatas: string[] = [];

    // Se exige ubicación salvo que el interruptor general esté apagado o que
    // esta sede en concreto esté exenta. Ambos son válvulas de escape para
    // operar durante una incidencia sin desplegar; los registros resultantes
    // quedan marcados como no verificados.
    const requiereUbicacion = config.geofenceActivo && !sede.exentaGeofence;

    if (requiereUbicacion) {
      // Solo se exigen coordenadas cuando el geofence está activo: con el
      // interruptor apagado el estudiante ni siquiera comparte su ubicación.
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

      if (precision > PRECISION_MAXIMA_ABSOLUTA_METROS) {
        return res.status(422).json({
          mensaje:
            "La precisión de tu ubicación es demasiado baja. Sal a un espacio abierto e intenta de nuevo.",
        });
      }

      // Se recalcula todo aquí: el cliente nunca envía el radio ni decide solo
      // en qué sede está.
      const coord = { lat, lng };
      const evaluadas = sedesPorCercania(
        coord,
        activas,
        config.radioPorDefectoMetros,
        precision
      );
      // Se deja constancia de qué otras sedes también contenían al usuario,
      // para poder medir después cuántos registros fueron ambiguos.
      candidatas = evaluadas.filter((c) => c.dentro).map((c) => c.sede.id);

      // Se valida contra la sede que el usuario eligió, no contra la más
      // cercana: son cosas distintas y el mensaje debe hablar de la suya.
      const objetivo = evaluadas.find((c) => c.sede.id === sedeId);
      if (!objetivo) {
        return res.status(400).json({ mensaje: "La sede indicada no existe." });
      }

      if (!objetivo.dentro) {
        return res.status(403).json({
          mensaje:
            `Estás a ${formatearDistancia(objetivo.distanciaMetros)} de ${sede.nombre}. ` +
            `Debes estar a menos de ${formatearDistancia(objetivo.radioMetros)} para registrar tu asistencia.`,
          sede: sede.nombre,
          distanciaMetros: Math.round(objetivo.distanciaMetros),
          radioMetros: objetivo.radioMetros,
        });
      }

      if (precision > precisionMaximaParaRadio(objetivo.radioMetros)) {
        return res.status(422).json({
          mensaje:
            "La precisión de tu ubicación es demasiado baja para confirmar esta sede. Intenta de nuevo.",
        });
      }

      distancia = objetivo.distanciaMetros;
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

    // Un registro por usuario y día, sin importar la sede.
    //
    // El dedupe filtraba además por `branch`, lo que daba un cupo por sede. Los
    // perímetros de Cartagena se solapan a propósito — San Pablo y Zaragocilla
    // están a 77 m, por debajo de lo que el GPS puede separar — así que quien
    // está en uno cae legítimamente dentro del otro y podía registrar en ambos
    // con el geofence funcionando y aprobando las dos veces. Separarlos no es
    // trabajo del geofence: el límite es por persona y día.
    //
    // El id del documento es determinista y `create()` falla si ya existe, así
    // que no queda ventana entre comprobar y escribir: dos peticiones
    // simultáneas (doble toque, reintento de red, dos pestañas) ya no pueden
    // colarse las dos como sí ocurría con `get()` + `add()`.
    const dia = partesColombia(new Date()).dia;
    // El documento de identidad es texto libre. `encodeURIComponent` es
    // inyectivo —dos documentos distintos nunca colisionan— y escapa la barra,
    // único carácter que Firestore prohíbe dentro de un id.
    const refRegistro = db
      .collection("history")
      .doc(`${encodeURIComponent(userId)}_${dia}`);

    const registro = {
      userId,
      name: usuario.name,
      userType: usuario.userType,
      branch: sede.nombre,
      sedeId: sede.id,
      lat: esNumeroFinito(lat) ? lat : null,
      lng: esNumeroFinito(lng) ? lng : null,
      precisionMetros: esNumeroFinito(precision) ? precision : null,
      distanciaMetros: requiereUbicacion ? Math.round(distancia) : null,
      sedesCandidatas: candidatas,
      registroAmbiguo: candidatas.length > 1,
      precisionBaja: esNumeroFinito(precision) && precision > 50,
      geoVerificado: requiereUbicacion,
      // Distinguir el motivo permite auditar después si la exención se quedó
      // encendida más tiempo del necesario.
      motivoSinVerificar: requiereUbicacion
        ? null
        : sede.exentaGeofence
        ? "sede-exenta"
        : "geofence-desactivado",
      origenValidacion: "servidor",
      createdAt: FieldValue.serverTimestamp(),
      ...(usuario.department && { department: usuario.department }),
      ...(usuario.studentCode && { studentCode: usuario.studentCode }),
      ...(usuario.program && { program: usuario.program }),
    };

    try {
      await refRegistro.create(registro);
    } catch (error) {
      if (!esConflicto(error)) throw error;
      // La lectura solo se paga en el camino del duplicado, y sirve para nombrar
      // la sede del registro que ya existe: un "ya registraste hoy" a secas
      // confunde a quien creía estar marcando en una sede distinta.
      const previo = (await refRegistro.get()).data();
      return res.status(409).json({
        mensaje:
          typeof previo?.branch === "string"
            ? `Ya registraste tu asistencia hoy en ${previo.branch}.`
            : "Ya registraste tu asistencia hoy.",
      });
    }

    return res.status(201).json({ mensaje: "Asistencia registrada!" });
  } catch (error) {
    console.error("Error registrando asistencia:", error);
    return res
      .status(500)
      .json({ mensaje: "No pudimos registrar tu asistencia. Intenta de nuevo." });
  }
}
