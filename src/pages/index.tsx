// pages/index.tsx
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import MyLocationOutlinedIcon from "@mui/icons-material/MyLocationOutlined";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase/config";
import { RADIO_POR_DEFECTO_METROS, sedesActivas, type Sede } from "../data/sedes";
import {
  PRECISION_MAXIMA_ABSOLUTA_METROS,
  formatearDistancia,
  precisionMaximaParaRadio,
  sedesEnRango,
  sedeMasCercana,
  type SedeConDistancia,
} from "../lib/geo";
import {
  MENSAJES_ERROR,
  useGeolocalizacion,
} from "../hooks/useGeolocalizacion";

const SEDES = sedesActivas();

type Ubicacion =
  | { tipo: "evaluando" }
  | { tipo: "precision-baja"; precision: number }
  | { tipo: "fuera-de-rango"; masCercana: SedeConDistancia }
  | { tipo: "en-rango"; candidatas: SedeConDistancia[] };

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [sedeElegida, setSedeElegida] = useState<Sede | null>(null);
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState({
    value: false,
    message: "",
  });
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  const router = useRouter();
  const geo = useGeolocalizacion();

  useEffect(() => {
    const userId = localStorage.getItem("id");
    if (!userId) {
      router.push({
        pathname: "/register",
        query: { attendance: "true" },
      });
      return;
    }

    const fetchUser = async () => {
      const q = query(collection(db, "users"), where("id", "==", userId));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() };
        setUser(user);
      } else {
        console.error("Usuario no encontrado");
        router.push({
          pathname: "/register",
          query: { attendance: "true" },
        });
      }
    };

    fetchUser();
  }, [router]);

  const ubicacion = useMemo<Ubicacion>(() => {
    if (geo.estado !== "obtenida" || !geo.coords || geo.precision === null) {
      return { tipo: "evaluando" };
    }

    // Por encima de este margen la lectura viene de una torre celular: no
    // distingue entre sedes ni siquiera en los centros tutoriales.
    if (geo.precision > PRECISION_MAXIMA_ABSOLUTA_METROS) {
      return { tipo: "precision-baja", precision: geo.precision };
    }

    const masCercana = sedeMasCercana(
      geo.coords,
      SEDES,
      RADIO_POR_DEFECTO_METROS,
      geo.precision
    );
    if (!masCercana) return { tipo: "evaluando" };

    const candidatas = sedesEnRango(
      geo.coords,
      SEDES,
      RADIO_POR_DEFECTO_METROS,
      geo.precision
    );

    // Estar fuera es una conclusión útil aunque la lectura sea imprecisa, así
    // que se informa antes de pedir un reintento por precisión.
    if (candidatas.length === 0) return { tipo: "fuera-de-rango", masCercana };

    if (geo.precision > precisionMaximaParaRadio(masCercana.radioMetros)) {
      return { tipo: "precision-baja", precision: geo.precision };
    }

    return { tipo: "en-rango", candidatas };
  }, [geo.estado, geo.coords, geo.precision]);

  // Con una sola sede en rango no tiene sentido preguntar: se elige sola.
  useEffect(() => {
    if (ubicacion.tipo === "en-rango" && ubicacion.candidatas.length === 1) {
      setSedeElegida(ubicacion.candidatas[0].sede);
    }
  }, [ubicacion]);

  const handleIngreso = async () => {
    if (!user || !sedeElegida || !geo.coords || geo.precision === null) return;
    setLoading(true);
    setErrorRegistro(null);

    try {
      const respuesta = await fetch("/api/asistencia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          sedeId: sedeElegida.id,
          lat: geo.coords.lat,
          lng: geo.coords.lng,
          precision: geo.precision,
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));

      // 409 es "ya registraste hoy": no es un fallo que deba reintentarse.
      if (respuesta.ok || respuesta.status === 409) {
        setIsRegistered({
          value: true,
          message: datos.mensaje ?? "Asistencia registrada!",
        });
        return;
      }

      setErrorRegistro(
        datos.mensaje ?? "No pudimos registrar tu asistencia. Intenta de nuevo."
      );
    } catch {
      setErrorRegistro(
        "No pudimos conectar con el servidor. Verifica tu conexión e intenta de nuevo."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (isRegistered.value) {
    return (
      <Container sx={{ mt: 5 }}>
        <Box display="flex" justifyContent="center" alignItems="center">
          <CheckCircleOutlineOutlinedIcon color="success" sx={{ mr: 1 }} />
          <Typography variant="h5" align="center">
            {isRegistered.message}
          </Typography>
        </Box>
      </Container>
    );
  }

  const botonReintentar = (
    <Button
      size="small"
      startIcon={<MyLocationOutlinedIcon />}
      onClick={geo.reintentar}
      sx={{ mt: 1 }}
    >
      Volver a intentar
    </Button>
  );

  return (
    <Container sx={{ mt: 5 }}>
      <Typography variant="h5" gutterBottom>
        Bienvenido, {user.name}
      </Typography>

      {geo.estado === "solicitando" && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 3 }}>
          <CircularProgress size={22} />
          <Typography variant="body1">
            Confirmando que estás en el gimnasio...
          </Typography>
        </Box>
      )}

      {geo.estado === "error" && geo.error && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <AlertTitle>No pudimos verificar tu ubicación</AlertTitle>
          {MENSAJES_ERROR[geo.error]}
          {geo.error !== "no-soportado" && botonReintentar}
        </Alert>
      )}

      {geo.estado === "obtenida" && ubicacion.tipo === "precision-baja" && (
        <Alert severity="warning" sx={{ mt: 3 }}>
          <AlertTitle>Ubicación poco precisa</AlertTitle>
          La precisión de tu ubicación es baja (±
          {formatearDistancia(ubicacion.precision)}). Sal a un espacio abierto e
          intenta de nuevo.
          {botonReintentar}
        </Alert>
      )}

      {geo.estado === "obtenida" && ubicacion.tipo === "fuera-de-rango" && (
        <Alert severity="error" sx={{ mt: 3 }}>
          <AlertTitle>Estás fuera del gimnasio</AlertTitle>
          Estás a {formatearDistancia(ubicacion.masCercana.distanciaMetros)} de{" "}
          {ubicacion.masCercana.sede.nombre}, la sede más cercana. Debes estar a
          menos de {formatearDistancia(ubicacion.masCercana.radioMetros)} para
          registrar tu asistencia.
          {botonReintentar}
        </Alert>
      )}

      {geo.estado === "obtenida" && ubicacion.tipo === "en-rango" && (
        <Box sx={{ mt: 3 }}>
          {ubicacion.candidatas.length === 1 ? (
            <Alert severity="success" icon={<LocationOnOutlinedIcon />}>
              <AlertTitle>Ubicación confirmada</AlertTitle>
              Estás en <strong>{ubicacion.candidatas[0].sede.nombre}</strong>
              {geo.precision !== null &&
                ` (±${formatearDistancia(geo.precision)})`}
              .
            </Alert>
          ) : (
            <>
              <Typography variant="subtitle1" gutterBottom>
                Estás cerca de más de una sede. ¿En cuál te encuentras?
              </Typography>
              <Stack spacing={1} sx={{ mt: 2 }}>
                {ubicacion.candidatas.map(({ sede, distanciaMetros }) => (
                  <Button
                    key={sede.id}
                    fullWidth
                    variant={
                      sedeElegida?.id === sede.id ? "contained" : "outlined"
                    }
                    onClick={() => setSedeElegida(sede)}
                    sx={{ justifyContent: "space-between" }}
                  >
                    <span>{sede.nombre}</span>
                    <Typography variant="caption">
                      a {formatearDistancia(distanciaMetros)}
                    </Typography>
                  </Button>
                ))}
              </Stack>
            </>
          )}

          {errorRegistro && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorRegistro}
            </Alert>
          )}

          <Box sx={{ mt: 4 }}>
            <LoadingButton
              variant="contained"
              loading={loading}
              disabled={!sedeElegida}
              onClick={handleIngreso}
            >
              Registrar Ingreso
            </LoadingButton>
          </Box>
        </Box>
      )}
    </Container>
  );
}
