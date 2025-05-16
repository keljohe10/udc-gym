// components/Header.tsx
import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";

export default function Header() {
  const isLoggedIn = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const auth = localStorage.getItem("adminAuth");
    isLoggedIn.current = !!auth;
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("adminAuth");
    isLoggedIn.current = false;
    router.push("/login");
  };

  return (
    <AppBar position="static" color="default">
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
         {isLoggedIn && router.pathname === "/history" && (
          <Box>
            <Button color="inherit" onClick={handleLogout}>
              Cerrar Sesión
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
