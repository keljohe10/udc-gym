import { Container, Typography } from "@mui/material";
import Image from "next/image";
import { useEffect } from "react";
import { useRouter } from "next/router";

export default function RegistroExitoso() {
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("id");
    if (!userId) router.push("/register");
  }, []);

  return (
    <Container maxWidth="sm" sx={{ textAlign: "center", mt: 8 }}>
      <Image
        src="https://cdn-icons-png.flaticon.com/512/845/845646.png"
        alt="Registro exitoso"
        width={150}
        height={150}
      />
      <Typography variant="h4" gutterBottom sx={{ mt: 4 }}>
        ¡Registro exitoso!
      </Typography>
      <Typography variant="body1" sx={{ mb: 4 }}>
        Tu información ha sido guardada correctamente. ¡Gracias por registrarte!
      </Typography>
    </Container>
  );
}
