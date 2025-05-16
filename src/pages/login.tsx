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
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/config";
import bcrypt from "bcryptjs";
import { LoadingButton } from "@mui/lab";

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
      const q = query(collection(db, "admin"), where("usuario", "==", usuario));
      const result = await getDocs(q);

      if (!result.empty) {
        const adminDoc = result.docs[0].data();
        const passwordValida = await bcrypt.compare(
          password,
          adminDoc.password
        );

        if (passwordValida) {
          localStorage.setItem("adminAuth", "true");
          router.push("/history");
        } else {
          setErrorMsg("Contraseña incorrecta");
          setOpen(true);
        }
      } else {
        setErrorMsg("Usuario no encontrado");
        setOpen(true);
      }
    } catch (error) {
      console.error(error);
      setErrorMsg("Error al iniciar sesión");
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
