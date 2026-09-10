// components/BarrasCategoria.tsx
import { Box, Stack, Tooltip, Typography } from "@mui/material";

/** Azul de serie única, validado a >=3:1 sobre superficie clara. */
export const COLOR_SERIE = "#2a78d6";

export interface Categoria {
  etiqueta: string;
  valor: number;
  /** Texto largo para el tooltip cuando la etiqueta va recortada. */
  detalle?: string;
}

interface Props {
  datos: Categoria[];
  /** Total para calcular porcentajes; por defecto, la suma de los valores. */
  total?: number;
  vacio?: string;
}

/**
 * Barras horizontales de serie única. Cada barra lleva su valor escrito al lado,
 * así que la identidad nunca depende solo del color y no hace falta leyenda.
 */
export default function BarrasCategoria({ datos, total, vacio = "Sin datos" }: Props) {
  if (datos.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {vacio}
      </Typography>
    );
  }

  const maximo = Math.max(...datos.map((d) => d.valor), 1);
  const suma = total ?? datos.reduce((acc, d) => acc + d.valor, 0);

  return (
    <Stack spacing={1.25}>
      {datos.map((d) => {
        const porcentaje = suma > 0 ? Math.round((d.valor / suma) * 100) : 0;
        return (
          <Box key={d.etiqueta}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="baseline"
              gap={1}
            >
              <Tooltip title={d.detalle ?? d.etiqueta}>
                <Typography
                  variant="body2"
                  noWrap
                  sx={{ color: "text.primary", minWidth: 0 }}
                >
                  {d.etiqueta}
                </Typography>
              </Tooltip>
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", flexShrink: 0 }}
              >
                {d.valor.toLocaleString("es-CO")}
                <Box component="span" sx={{ ml: 0.75, opacity: 0.7 }}>
                  {porcentaje}%
                </Box>
              </Typography>
            </Stack>
            <Tooltip title={`${d.valor.toLocaleString("es-CO")} de ${suma.toLocaleString("es-CO")}`}>
              <Box
                sx={{
                  mt: 0.5,
                  height: 8,
                  borderRadius: "4px",
                  bgcolor: "action.hover",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${Math.max((d.valor / maximo) * 100, d.valor > 0 ? 2 : 0)}%`,
                    bgcolor: COLOR_SERIE,
                    borderRadius: "4px",
                  }}
                />
              </Box>
            </Tooltip>
          </Box>
        );
      })}
    </Stack>
  );
}
