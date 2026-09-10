// lib/fechas.ts
/**
 * Ventanas de tiempo ancladas a la hora de Colombia.
 *
 * El dedupe diario vivía en el navegador, donde `startOf("day")` daba el día
 * local correcto. Al moverlo a una API route pasa a ejecutarse en UTC: un
 * ingreso a las 20:00 de Cartagena son las 01:00 UTC del día siguiente, así que
 * con días UTC el mismo día colombiano se parte en dos y el usuario podría
 * registrarse dos veces. Colombia no aplica horario de verano, por lo que el
 * desfase es fijo y basta con aritmética explícita.
 */
export const OFFSET_COLOMBIA_MINUTOS = -5 * 60;

const MS_POR_MINUTO = 60_000;
const MS_POR_DIA = 24 * 60 * MS_POR_MINUTO;

export interface Ventana {
  inicio: Date;
  fin: Date;
}

/** Inicio y fin del día colombiano que contiene `momento`. */
export function ventanaDelDiaColombia(momento: Date = new Date()): Ventana {
  // Desplazamos a hora colombiana para poder leer el día calendario correcto.
  const local = new Date(
    momento.getTime() + OFFSET_COLOMBIA_MINUTOS * MS_POR_MINUTO
  );
  const medianocheLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate()
  );
  const inicio = new Date(
    medianocheLocal - OFFSET_COLOMBIA_MINUTOS * MS_POR_MINUTO
  );
  return { inicio, fin: new Date(inicio.getTime() + MS_POR_DIA - 1) };
}

/** Inicio y fin del mes colombiano `YYYY-MM`. */
export function ventanaDelMesColombia(mes: string): Ventana {
  const [anio, numeroMes] = mes.split("-").map(Number);
  const inicio = new Date(
    Date.UTC(anio, numeroMes - 1, 1) - OFFSET_COLOMBIA_MINUTOS * MS_POR_MINUTO
  );
  const fin = new Date(
    Date.UTC(anio, numeroMes, 1) - OFFSET_COLOMBIA_MINUTOS * MS_POR_MINUTO - 1
  );
  return { inicio, fin };
}

export interface PartesColombia {
  /** 0-23 en hora de Cartagena. */
  hora: number;
  /** 0 = domingo. */
  diaSemana: number;
  /** YYYY-MM-DD en hora de Cartagena. */
  dia: string;
}

/** Descompone un instante en sus partes de calendario colombianas. */
export function partesColombia(fecha: Date): PartesColombia {
  const local = new Date(
    fecha.getTime() + OFFSET_COLOMBIA_MINUTOS * MS_POR_MINUTO
  );
  const mes = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(local.getUTCDate()).padStart(2, "0");
  return {
    hora: local.getUTCHours(),
    diaSemana: local.getUTCDay(),
    dia: `${local.getUTCFullYear()}-${mes}-${dia}`,
  };
}
