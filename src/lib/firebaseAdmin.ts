// lib/firebaseAdmin.ts
//
// SOLO SERVIDOR. Importar únicamente desde src/pages/api/**.
// Si se importa desde una página o un componente, Next intenta empaquetarlo
// para el navegador y el build falla con errores de `fs`/`net`.
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const NOMBRE_APP = "udc-gym-admin";

// El hot-reload de Next reevalúa el módulo sin reiniciar el proceso, y
// `settings()` lanza si se invoca dos veces sobre la misma instancia.
const cacheGlobal = globalThis as unknown as { __udcGymDb?: Firestore };

function leerCredencial(): ServiceAccount {
  // Preferimos base64: es una sola línea, sin comillas ni escapes, y se
  // comporta igual en .env.local, en Vercel y en CI.
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64;
  if (b64) {
    const json = JSON.parse(Buffer.from(b64, "base64").toString("utf8"));
    return {
      projectId: json.project_id,
      clientEmail: json.client_email,
      privateKey: json.private_key,
    };
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Falta la credencial de Firebase Admin. Define FIREBASE_SERVICE_ACCOUNT_B64 " +
        "o el trío FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY."
    );
  }

  // Algunos shells y paneles dejan las comillas envolventes pegadas.
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }
  // Convierte \n literales en saltos reales. Es idempotente: si ya venían como
  // saltos reales (Vercel al pegar multilínea), no cambia nada.
  privateKey = privateKey.replace(/\\n/g, "\n");

  if (!privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("FIREBASE_PRIVATE_KEY no tiene el formato PEM esperado.");
  }

  return { projectId, clientEmail, privateKey };
}

function obtenerApp(): App {
  const existente = getApps().find((a) => a.name === NOMBRE_APP);
  if (existente) return existente;
  return initializeApp({ credential: cert(leerCredencial()) }, NOMBRE_APP);
}

/**
 * Firestore con privilegios de administrador. Es una función y no una constante
 * de módulo a propósito: así `next build` no falla cuando las credenciales no
 * están presentes, y el error aparece como un 500 legible en tiempo de request.
 */
export function obtenerDbAdmin(): Firestore {
  if (cacheGlobal.__udcGymDb) return cacheGlobal.__udcGymDb;
  const db = getFirestore(obtenerApp());
  db.settings({ ignoreUndefinedProperties: true });
  cacheGlobal.__udcGymDb = db;
  return db;
}
