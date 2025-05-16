// pages/history.tsx
import {
  Container,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TablePagination,
  Select,
  MenuItem,
  Box,
  Button,
  Tooltip,
} from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { where } from "firebase/firestore";
import { usePaginatedFirestore } from "../hooks/usePaginatedFirestore";
import * as XLSX from "xlsx";

export default function HistoryPage() {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const router = useRouter();

  useEffect(() => {
    const isLoggedIn = localStorage.getItem("adminAuth");
    if (!isLoggedIn) {
      router.push("/login");
    }
  }, [router]);

  const [year, month] = selectedMonth.split("-");
  const start = dayjs(`${year}-${month}-01`).startOf("month").toDate();
  const end = dayjs(start).endOf("month").toDate();

  const { data, page, totalDocs, pageSize, goToPage } = usePaginatedFirestore({
    path: "history",
    filters: [where("createdAt", ">=", start), where("createdAt", "<=", end)],
    orderByField: "createdAt",
    pageSize: 20,
  });

  const exportToExcel = () => {
    const worksheetData = data.map((item: any) => ({
      Codigo: item.studentCode || "N/A",
      Nombre: item.name,
      "Tipo de usuario": item.userType,
      Programa: item.program || "N/A",
      Dependencia: item.department || "N/A",
      Sede: item.branch,
      "Fecha de Acceso": dayjs(item.createdAt.toDate()).format(
        "YYYY-MM-DD HH:mm"
      ),
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Historial");
    XLSX.writeFile(workbook, `historial-${selectedMonth}.xlsx`);
  };

  return (
    <Container sx={{ mt: 5 }}>
      <Typography sx={{ mb: 3 }} variant="h4">
        Historial de Asistencias
      </Typography>
      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <Select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
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

        <Button
          variant="outlined"
          onClick={exportToExcel}
          disabled={data.length === 0}
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
              <TableCell sx={{ fontWeight: "bold" }}>Fecha de Acceso</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((item: any) => (
              <TableRow key={item.id}>
                <TableCell>{item.studentCode || "N/A"}</TableCell>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.userType}</TableCell>
                <TableCell>
                  <Tooltip
                    title={
                      item.userType === "estudiante"
                        ? item.program || ""
                        : item.department || ""
                    }
                  >
                    <span>
                      {(item.userType === "estudiante"
                        ? item.program
                        : item.department
                      )?.length > 30
                        ? (item.userType === "estudiante"
                            ? item.program
                            : item.department
                          ).slice(0, 30) + "..."
                        : item.userType === "estudiante"
                        ? item.program
                        : item.department}
                    </span>
                  </Tooltip>
                </TableCell>
                <TableCell>{item.branch}</TableCell>
                <TableCell>
                  {dayjs(item.createdAt.toDate()).format("DD/MM/YYYY HH:mm")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={totalDocs}
          page={page}
          onPageChange={(_, newPage) => goToPage(newPage)}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[pageSize]}
        />
      </Box>
    </Container>
  );
}
