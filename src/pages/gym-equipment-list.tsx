import React, { useEffect, useState } from "react";
import {
  Container,
  Typography,
  Box,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
} from "@mui/material";
import dayjs from "dayjs";
import { db } from "../firebase/config";
import {
  collection,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import branches, { EQUIPMENT_LIST } from "../data/branch";
import * as XLSX from "xlsx";

const ESTADOS = ["Bueno", "Regular", "Malo"];

export default function GymEquipmentListPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [equipos, setEquipos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [editDialog, setEditDialog] = useState<{ open: boolean; equipo: any | null }>({ open: false, equipo: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; equipo: any | null }>({ open: false, equipo: null });
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({ open: false, message: "", severity: "success" });
  const [filters, setFilters] = useState({ sede: "", estado: "", elemento: "" });

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("adminAuth");
    if (!isLoggedIn) {
      window.location.href = "/login";
    } else {
      setIsAdmin(true);
      fetchEquipos();
    }
    // eslint-disable-next-line
  }, []);

  const fetchEquipos = async () => {
    setLoading(true);
    const q = query(collection(db, "gymEquipment"), orderBy("fechaRevision", "desc"));
    const snapshot = await getDocs(q);
    setEquipos(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    setLoading(false);
  };

  const handleEdit = async () => {
    if (!editDialog.equipo) return;
    try {
      const ref = doc(db, "gymEquipment", editDialog.equipo.id);
      await updateDoc(ref, { estado: editDialog.equipo.estado });
      setSnackbar({ open: true, message: "Estado actualizado", severity: "success" });
      setEditDialog({ open: false, equipo: null });
      fetchEquipos();
    } catch (err) {
      setSnackbar({ open: true, message: "Error al actualizar", severity: "error" });
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.equipo) return;
    try {
      const ref = doc(db, "gymEquipment", deleteDialog.equipo.id);
      await deleteDoc(ref);
      setSnackbar({ open: true, message: "Implemento eliminado", severity: "success" });
      setDeleteDialog({ open: false, equipo: null });
      fetchEquipos();
    } catch (err) {
      setSnackbar({ open: true, message: "Error al eliminar", severity: "error" });
    }
  };

  // Filtros
  const filteredEquipos = equipos.filter((e) =>
    (!filters.sede || e.sede === filters.sede) &&
    (!filters.estado || e.estado === filters.estado) &&
    (!filters.elemento || e.elemento === filters.elemento)
  );

  // Contador por estado
  const contador = ESTADOS.reduce((acc, estado) => {
    acc[estado] = equipos.filter((e) => e.estado === estado).length;
    return acc;
  }, {} as Record<string, number>);

  const exportToExcel = () => {
    const worksheetData = filteredEquipos.map((item: any) => ({
      "Fecha de revisión": item.fechaRevision,
      "Instructor": item.instructor,
      "Sede": item.sede,
      "Elemento deportivo": item.elemento,
      "Estado actual": item.estado,
      "Descripción del deterioro o daños": item.descripcion,
      "Acciones recomendadas": item.acciones,
      "Observaciones adicionales": item.observaciones,
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Equipos");
    XLSX.writeFile(workbook, `equipos-gimnasio-${dayjs().format("YYYY-MM-DD")}.xlsx`);
  };

  if (!isAdmin) return null;

  return (
    <Container sx={{ mt: 5, mb: 5 }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Consulta y Gestión de Implementos Deportivos
      </Typography>
      <Box sx={{ mb: 2, display: "flex", gap: 2, flexWrap: "wrap" }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Filtrar Sede</InputLabel>
          <Select
            value={filters.sede}
            label="Filtrar Sede"
            onChange={(e) => setFilters((f) => ({ ...f, sede: e.target.value }))}
          >
            <MenuItem value="">Todas</MenuItem>
            {branches.map((sede) => (
              <MenuItem key={sede} value={sede}>{sede}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Filtrar Estado</InputLabel>
          <Select
            value={filters.estado}
            label="Filtrar Estado"
            onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
          >
            <MenuItem value="">Todos</MenuItem>
            {ESTADOS.map((estado) => (
              <MenuItem key={estado} value={estado}>{estado}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel>Filtrar Elemento</InputLabel>
          <Select
            value={filters.elemento}
            label="Filtrar Elemento"
            onChange={(e) => setFilters((f) => ({ ...f, elemento: e.target.value }))}
          >
            <MenuItem value="">Todos</MenuItem>
            {EQUIPMENT_LIST.map((el) => (
              <MenuItem key={el} value={el}>{el}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="outlined"
          onClick={exportToExcel}
          disabled={filteredEquipos.length === 0}
        >
          Exportar a Excel
        </Button>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1">Conteo por estado:</Typography>
        <Box sx={{ display: "flex", gap: 3 }}>
          {ESTADOS.map((estado) => (
            <Typography key={estado}>
              {estado}: <b>{contador[estado]}</b>
            </Typography>
          ))}
        </Box>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
              <TableCell>Fecha de revisión</TableCell>
              <TableCell>Instructor</TableCell>
              <TableCell>Sede</TableCell>
              <TableCell>Elemento</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Acciones recomendadas</TableCell>
              <TableCell>Observaciones</TableCell>
              <TableCell>Editar estado</TableCell>
              <TableCell>Eliminar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEquipos.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.fechaRevision}</TableCell>
                <TableCell>{e.instructor}</TableCell>
                <TableCell>{e.sede}</TableCell>
                <TableCell>{e.elemento}</TableCell>
                <TableCell>{e.estado}</TableCell>
                <TableCell>{e.descripcion}</TableCell>
                <TableCell>{e.acciones}</TableCell>
                <TableCell>{e.observaciones}</TableCell>
                <TableCell>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => setEditDialog({ open: true, equipo: { ...e } })}
                  >
                    Editar
                  </Button>
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    onClick={() => setDeleteDialog({ open: true, equipo: e })}
                  >
                    Eliminar
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredEquipos.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 20]}
        />
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={() => setEditDialog({ open: false, equipo: null })}>
        <DialogTitle>Editar estado del implemento</DialogTitle>
        <DialogContent>
          <FormControl sx={{ minWidth: 180, mt: 2 }}>
            <InputLabel>Estado actual</InputLabel>
            <Select
              value={editDialog.equipo?.estado || ""}
              label="Estado actual"
              onChange={(e) =>
                setEditDialog((d) => ({
                  ...d,
                  equipo: { ...d.equipo, estado: e.target.value },
                }))
              }
            >
              {ESTADOS.map((estado) => (
                <MenuItem key={estado} value={estado}>{estado}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog({ open: false, equipo: null })}>Cancelar</Button>
          <Button variant="contained" onClick={handleEdit}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, equipo: null })}>
        <DialogTitle>¿Eliminar implemento?</DialogTitle>
        <DialogContent>
          <Typography>Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, equipo: null })}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

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