// hooks/useGeolocalizacion.ts
import { useCallback, useEffect, useState } from "react";
import type { Coordenada } from "../lib/geo";

export type EstadoGeolocalizacion =
  | "solicitando"
  | "obtenida"
  | "error";

export type ErrorGeolocalizacion =
  | "no-soportado"
  | "permiso-denegado"
  | "no-disponible"
  | "tiempo-agotado";

export const MENSAJES_ERROR: Record<ErrorGeolocalizacion, string> = {
  "no-soportado":
    "Tu navegador no permite compartir la ubicación. Intenta desde el navegador de tu teléfono.",
  "permiso-denegado":
    "Necesitamos tu ubicación para confirmar que estás en el gimnasio. Actívala en los permisos del sitio y vuelve a intentar.",
  "no-disponible":
    "No pudimos obtener tu ubicación. Verifica que el GPS esté encendido e intenta de nuevo.",
  "tiempo-agotado":
    "La búsqueda de tu ubicación tardó demasiado. Sal a un espacio abierto e intenta de nuevo.",
};

interface ResultadoGeolocalizacion {
  estado: EstadoGeolocalizacion;
  coords: Coordenada | null;
  /** Radio de incertidumbre de la lectura, en metros. */
  precision: number | null;
  error: ErrorGeolocalizacion | null;
  reintentar: () => void;
}

/** Precisión con la que dejamos de esperar mejores lecturas. */
const PRECISION_OBJETIVO_METROS = 30;
/** Tiempo máximo muestreando antes de quedarnos con el mejor fix logrado. */
const VENTANA_MUESTREO_MS = 8000;
const TIMEOUT_MS = 15000;

const traducirError = (code: number): ErrorGeolocalizacion => {
  if (code === 1) return "permiso-denegado";
  if (code === 3) return "tiempo-agotado";
  return "no-disponible";
};

export function useGeolocalizacion(): ResultadoGeolocalizacion {
  const [estado, setEstado] = useState<EstadoGeolocalizacion>("solicitando");
  const [coords, setCoords] = useState<Coordenada | null>(null);
  const [precision, setPrecision] = useState<number | null>(null);
  const [error, setError] = useState<ErrorGeolocalizacion | null>(null);
  const [intento, setIntento] = useState(0);

  const reintentar = useCallback(() => setIntento((n) => n + 1), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!("geolocation" in navigator)) {
      setEstado("error");
      setError("no-soportado");
      return;
    }

    let cancelado = false;
    let watchId: number | null = null;
    let temporizador: ReturnType<typeof setTimeout> | null = null;
    let mejor: GeolocationPosition | null = null;

    setEstado("solicitando");
    setError(null);

    const detener = () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
      if (temporizador !== null) clearTimeout(temporizador);
      watchId = null;
      temporizador = null;
    };

    const aceptar = () => {
      if (cancelado || !mejor) return;
      detener();
      setCoords({ lat: mejor.coords.latitude, lng: mejor.coords.longitude });
      setPrecision(mejor.coords.accuracy);
      setEstado("obtenida");
    };

    // El primer fix suele venir de la red (±500-2000 m) y mejora en unos
    // segundos al enganchar satélites. Muestreamos hasta lograr una lectura
    // suficientemente buena, o hasta agotar la ventana quedándonos con la mejor.
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (cancelado) return;
        if (!mejor || pos.coords.accuracy < mejor.coords.accuracy) mejor = pos;
        if (mejor.coords.accuracy <= PRECISION_OBJETIVO_METROS) aceptar();
      },
      (err) => {
        if (cancelado) return;
        // Un error tras haber conseguido una lectura válida no la invalida.
        if (mejor) {
          aceptar();
          return;
        }
        detener();
        setError(traducirError(err.code));
        setEstado("error");
      },
      { enableHighAccuracy: true, timeout: TIMEOUT_MS, maximumAge: 0 }
    );

    temporizador = setTimeout(() => {
      if (cancelado) return;
      if (mejor) {
        aceptar();
        return;
      }
      detener();
      setError("tiempo-agotado");
      setEstado("error");
    }, VENTANA_MUESTREO_MS);

    return () => {
      cancelado = true;
      detener();
    };
  }, [intento]);

  return { estado, coords, precision, error, reintentar };
}
