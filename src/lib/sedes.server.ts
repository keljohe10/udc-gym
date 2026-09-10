// lib/sedes.server.ts
// SOLO SERVIDOR.
import { obtenerDbAdmin } from "./firebaseAdmin";
import { RADIO_POR_DEFECTO_METROS, SEDES, type Sede } from "../data/sedes";

export interface ConfigGeofence {
  radioPorDefectoMetros: number;
  geofenceActivo: boolean;
}

const CONFIG_POR_DEFECTO: ConfigGeofence = {
  radioPorDefectoMetros: RADIO_POR_DEFECTO_METROS,
  geofenceActivo: true,
};

/**
 * El archivo estático es la fuente de verdad de la identidad de cada sede
 * (id y nombre persistido). Firestore solo guarda ajustes operativos que
 * Bienestar puede cambiar sin desplegar: coordenadas afinadas en sitio, radio
 * y si la sede está activa.
 *
 * Si la lectura falla o la colección está vacía, se opera con los valores del
 * código: el registro de asistencia nunca queda inutilizable por un problema
 * de configuración.
 */
export async function cargarSedes(): Promise<{
  sedes: Sede[];
  config: ConfigGeofence;
}> {
  try {
    const db = obtenerDbAdmin();
    const [snapSedes, snapConfig] = await Promise.all([
      db.collection("sedes").get(),
      db.collection("config").doc("geofence").get(),
    ]);

    const overrides = new Map<string, Partial<Sede>>();
    snapSedes.forEach((doc) => overrides.set(doc.id, doc.data() as Partial<Sede>));

    const sedes = SEDES.map((sede) => {
      const o = overrides.get(sede.id);
      if (!o) return sede;
      return {
        ...sede,
        lat: typeof o.lat === "number" ? o.lat : sede.lat,
        lng: typeof o.lng === "number" ? o.lng : sede.lng,
        radioMetros:
          typeof o.radioMetros === "number" ? o.radioMetros : sede.radioMetros,
        activa: typeof o.activa === "boolean" ? o.activa : sede.activa,
      };
    });

    const datosConfig = snapConfig.exists
      ? (snapConfig.data() as Partial<ConfigGeofence>)
      : {};

    return {
      sedes,
      config: {
        radioPorDefectoMetros:
          typeof datosConfig.radioPorDefectoMetros === "number"
            ? datosConfig.radioPorDefectoMetros
            : CONFIG_POR_DEFECTO.radioPorDefectoMetros,
        geofenceActivo:
          typeof datosConfig.geofenceActivo === "boolean"
            ? datosConfig.geofenceActivo
            : CONFIG_POR_DEFECTO.geofenceActivo,
      },
    };
  } catch (error) {
    console.error("No se pudo leer la configuración de sedes:", error);
    return { sedes: SEDES, config: CONFIG_POR_DEFECTO };
  }
}
