// pages/bienestar.tsx
import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import { where } from "firebase/firestore";
import * as XLSX from "xlsx";
import { usePaginatedFirestore } from "../hooks/usePaginatedFirestore";
import { useAdminSession } from "../hooks/useAdminSession";
import BarrasCategoria, { type Categoria } from "../components/BarrasCategoria";
import { sedesActivas } from "../data/sedes";
import { partesColombia, ventanaDelMesColombia } from "../lib/fechas";

const SEDES = sedesActivas();
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const FRANJAS = [
  { etiqueta: "Madrugada (0-5)", desde: 0, hasta: 5 },
  { etiqueta: "Mañana (6-11)", desde: 6, hasta: 11 },
  { etiqueta: "Mediodía (12-14)", desde: 12, hasta: 14 },
  { etiqueta: "Tarde (15-18)", desde: 15, hasta: 18 },
  { etiqueta: "Noche (19-23)", desde: 19, hasta: 23 },
];

const perteneceASede = (registro: any, sedeId: string) => {
  const sede = SEDES.find((s) => s.id === sedeId);
  if (!sede) return true;
  return registro.sedeId ? registro.sedeId === sede.id : registro.branch === sede.nombre;
};

function Indicador({
  titulo,
  valor,
  nota,
}: {
  titulo: string;
  valor: string;
  nota?: string;
}) {
  return (
    <Card sx={{ flex: "1 1 180px", minWidth: 160 }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {titulo}
        </Typography>
        <Typography variant="h4" sx={{ lineHeight: 1.2 }}>
          {valor}
        </Typography>
        {nota && (
          <Typography variant="caption" color="text.secondary">
            {nota}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <Card sx={{ flex: "1 1 340px", minWidth: 280 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {titulo}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

export default function BienestarPage() {
  const [mes, setMes] = useState(dayjs().format("YYYY-MM"));
  const [filtroSede, setFiltroSede] = useState("");
  const sesion = useAdminSession();

  const { inicio, fin } = ventanaDelMesColombia(mes);
  const { allData, loading } = usePaginatedFirestore({
    path: "history",
    filters: [where("createdAt", ">=", inicio), where("createdAt", "<=", fin)],
    orderByField: "createdAt",
    pageSize: 1000,
  });

  const registros = useMemo(
    () =>
      filtroSede
        ? (allData as any[]).filter((r) => perteneceASede(r, filtroSede))
        : (allData as any[]),
    [allData, filtroSede]
  );

  const metricas = useMemo(() => {
    const total = registros.length;
    const usuarios = new Set(registros.map((r) => r.userId)).size;
    const verificados = registros.filter((r) => r.geoVerificado).length;
    const ambiguos = registros.filter((r) => r.registroAmbiguo).length;

    const contar = (clave: (r: any) => string | undefined) => {
      const mapa = new Map<string, number>();
      registros.forEach((r) => {
        const k = clave(r);
        if (!k) return;
        mapa.set(k, (mapa.get(k) ?? 0) + 1);
      });
      return mapa;
    };

    const porDia = contar((r) =>
      r.createdAt?.toDate ? partesColombia(r.createdAt.toDate()).dia : undefined
    );

    const porSede: Categoria[] = SEDES.map((s) => ({
      etiqueta: s.nombre,
      valor: registros.filter((r) =>
        r.sedeId ? r.sedeId === s.id : r.branch === s.nombre
      ).length,
    }))
      .filter((c) => c.valor > 0)
      .sort((a, b) => b.valor - a.valor);

    const porTipo: Categoria[] = [...contar((r) => r.userType)]
      .map(([etiqueta, valor]) => ({ etiqueta, valor }))
      .sort((a, b) => b.valor - a.valor);

    const porPrograma: Categoria[] = [...contar((r) => r.program || r.department)]
      .map(([etiqueta, valor]) => ({
        etiqueta: etiqueta.length > 34 ? `${etiqueta.slice(0, 34)}...` : etiqueta,
        detalle: etiqueta,
        valor,
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    const conteoDias = contar((r) =>
      r.createdAt?.toDate
        ? String(partesColombia(r.createdAt.toDate()).diaSemana)
        : undefined
    );
    // Lunes primero: es como se lee un calendario de actividad.
    const ordenSemana = [1, 2, 3, 4, 5, 6, 0];
    const porDiaSemana: Categoria[] = ordenSemana.map((d) => ({
      etiqueta: DIAS[d],
      valor: conteoDias.get(String(d)) ?? 0,
    }));

    const porFranja: Categoria[] = FRANJAS.map((f) => ({
      etiqueta: f.etiqueta,
      valor: registros.filter((r) => {
        if (!r.createdAt?.toDate) return false;
        const h = partesColombia(r.createdAt.toDate()).hora;
        return h >= f.desde && h <= f.hasta;
      }).length,
    })).filter((c) => c.valor > 0);

    return {
      total,
      usuarios,
      verificados,
      ambiguos,
      diasConActividad: porDia.size,
      porSede,
      porTipo,
      porPrograma,
      porDiaSemana,
      porFranja,
    };
  }, [registros]);

  const exportar = () => {
    const libro = XLSX.utils.book_new();
    const hoja = (nombre: string, filas: any[]) =>
      XLSX.utils.book_append_sheet(libro, XLSX.utils.json_to_sheet(filas), nombre);

    hoja("Resumen", [
      { Indicador: "Asistencias totales", Valor: metricas.total },
      { Indicador: "Usuarios únicos", Valor: metricas.usuarios },
      { Indicador: "Días con actividad", Valor: metricas.diasConActividad },
      { Indicador: "Registros verificados por GPS", Valor: metricas.verificados },
      { Indicador: "Registros ambiguos entre sedes", Valor: metricas.ambiguos },
      { Indicador: "Mes", Valor: mes },
      {
        Indicador: "Sede",
        Valor: filtroSede
          ? SEDES.find((s) => s.id === filtroSede)?.nombre ?? filtroSede
          : "Todas",
      },
    ]);
    const aFilas = (cs: Categoria[]) =>
      cs.map((c) => ({ Categoria: c.detalle ?? c.etiqueta, Asistencias: c.valor }));
    hoja("Por sede", aFilas(metricas.porSede));
    hoja("Por tipo de usuario", aFilas(metricas.porTipo));
    hoja("Por programa", aFilas(metricas.porPrograma));
    hoja("Por dia de la semana", aFilas(metricas.porDiaSemana));
    hoja("Por franja horaria", aFilas(metricas.porFranja));

    XLSX.writeFile(libro, `indicadores-${mes}.xlsx`);
  };

  if (sesion !== "autorizado") return null;

  const promedioDiario =
    metricas.diasConActividad > 0
      ? (metricas.total / metricas.diasConActividad).toFixed(1)
      : "0";
  const porcentajeVerificado =
    metricas.total > 0
      ? `${Math.round((metricas.verificados / metricas.total) * 100)}%`
      : "—";

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 6 }}>
      <Typography variant="h4" gutterBottom>
        Indicadores de Asistencia
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Bienestar Universitario · {dayjs(`${mes}-01`).format("MMMM [de] YYYY")}
      </Typography>

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap", gap: 2 }}>
        <FormControl sx={{ minWidth: 180 }} size="small">
          <InputLabel id="mes-label">Mes</InputLabel>
          <Select
            labelId="mes-label"
            label="Mes"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
          >
            {[...Array(12)].map((_, i) => {
              const d = dayjs().subtract(i, "month");
              return (
                <MenuItem key={d.format("YYYY-MM")} value={d.format("YYYY-MM")}>
                  {d.format("MMMM YYYY")}
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel id="sede-label">Sede</InputLabel>
          <Select
            labelId="sede-label"
            label="Sede"
            value={filtroSede}
            onChange={(e) => setFiltroSede(e.target.value)}
          >
            <MenuItem value="">Todas</MenuItem>
            {SEDES.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {s.nombre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={exportar} disabled={metricas.total === 0}>
          Exportar a Excel
        </Button>
      </Stack>

      {loading && <Typography>Cargando...</Typography>}

      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap", gap: 2 }}>
        <Indicador
          titulo="Asistencias"
          valor={metricas.total.toLocaleString("es-CO")}
        />
        <Indicador
          titulo="Usuarios únicos"
          valor={metricas.usuarios.toLocaleString("es-CO")}
          nota={
            metricas.usuarios > 0
              ? `${(metricas.total / metricas.usuarios).toFixed(1)} visitas por persona`
              : undefined
          }
        />
        <Indicador
          titulo="Promedio diario"
          valor={promedioDiario}
          nota={`${metricas.diasConActividad} días con actividad`}
        />
        <Indicador
          titulo="Verificado por GPS"
          valor={porcentajeVerificado}
          nota={
            metricas.ambiguos > 0
              ? `${metricas.ambiguos} registros ambiguos entre sedes`
              : undefined
          }
        />
      </Stack>

      <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: 2 }}>
        <Seccion titulo="Asistencias por sede">
          <BarrasCategoria datos={metricas.porSede} total={metricas.total} />
        </Seccion>
        <Seccion titulo="Por tipo de usuario">
          <BarrasCategoria datos={metricas.porTipo} total={metricas.total} />
        </Seccion>
        <Seccion titulo="Programa o dependencia (top 10)">
          <BarrasCategoria datos={metricas.porPrograma} total={metricas.total} />
        </Seccion>
        <Seccion titulo="Por día de la semana">
          <BarrasCategoria datos={metricas.porDiaSemana} total={metricas.total} />
        </Seccion>
        <Seccion titulo="Por franja horaria">
          <BarrasCategoria datos={metricas.porFranja} total={metricas.total} />
        </Seccion>
      </Stack>
    </Container>
  );
}
