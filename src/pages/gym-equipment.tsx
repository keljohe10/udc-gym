import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  TextField,
  FormControl,
  InputLabel,
  Snackbar,
  Alert,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import dayjs from "dayjs";
import { db } from "../firebase/config";
import { collection, addDoc } from "firebase/firestore";
import branches, { EQUIPMENT_LIST } from "../data/branch";

const ESTADOS = ["Bueno", "Regular", "Malo"];

export default function GymEquipmentRegisterPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [form, setForm] = useState({
    fechaRevision: dayjs().format("YYYY-MM-DD"),
    instructor: "",
    sede: branches[0] || "",
    elemento: EQUIPMENT_LIST[0] || "",
    estado: ESTADOS[0],
    descripcion: "",
    acciones: "",
    observaciones: "",
  });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [loading, setLoading] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("adminAuth");
    if (!isLoggedIn) {
      window.location.href = "/login";
    } else {
      setIsAdmin(true);
    }
    // eslint-disable-next-line
  }, []);

  const handleFormChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "gymEquipment"), form);
      setSnackbar({ open: true, message: "Registro guardado", severity: "success" });
      setForm({
        fechaRevision: dayjs().format("YYYY-MM-DD"),
        instructor: "",
        sede: branches[0] || "",
        elemento: EQUIPMENT_LIST[0] || "",
        estado: ESTADOS[0],
        descripcion: "",
        acciones: "",
        observaciones: "",
      });
    } catch (err) {
      setSnackbar({ open: true, message: "Error al guardar", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) return null;

  return (
    <Container maxWidth="sm" sx={{ mt: 5, mb: 5, display: "flex", flexDirection: "column", alignItems: "center" }}>
      <Typography variant="h4" sx={{ mb: 3, textAlign: "center" }}>
        Registro de Implementos Deportivos
      </Typography>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: "100%",
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          background: "#fff",
          p: { xs: 2, sm: 3 },
          borderRadius: 3,
          boxShadow: 3,
        }}
      >
        <TextField
          label="Fecha de revisión"
          type="date"
          name="fechaRevision"
          value={form.fechaRevision}
          onChange={handleFormChange}
          InputLabelProps={{ shrink: true }}
          required
          fullWidth
        />
        <TextField
          label="Nombre del instructor"
          name="instructor"
          value={form.instructor}
          onChange={handleFormChange}
          required
          fullWidth
        />
        <FormControl fullWidth>
          <InputLabel>Sede</InputLabel>
          <Select name="sede" value={form.sede} label="Sede" onChange={handleFormChange} required>
            {branches.map((sede) => (
              <MenuItem key={sede} value={sede}>{sede}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Elemento deportivo</InputLabel>
          <Select name="elemento" value={form.elemento} label="Elemento deportivo" onChange={handleFormChange} required>
            {EQUIPMENT_LIST.map((el) => (
              <MenuItem key={el} value={el}>{el}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>Estado actual</InputLabel>
          <Select name="estado" value={form.estado} label="Estado actual" onChange={handleFormChange} required>
            {ESTADOS.map((estado) => (
              <MenuItem key={estado} value={estado}>{estado}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Descripción del deterioro o daños"
          name="descripcion"
          value={form.descripcion}
          onChange={handleFormChange}
          multiline
          minRows={2}
          fullWidth
        />
        <TextField
          label="Acciones recomendadas"
          name="acciones"
          value={form.acciones}
          onChange={handleFormChange}
          multiline
          minRows={2}
          fullWidth
        />
        <TextField
          label="Observaciones adicionales"
          name="observaciones"
          value={form.observaciones}
          onChange={handleFormChange}
          multiline
          minRows={2}
          fullWidth
        />
        <Button
          type="submit"
          variant="contained"
          sx={{ alignSelf: "center", minWidth: 180, mt: 2 }}
          disabled={loading}
        >
          {loading ? "Guardando..." : "Guardar registro"}
        </Button>
      </Box>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
} 