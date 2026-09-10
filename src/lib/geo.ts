// lib/geo.ts
// Módulo puro: sin React y sin Firebase, para poder reutilizarlo tanto en el
// navegador como en las API routes que validan el geofence en el servidor.
import { RADIO_POR_DEFECTO_METROS, type Sede } from "../data/sedes";

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface SedeConDistancia {
  sede: Sede;
  distanciaMetros: number;
  radioMetros: number;
  /** Holgura concedida por el margen de error del GPS, en metros. */
  margenMetros: number;
  dentro: boolean;
}

const RADIO_TIERRA_METROS = 6_371_000;

const aRadianes = (grados: number) => (grados * Math.PI) / 180;

/** Distancia sobre la superficie terrestre entre dos puntos, en metros (Haversine). */
export function distanciaMetros(a: Coordenada, b: Coordenada): number {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const lat1 = aRadianes(a.lat);
  const lat2 = aRadianes(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.sqrt(h));
}

export function radioDeSede(
  sede: Sede,
  radioPorDefecto: number = RADIO_POR_DEFECTO_METROS
): number {
  return sede.radioMetros ?? radioPorDefecto;
}

/** Por encima de esto la lectura viene de una torre celular y no dice nada útil. */
export const PRECISION_MAXIMA_ABSOLUTA_METROS = 500;

/**
 * Precisión máxima tolerada para un radio dado. Con un perímetro de 250 m no
 * tiene sentido aceptar una lectura con ±600 m de error, pero tampoco conviene
 * exigir precisión de GPS fino en los centros tutoriales de 2 km.
 */
export function precisionMaximaParaRadio(radioMetros: number): number {
  return Math.min(radioMetros * 0.6, PRECISION_MAXIMA_ABSOLUTA_METROS);
}

/**
 * Holgura máxima que puede sumar el margen de error al perímetro. Sin tope, una
 * lectura de ±400 m convertiría un radio de 250 m en uno de 650 m y anularía el
 * geofence; con tope, el radio efectivo de Cartagena nunca pasa de 400 m, que
 * sigue siendo menor que la distancia entre Piedra de Bolívar y Zaragocilla.
 */
export function toleranciaParaRadio(radioMetros: number): number {
  return radioMetros <= 500 ? 150 : PRECISION_MAXIMA_ABSOLUTA_METROS;
}

/**
 * Todas las sedes ordenadas por cercanía, con su distancia y si estamos dentro.
 *
 * `precision` es el margen de error de la lectura (`coords.accuracy`). Se suma
 * al perímetro, acotado por `toleranciaParaRadio`: quien está justo en el borde
 * real de la sede reporta una distancia inflada por el propio error del GPS y no
 * debería quedar fuera por eso.
 */
export function sedesPorCercania(
  coord: Coordenada,
  sedes: Sede[],
  radioPorDefecto: number = RADIO_POR_DEFECTO_METROS,
  precision: number = 0
): SedeConDistancia[] {
  return sedes
    .map((sede) => {
      const distancia = distanciaMetros(coord, sede);
      const radio = radioDeSede(sede, radioPorDefecto);
      const margen = Math.min(Math.max(precision, 0), toleranciaParaRadio(radio));
      return {
        sede,
        distanciaMetros: distancia,
        radioMetros: radio,
        margenMetros: margen,
        dentro: distancia <= radio + margen,
      };
    })
    .sort((a, b) => a.distanciaMetros - b.distanciaMetros);
}

/**
 * Sedes cuyo perímetro contiene la coordenada, de la más cercana a la más
 * lejana. En Cartagena puede devolver más de una: San Pablo y Zaragocilla
 * están a 77 m, por debajo de lo que el GPS de un teléfono puede separar.
 */
export function sedesEnRango(
  coord: Coordenada,
  sedes: Sede[],
  radioPorDefecto: number = RADIO_POR_DEFECTO_METROS,
  precision: number = 0
): SedeConDistancia[] {
  return sedesPorCercania(coord, sedes, radioPorDefecto, precision).filter(
    (s) => s.dentro
  );
}

export function sedeMasCercana(
  coord: Coordenada,
  sedes: Sede[],
  radioPorDefecto: number = RADIO_POR_DEFECTO_METROS,
  precision: number = 0
): SedeConDistancia | null {
  return sedesPorCercania(coord, sedes, radioPorDefecto, precision)[0] ?? null;
}

/** "180 m" / "1,24 km" — para los mensajes que ve el usuario. */
export function formatearDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} km`;
}
