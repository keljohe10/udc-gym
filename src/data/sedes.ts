// data/sedes.ts
export type TipoSede = "sede" | "centro-tutorial";

export interface Sede {
  /** Slug estable. Es el identificador que se guarda en `sedeId`. */
  id: string;
  /**
   * Nombre visible. Se persiste literalmente en `history.branch` y
   * `gymEquipment.sede`, y esos campos se comparan por igualdad exacta
   * (index.tsx dedupe diario, gym-equipment-list.tsx filtro de sede).
   * Cambiar el texto de una sede existente rompe los registros históricos.
   */
  nombre: string;
  tipo: TipoSede;
  ciudad: string;
  lat: number;
  lng: number;
  /**
   * Perímetro de asistencia válido, en metros. Si se omite, la sede hereda el
   * radio general configurable desde /sedes.
   */
  radioMetros?: number;
  /**
   * Exime a esta sede de la validación por ubicación, sin apagarla en el resto
   * del sistema. Pensado para una sede con cobertura GPS deficiente mientras se
   * resuelve. Ausente significa que sí se exige ubicación.
   */
  exentaGeofence?: boolean;
  /** Si la sede aparece o no en el formulario. No exime del geofence. */
  activa: boolean;
}

/**
 * Radio que se aplica a toda sede que no defina el suyo. Es el valor que la
 * pantalla /sedes deja configurar bajo «Radio por defecto».
 */
export const RADIO_POR_DEFECTO_METROS = 2000;

/**
 * Los tres campus de Cartagena están a menos de 500 m entre sí
 * (San Pablo–Zaragocilla: 77 m), así que un radio de 2 km los volvería
 * indistinguibles. De ahí el radio reducido para esa ciudad.
 */
const RADIO_CARTAGENA_METROS = 250;

export const SEDES: Sede[] = [
  {
    id: "piedra-de-bolivar",
    nombre: "Piedra de Bolivar",
    tipo: "sede",
    ciudad: "Cartagena",
    lat: 10.4027174,
    lng: -75.5055852,
    radioMetros: RADIO_CARTAGENA_METROS,
    activa: true,
  },
  {
    id: "san-pablo",
    nombre: "San Pablo",
    tipo: "sede",
    ciudad: "Cartagena",
    lat: 10.3998288,
    lng: -75.5034994,
    radioMetros: RADIO_CARTAGENA_METROS,
    activa: true,
  },
  {
    id: "zaragocilla",
    nombre: "Zaragocilla",
    tipo: "sede",
    ciudad: "Cartagena",
    lat: 10.3995629,
    lng: -75.5028444,
    radioMetros: RADIO_CARTAGENA_METROS,
    activa: true,
  },
  {
    id: "carmen-de-bolivar",
    nombre: "Centro Tutorial El Carmen de Bolívar",
    tipo: "centro-tutorial",
    ciudad: "El Carmen de Bolívar",
    lat: 9.7211019,
    lng: -75.1169264,
    activa: true,
  },
  {
    id: "san-juan-de-nepomuceno",
    nombre: "Centro Tutorial San Juan de Nepomuceno",
    tipo: "centro-tutorial",
    ciudad: "San Juan de Nepomuceno",
    lat: 9.9623914,
    lng: -75.0808722,
    activa: true,
  },
  {
    id: "magangue",
    nombre: "Centro Tutorial Magangué",
    tipo: "centro-tutorial",
    ciudad: "Magangué",
    lat: 9.2394138,
    lng: -74.7598118,
    activa: true,
  },
];

export const sedesActivas = (): Sede[] => SEDES.filter((sede) => sede.activa);

/** Nombres de sedes activas, para los `<Select>` que persisten el texto. */
export const nombresSedes = (): string[] => sedesActivas().map((s) => s.nombre);

export const sedePorNombre = (nombre: string): Sede | undefined =>
  SEDES.find((s) => s.nombre === nombre);

export const sedePorId = (id: string): Sede | undefined =>
  SEDES.find((s) => s.id === id);
