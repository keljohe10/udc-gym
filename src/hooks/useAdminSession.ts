// hooks/useAdminSession.ts
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export type EstadoSesion = "verificando" | "autorizado";

export const CLAVE_PISTA_ADMIN = "adminAuth";

/**
 * Guard de las páginas de administración.
 *
 * La autoridad real es la cookie httpOnly, que el navegador no puede leer.
 * `localStorage["adminAuth"]` se conserva solo como pista para no parpadear
 * mientras se confirma la sesión — y porque la cookie caduca a las 8 horas
 * mientras que la pista no caducaría nunca, lo que produciría menús de admin
 * visibles con peticiones fallando en 401 sin explicación.
 */
export function useAdminSession(): EstadoSesion {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoSesion>("verificando");

  useEffect(() => {
    let cancelado = false;

    const expulsar = () => {
      localStorage.removeItem(CLAVE_PISTA_ADMIN);
      router.push("/login");
    };

    if (!localStorage.getItem(CLAVE_PISTA_ADMIN)) {
      router.push("/login");
      return;
    }

    fetch("/api/admin/session")
      .then((r) => r.json())
      .then((datos) => {
        if (cancelado) return;
        if (!datos?.ok) {
          expulsar();
          return;
        }
        setEstado("autorizado");
      })
      .catch(() => {
        // Un fallo de red no debe expulsar a nadie: las escrituras fallarían
        // igualmente con 401 y el mensaje sería más claro allí.
        if (!cancelado) setEstado("autorizado");
      });

    return () => {
      cancelado = true;
    };
  }, [router]);

  return estado;
}
