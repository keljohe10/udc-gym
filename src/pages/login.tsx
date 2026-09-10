import { useState } from "react";
import { useRouter } from "next/router";
import {
  TextField,
  Container,
  Typography,
  Snackbar,
  Alert,
  Box,
} from "@mui/material";
import { LoadingButton } from "@mui/lab";
import { CLAVE_PISTA_ADMIN } from "../hooks/useAdminSession";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const router = useRouter();

  const handleLogin = async () => {
    setLoading(true);
    try {
      // La comparación de bcrypt ocurre en el servidor: el hash de la
      // contraseña ya no viaja al navegador.
      const respuesta = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, password }),
      });
      const datos = await respuesta.json().catch(() => ({}));

      if (respuesta.ok) {
        // Pista de UI. La sesión real es la cookie httpOnly que emite la route.
        localStorage.setItem(CLAVE_PISTA_ADMIN, "true");
        router.push("/history");
        return;
      }

      setErrorMsg(datos.mensaje ?? "Error al iniciar sesión");
      setOpen(true);
    } catch (error) {
      console.error(error);
      setErrorMsg("No pudimos conectar con el servidor. Verifica tu conexión.");
      setOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Iniciar Sesión
      </Typography>
      <Box sx={{ mt: 4 }}>
        <TextField
          fullWidth
          label="Usuario"
          margin="normal"
          value={usuario}
          onChange={(e) => setUsuario(e.target.value)}
        />
        <TextField
          fullWidth
          type="password"
          label="Contraseña"
          margin="normal"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <LoadingButton
          fullWidth
          variant="contained"
          loading={loading}
          onClick={handleLogin}
          sx={{ mt: 3 }}
        >
          Ingresar
        </LoadingButton>
      </Box>
      <Snackbar
        open={open}
        autoHideDuration={4000}
        onClose={() => setOpen(false)}
      >
        <Alert severity="error">{errorMsg}</Alert>
      </Snackbar>
    </Container>
  );
}
