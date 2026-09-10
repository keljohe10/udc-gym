// pages/sedes.tsx
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import MyLocationOutlinedIcon from "@mui/icons-material/MyLocationOutlined";
import { useAdminSession } from "../hooks/useAdminSession";
import { formatearDistancia, distanciaMetros } from "../lib/geo";
import type { Sede } from "../data/sedes";

interface Config {
  radioPorDefectoMetros: number;
  geofenceActivo: boolean;
}

export default function SedesPage() {
  const sesion = useAdminSession();
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [porDefecto, setPorDefecto] = useState<Sede[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ubicando, setUbicando] = useState<string | null>(null);
  const [aviso, setAviso] = useState<{
    texto: string;
    tipo: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (sesion !== "autorizado") return;
    fetch("/api/admin/sedes")
      .then((r) => r.json())
      .then((d) => {
        if (d?.sedes) {
          setSedes(d.sedes);
          setPorDefecto(d.porDefecto ?? []);
          setConfig(d.config);
        } else {
          setAviso({ texto: d?.mensaje ?? "No se pudo cargar.", tipo: "error" });
        }
      })
      .catch(() => setAviso({ texto: "No se pudo cargar la configuración.", tipo: "error" }))
      .finally(() => setCargando(false));
  }, [sesion]);

  const actualizar = useCallback(
    (id: string, campo: keyof Sede, valor: number | boolean) => {
      setSedes((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [campo]: valor } : s))
      );
    },
    []
  );

  /**
   * Las coordenadas sembradas apuntan al campus, no al gimnasio. Este botón
   * permite que quien esté parado junto al equipamiento fije el punto exacto,
   * que es lo que hace utilizable un radio de 250 m.
   */
  const usarMiUbicacion = (id: string) => {
    if (!("geolocation" in navigator)) {
      setAviso({ texto: "Tu navegador no permite compartir la ubicación.", tipo: "error" });
      return;
    }
    setUbicando(id);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        actualizar(id, "lat", Number(pos.coords.latitude.toFixed(7)));
        actualizar(id, "lng", Number(pos.coords.longitude.toFixed(7)));
        setUbicando(null);
        setAviso({
          texto: `Coordenadas tomadas con ±${Math.round(pos.coords.accuracy)} m de precisión. Recuerda guardar.`,
          tipo: "success",
        });
      },
      () => {
        setUbicando(null);
        setAviso({ texto: "No pudimos obtener tu ubicación.", tipo: "error" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      const respuesta = await fetch("/api/admin/sedes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sedes, config }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      setAviso(
        respuesta.ok
          ? { texto: "Configuración guardada.", tipo: "success" }
          : { texto: datos.mensaje ?? "No se pudo guardar.", tipo: "error" }
      );
    } catch {
      setAviso({ texto: "No pudimos conectar con el servidor.", tipo: "error" });
    } finally {
      setGuardando(false);
    }
  };

  if (sesion !== "autorizado") return null;

  const original = (id: string) => porDefecto.find((s) => s.id === id);

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 6 }}>
      <Typography variant="h4" gutterBottom>
        Configuración de Sedes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        El perímetro define desde dónde se puede registrar la asistencia. Para
        ajustar una sede con precisión, párate junto al gimnasio y usa
        &laquo;Tomar mi ubicación&raquo;.
      </Typography>

      {cargando && <Typography>Cargando...</Typography>}

      {config && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Parámetros generales
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              alignItems={{ sm: "center" }}
            >
              <TextField
                label="Radio por defecto (m)"
                type="number"
                size="small"
                value={config.radioPorDefectoMetros}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    radioPorDefectoMetros: Number(e.target.value),
                  })
                }
                helperText="Se aplica a las sedes sin radio propio"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={config.geofenceActivo}
                    onChange={(e) =>
                      setConfig({ ...config, geofenceActivo: e.target.checked })
                    }
                  />
                }
                label="Exigir ubicación para registrar"
              />
            </Stack>
            {!config.geofenceActivo && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Con la verificación desactivada, cualquier persona puede
                registrar asistencia desde cualquier lugar. Los registros quedan
                marcados como no verificados.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Stack spacing={2}>
        {sedes.map((sede) => {
          const base = original(sede.id);
          const movida =
            base &&
            distanciaMetros(
              { lat: base.lat, lng: base.lng },
              { lat: sede.lat, lng: sede.lng }
            ) > 1;

          return (
            <Card key={sede.id} sx={{ opacity: sede.activa ? 1 : 0.6 }}>
              <CardContent>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  flexWrap="wrap"
                  gap={1}
                >
                  <Box>
                    <Typography variant="h6">{sede.nombre}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {sede.ciudad}
                      {sede.tipo === "centro-tutorial" && " · Centro tutorial"}
                    </Typography>
                  </Box>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={sede.activa}
                        onChange={(e) =>
                          actualizar(sede.id, "activa", e.target.checked)
                        }
                      />
                    }
                    label="Activa"
                  />
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ sm: "flex-start" }}
                >
                  <TextField
                    label="Latitud"
                    type="number"
                    size="small"
                    fullWidth
                    value={sede.lat}
                    onChange={(e) =>
                      actualizar(sede.id, "lat", Number(e.target.value))
                    }
                  />
                  <TextField
                    label="Longitud"
                    type="number"
                    size="small"
                    fullWidth
                    value={sede.lng}
                    onChange={(e) =>
                      actualizar(sede.id, "lng", Number(e.target.value))
                    }
                  />
                  <TextField
                    label="Radio (m)"
                    type="number"
                    size="small"
                    fullWidth
                    value={sede.radioMetros}
                    onChange={(e) =>
                      actualizar(sede.id, "radioMetros", Number(e.target.value))
                    }
                  />
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  flexWrap="wrap"
                  sx={{ mt: 2 }}
                >
                  <LoadingButton
                    size="small"
                    startIcon={<MyLocationOutlinedIcon />}
                    loading={ubicando === sede.id}
                    onClick={() => usarMiUbicacion(sede.id)}
                  >
                    Tomar mi ubicación
                  </LoadingButton>
                  {movida && base && (
                    <Tooltip
                      title={`Valor original: ${base.lat}, ${base.lng}`}
                    >
                      <Chip
                        size="small"
                        label={`Movida ${formatearDistancia(
                          distanciaMetros(
                            { lat: base.lat, lng: base.lng },
                            { lat: sede.lat, lng: sede.lng }
                          )
                        )} del valor original`}
                      />
                    </Tooltip>
                  )}
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      <Box sx={{ mt: 3 }}>
        <LoadingButton
          variant="contained"
          loading={guardando}
          disabled={cargando || sedes.length === 0}
          onClick={guardar}
        >
          Guardar cambios
        </LoadingButton>
      </Box>

      <Snackbar
        open={Boolean(aviso)}
        autoHideDuration={5000}
        onClose={() => setAviso(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity={aviso?.tipo ?? "success"} sx={{ width: "100%" }}>
          {aviso?.texto}
        </Alert>
      </Snackbar>
    </Container>
  );
}
