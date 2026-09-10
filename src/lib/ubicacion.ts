// lib/ubicacion.ts
// Lectura de ubicación bajo demanda: se pide al enviar el formulario, no al
// cargar la página, para poder validarla contra la sede que el usuario eligió.
import type { Coordenada } from "./geo";

export type CodigoErrorUbicacion =
  | "no-soportado"
  | "permiso-denegado"
  | "no-disponible"
  | "tiempo-agotado";

export const MENSAJES_UBICACION: Record<CodigoErrorUbicacion, string> = {
  "no-soportado":
    "Tu navegador no permite compartir la ubicación. Intenta desde el navegador de tu teléfono.",
  "permiso-denegado":
    "Necesitamos tu ubicación para confirmar que estás en el gimnasio. Actívala en los permisos del sitio y vuelve a intentar.",
  "no-disponible":
    "No pudimos obtener tu ubicación. Verifica que el GPS esté encendido e intenta de nuevo.",
  "tiempo-agotado":
    "La búsqueda de tu ubicación tardó demasiado. Sal a un espacio abierto e intenta de nuevo.",
};

export class ErrorUbicacion extends Error {
  constructor(readonly codigo: CodigoErrorUbicacion) {
    super(MENSAJES_UBICACION[codigo]);
    this.name = "ErrorUbicacion";
  }
}

export interface LecturaUbicacion extends Coordenada {
  /** Radio de incertidumbre en metros (`coords.accuracy`). */
  precision: number;
}

/** Precisión con la que dejamos de esperar lecturas mejores. */
const PRECISION_OBJETIVO_METROS = 30;
/** Tiempo máximo muestreando antes de quedarnos con el mejor fix logrado. */
const VENTANA_MUESTREO_MS = 8000;
const TIMEOUT_MS = 15000;

const traducir = (code: number): CodigoErrorUbicacion => {
  if (code === 1) return "permiso-denegado";
  if (code === 3) return "tiempo-agotado";
  return "no-disponible";
};

/**
 * El primer fix suele venir de la red (±500-2000 m) y mejora en unos segundos
 * al enganchar satélites, así que muestreamos hasta lograr una lectura
 * suficientemente buena o hasta agotar la ventana con la mejor conseguida.
 */
export function obtenerUbicacion(): Promise<LecturaUbicacion> {
  return new Promise((resolver, rechazar) => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      rechazar(new ErrorUbicacion("no-soportado"));
      return;
    }

    let watchId: number | null = null;
    let temporizador: ReturnType<typeof setTimeout> | null = null;
    let mejor: GeolocationPosition | null = null;
    let terminado = false;

    const limpiar = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (temporizador !== null) clearTimeout(temporizador);
    };

    const aceptar = () => {
      if (terminado || !mejor) return;
      terminado = true;
      limpiar();
      resolver({
        lat: mejor.coords.latitude,
        lng: mejor.coords.longitude,
        precision: mejor.coords.accuracy,
      });
    };

    const fallar = (codigo: CodigoErrorUbicacion) => {
      if (terminado) return;
      terminado = true;
      limpiar();
      rechazar(new ErrorUbicacion(codigo));
    };

    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!mejor || pos.coords.accuracy < mejor.coords.accuracy) mejor = pos;
        if (mejor.coords.accuracy <= PRECISION_OBJETIVO_METROS) aceptar();
      },
      (err) => {
        // Un error posterior no invalida una lectura ya conseguida.
        if (mejor) aceptar();
        else fallar(traducir(err.code));
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 }
    );

    temporizador = setTimeout(() => {
      if (mejor) aceptar();
      else fallar("tiempo-agotado");
    }, VENTANA_MUESTREO_MS);
  });
}
