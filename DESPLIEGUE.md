# Puesta en marcha — geofencing y administración

## 1. Variables de entorno

Las que ya existían (cliente, públicas) siguen igual: `NEXT_PUBLIC_FIREBASE_*`.

Las nuevas son de servidor y **no** llevan el prefijo `NEXT_PUBLIC_`:

| Variable | Para qué | Cómo se obtiene |
|---|---|---|
| `FIREBASE_SERVICE_ACCOUNT_B64` | Firebase Admin en las API routes | Consola de Firebase → Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada. Luego `base64 -i serviceAccount.json \| tr -d '\n'` |
| `ADMIN_TOKEN_SECRET` | Firma del token de sesión de admin | `openssl rand -hex 32` |

Se cargan en Vercel (Project Settings → Environment Variables) y en `.env.local`
para desarrollo.

Se prefiere base64 porque es una sola línea sin comillas ni escapes, y se
comporta igual en `.env.local`, en Vercel y en CI. Como alternativa se acepta el
trío `FIREBASE_PROJECT_ID` / `FIREBASE_CLIENT_EMAIL` / `FIREBASE_PRIVATE_KEY`;
el código ya normaliza los `\n` escapados y las comillas envolventes.

Rotar `ADMIN_TOKEN_SECRET` invalida todas las sesiones de administrador: es el
mecanismo de emergencia si un token se ve comprometido.

## 2. Orden de despliegue

**El código primero, las reglas después.** Al revés se rompe el registro de
asistencia y el login de las sesiones abiertas.

1. Cargar las variables de entorno en Vercel.
2. Desplegar el código y comprobar que `/login` y el registro de asistencia
   funcionan en producción.
3. Solo entonces:
   ```
   firebase deploy --only firestore:rules,firestore:indexes
   ```

Entre los pasos 2 y 3 conviene dejar unos minutos: un navegador con el bundle
anterior en caché seguiría escribiendo directo a `history` y recibiría
`permission-denied` en cuanto se apliquen las reglas.

## 3. Índice compuesto

`firestore.indexes.json` declara el índice que ya usaba el dedupe diario
(`history`: `userId`, `branch`, `createdAt`). Si el proyecto ya lo tenía creado
desde la consola, el deploy no cambia nada.

## 4. Ajuste de coordenadas en sitio

Las coordenadas sembradas apuntan al **campus**, no al gimnasio. Con radios de
250 m en Cartagena, la diferencia importa. Un instructor debe pararse junto al
equipamiento de cada sede, entrar a `/sedes` y pulsar «Tomar mi ubicación».

## 5. Qué NO garantiza el geofence

Validar en el servidor impide saltarse la comprobación y manipular los radios,
pero **no detecta un GPS falseado**: las DevTools de Chrome y las apps de
ubicación simulada pueden inyectar coordenadas. Sube el listón de «elegir una
opción en un desplegable» a «falsificar deliberadamente la ubicación», que es
una mejora real, pero conviene comunicarlo así a Bienestar y no presentar los
indicadores como prueba de presencia física.

Además, San Pablo y Zaragocilla están a 77 m: ningún radio los separa. Cuando el
usuario cae dentro de varios perímetros, la app le pide confirmar en cuál está y
marca el registro con `registroAmbiguo: true` para poder medirlo después.

## 6. Pendientes conocidos

- La colección `users` sigue siendo legible por cualquiera con la API key
  pública (nombre, correo y cédula de todos los usuarios). Las reglas de
  Firestore no pueden exigir que una consulta lleve filtro de igualdad; cerrarlo
  requiere mover el registro y la búsqueda de usuario a API routes. Es la mayor
  exposición del sistema y es independiente del geofence.
- No hay registro manual de asistencia para quien tenga el permiso de ubicación
  bloqueado o un dispositivo sin GPS. Conviene añadirlo antes de exigir el
  geofence de forma obligatoria.
- `/api/admin/login` no tiene limitación de intentos.
- `register.tsx` valida la unicidad de cédula con una consulta previa, no con la
  clave del documento: dos registros simultáneos con la misma cédula pueden
  colarse.
