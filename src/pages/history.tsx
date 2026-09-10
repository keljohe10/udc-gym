// pages/history.tsx
import {
  Box,
  Button,
  Chip,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { where } from "firebase/firestore";
import { usePaginatedFirestore } from "../hooks/usePaginatedFirestore";
import { useAdminSession } from "../hooks/useAdminSession";
import { sedesActivas } from "../data/sedes";
import { ventanaDelMesColombia } from "../lib/fechas";
import * as XLSX from "xlsx";

const SEDES = sedesActivas();
const TAMANO_PAGINA = 20;

/** Los registros anteriores al modelo de sedes solo tienen `branch`. */
const perteneceASede = (registro: any, sedeId: string) => {
  const sede = SEDES.find((s) => s.id === sedeId);
  if (!sede) return true;
  return registro.sedeId
    ? registro.sedeId === sede.id
    : registro.branch === sede.nombre;
};

export default function HistoryPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [filtroSede, setFiltroSede] = useState("");
  const [page, setPage] = useState(0);
  const sesion = useAdminSession();

  const { inicio, fin } = ventanaDelMesColombia(selectedMonth);

  const { allData } = usePaginatedFirestore({
    path: "history",
    filters: [where("createdAt", ">=", inicio), where("createdAt", "<=", fin)],
    orderByField: "createdAt",
    pageSize: TAMANO_PAGINA,
  });

  // El hook ya trajo el mes completo a memoria: filtrar aquí no cuesta lecturas
  // adicionales ni obliga a crear un índice compuesto por sede.
  const registros = useMemo(
    () =>
      filtroSede
        ? (allData as any[]).filter((r) => perteneceASede(r, filtroSede))
        : (allData as any[]),
    [allData, filtroSede]
  );

  const visibles = registros.slice(
    page * TAMANO_PAGINA,
    page * TAMANO_PAGINA + TAMANO_PAGINA
  );

  const exportToExcel = () => {
    // Exporta el mes completo filtrado, no solo la página en pantalla.
    const worksheetData = registros.map((item: any) => ({
      Codigo: item.studentCode || "N/A",
      Nombre: item.name,
      "Tipo de usuario": item.userType,
      Programa: item.program || "N/A",
      Dependencia: item.department || "N/A",
      Sede: item.branch,
      "Fecha de Acceso": dayjs(item.createdAt.toDate()).format(
        "YYYY-MM-DD HH:mm"
      ),
      "Distancia (m)":
        typeof item.distanciaMetros === "number" ? item.distanciaMetros : "N/A",
      "Precisión (m)":
        typeof item.precisionMetros === "number"
          ? Math.round(item.precisionMetros)
          : "N/A",
      "Ubicación verificada": item.geoVerificado ? "Sí" : "No",
      "Registro ambiguo": item.registroAmbiguo ? "Sí" : "No",
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
    XLSX.writeFile(workbook, `historial-${selectedMonth}.xlsx`);
  };

  if (sesion !== "autorizado") return null;

  return (
    <Container sx={{ mt: 5 }}>
      <Typography sx={{ mb: 3 }} variant="h4">
        Historial de Asistencias
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Select
          value={selectedMonth}
          onChange={(e) => {
            setSelectedMonth(e.target.value);
            setPage(0);
          }}
        >
          {[...Array(12)].map((_, i) => {
            const date = dayjs().subtract(i, "month");
            const value = date.format("YYYY-MM");
            return (
              <MenuItem key={value} value={value}>
                {date.format("MMMM YYYY")}
              </MenuItem>
            );
          })}
        </Select>

        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel id="sede-label">Sede</InputLabel>
          <Select
            labelId="sede-label"
            label="Sede"
            value={filtroSede}
            onChange={(e) => {
              setFiltroSede(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            {SEDES.map((sede) => (
              <MenuItem key={sede.id} value={sede.id}>
                {sede.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={exportToExcel}
          disabled={registros.length === 0}
        >
          Exportar a Excel
        </Button>
      </Box>

      <Box sx={{ overflowX: "auto" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
              <TableCell sx={{ fontWeight: "bold" }}>Código</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Nombre</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Tipo de usuario</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>
                Programa - Dependencia
              </TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Sede</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Ubicación</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Fecha de Acceso</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibles.map((item: any) => {
              const detalle =
                item.userType === "estudiante" ? item.program : item.department;
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.studentCode || "N/A"}</TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.userType}</TableCell>
                  <TableCell>
                    <Tooltip title={detalle || ""}>
                      <span>
                        {detalle && detalle.length > 30
                          ? `${detalle.slice(0, 30)}...`
                          : detalle}
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{item.branch}</TableCell>
                  <TableCell>
                    {item.geoVerificado ? (
                      <Tooltip
                        title={
                          typeof item.precisionMetros === "number"
                            ? `Precisión ±${Math.round(item.precisionMetros)} m`
                            : ""
                        }
                      >
                        <Chip
                          size="small"
                          color={item.registroAmbiguo ? "warning" : "success"}
                          variant="outlined"
                          label={
                            typeof item.distanciaMetros === "number"
                              ? `a ${item.distanciaMetros} m`
                              : "Verificada"
                          }
                        />
                      </Tooltip>
                    ) : (
                      <Chip size="small" variant="outlined" label="Sin verificar" />
                    )}
                  </TableCell>
                  <TableCell>
                    {dayjs(item.createdAt.toDate()).format("DD/MM/YYYY HH:mm")}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={registros.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={TAMANO_PAGINA}
          rowsPerPageOptions={[TAMANO_PAGINA]}
        />
      </Box>
    </Container>
  );
}
