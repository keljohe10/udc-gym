// components/Header.tsx
import { AppBar, Toolbar, Typography, Box, Button, IconButton, Drawer, List, ListItem, ListItemButton, ListItemText, Divider } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const navLinks = [
  { label: "Registro de Asistencias", href: "/history" },
  { label: "Consulta de Equipamientos", href: "/gym-equipment-list" },
  { label: "Registro de Equipamientos", href: "/gym-equipment" },
];

export default function Header() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    const auth = localStorage.getItem("adminAuth");
    setIsLoggedIn(!!auth);
  }, [typeof window !== "undefined" && localStorage.getItem("adminAuth")]);

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    setIsLoggedIn(false);
    router.push("/login");
    setDrawerOpen(false);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen((prev) => !prev);
  };

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation" onClick={() => setDrawerOpen(false)}>
      <List>
        {navLinks.map((item) => (
          <ListItem key={item.href} disablePadding>
            <ListItemButton component={Link} href={item.href}>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton onClick={handleLogout}>
            <ListItemText primary="Cerrar Sesión" />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  return (
    <AppBar position="static" color="transparent">
      <Toolbar sx={{ display: "flex", justifyContent: "space-between" }}>
        <Box>
          <Link
            href="/"
            passHref
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Image
                src="/next.svg"
                alt="Logo de la App"
                width={40}
                height={40}
                priority
              />
            </Box>
          </Link>
        </Box>
        {isLoggedIn && (
          isMobile ? (
            <>
              <IconButton
                color="inherit"
                edge="end"
                onClick={handleDrawerToggle}
                aria-label="menu"
              >
                <MenuIcon />
              </IconButton>
              <Drawer
                anchor="right"
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
              >
                {drawer}
              </Drawer>
            </>
          ) : (
            <Box sx={{ display: "flex", gap: 2 }}>
              {navLinks.map((item) => (
                <Button key={item.href} color="inherit" component={Link} href={item.href}>
                  {item.label}
                </Button>
              ))}
              <Button color="inherit" onClick={handleLogout}>
                Cerrar Sesión
              </Button>
            </Box>
          )
        )}
      </Toolbar>
    </AppBar>
  );
}
