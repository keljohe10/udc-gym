// pages/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertTitle,
  Box,
  CircularProgress,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import {
  RADIO_POR_DEFECTO_METROS,
  sedesActivas,
  type Sede,
} from "../data/sedes";
import { ErrorUbicacion, obtenerUbicacion } from "../lib/ubicacion";

interface ConfigGeofence {
  radioPorDefectoMetros: number;
  geofenceActivo: boolean;
}

// Respaldo si /api/sedes no responde: se exige ubicación, que es el
// comportamiento seguro. Nunca al revés.
const CONFIG_RESPALDO: ConfigGeofence = {
  radioPorDefectoMetros: RADIO_POR_DEFECTO_METROS,
  geofenceActivo: true,
};

type Envio = "inactivo" | "ubicando" | "registrando";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [sedes, setSedes] = useState<Sede[] | null>(null);
  const [config, setConfig] = useState<ConfigGeofence | null>(null);
  const [sedeId, setSedeId] = useState("");
  const [envio, setEnvio] = useState<Envio>("inactivo");
  const [error, setError] = useState<string | null>(null);
  const [registrado, setRegistrado] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("id");
    if (!userId) {
      router.push({ pathname: "/register", query: { attendance: "true" } });
      return;
    }

    const fetchUser = async () => {
      const q = query(collection(db, "users"), where("id", "==", userId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        setUser({ id: userDoc.id, ...userDoc.data() });
      } else {
        console.error("Usuario no encontrado");
        router.push({ pathname: "/register", query: { attendance: "true" } });
      }
    };

    fetchUser();
  }, [router]);

  // Sedes y estado del geofence vienen del servidor: el interruptor de /sedes y
  // las coordenadas ajustadas en sitio deben regir también aquí.
  useEffect(() => {
    fetch("/api/sedes")
      .then((r) => r.json())
      .then((d) => {
        setSedes(
          Array.isArray(d?.sedes) && d.sedes.length ? d.sedes : sedesActivas()
        );
        setConfig(d?.config ?? CONFIG_RESPALDO);
      })
      .catch(() => {
        setSedes(sedesActivas());
        setConfig(CONFIG_RESPALDO);
      });
  }, []);

  const configurado = sedes !== null && config !== null;
  const sedeSeleccionada = sedes?.find((s) => s.id === sedeId) ?? null;
  // La ubicación se exige salvo que el interruptor general esté apagado o que
  // la sede elegida esté exenta. Sin sede elegida todavía no se sabe.
  const requiereUbicacion =
    (config?.geofenceActivo ?? true) && !sedeSeleccionada?.exentaGeofence;

  /**
   * La ubicación se pide aquí y no al cargar la página: solo tiene sentido
   * validarla contra la sede que el usuario acaba de elegir. Pedirla antes
   * obligaba a evaluar contra la sede más cercana, que no es necesariamente
   * aquella en la que quiere registrarse.
   */
  const handleIngreso = async () => {
    if (!user || !sedeId) return;
    setError(null);

    let lectura = null;
    if (requiereUbicacion) {
      setEnvio("ubicando");
      try {
        lectura = await obtenerUbicacion();
      } catch (e) {
        setError(
          e instanceof ErrorUbicacion
            ? e.message
            : "No pudimos obtener tu ubicación."
        );
        setEnvio("inactivo");
        return;
      }
    }

    setEnvio("registrando");
    try {
      const respuesta = await fetch("/api/asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          sedeId,
          ...(lectura && {
            lat: lectura.lat,
            lng: lectura.lng,
            precision: lectura.precision,
          }),
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));

      // 409 es "ya registraste hoy": no es un fallo que deba reintentarse.
      if (respuesta.ok || respuesta.status === 409) {
        setRegistrado(datos.mensaje ?? "Asistencia registrada!");
        return;
      }

      setError(
        datos.mensaje ?? "No pudimos registrar tu asistencia. Intenta de nuevo."
      );
    } catch {
      setError(
        "No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo."
      );
    } finally {
      setEnvio("inactivo");
    }
  };

  if (!user) return null;

  if (registrado) {
    return (
      <Container sx={{ mt: 5 }}>
        <Box display="flex" justifyContent="center" alignItems="center">
          <CheckCircleOutlineOutlinedIcon color="success" sx={{ mr: 1 }} />
          <Typography variant="h5" align="center">
            {registrado}
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h5" gutterBottom>
        Bienvenido, {user.name}
      </Typography>

      {!configurado ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 3 }}>
          <CircularProgress size={22} />
          <Typography variant="body1">Cargando...</Typography>
        </Box>
      ) : (
        <>
          <Typography variant="subtitle1" gutterBottom>
            ¿En cuál sede te encuentras?
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="sede-label">Sede</InputLabel>
            <Select
              labelId="sede-label"
              label="Sede"
              value={sedeId}
              onChange={(e) => {
                setSedeId(e.target.value);
                setError(null);
              }}
            >
              {(sedes ?? []).map((sede) => (
                <MenuItem key={sede.id} value={sede.id}>
                  {sede.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {sedeId && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 1 }}
            >
              {requiereUbicacion
                ? "Al registrar tu ingreso confirmaremos que estás en la sede que elegiste."
                : "Esta sede no requiere verificación por ubicación."}
            </Typography>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              <AlertTitle>No pudimos registrar tu asistencia</AlertTitle>
              {error}
            </Alert>
          )}

          <Box sx={{ mt: 4 }}>
            <LoadingButton
              variant="contained"
              loading={envio !== "inactivo"}
              loadingIndicator={
                envio === "ubicando" ? "Verificando ubicación..." : "Registrando..."
              }
              disabled={!sedeId}
              onClick={handleIngreso}
            >
              Registrar Ingreso
            </LoadingButton>
          </Box>
        </>
      )}
    </Container>
  );
}
