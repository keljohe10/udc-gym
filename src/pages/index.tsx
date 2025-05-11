import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";
import { Container, Typography, Box } from "@mui/material";
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';

export default function Home() {
  const router = useRouter();
  const [message, setMessage] = useState("Verificando...");

  useEffect(() => {
    const checkStudent = async () => {
      const studentCode = localStorage.getItem("studentCode");

      if (!studentCode) {
        router.push("/register");
        return;
      }

      const q = query(
        collection(db, "students"),
        where("codigo", "==", studentCode)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const studentDoc = querySnapshot.docs[0].data();
        const programa = studentDoc.programa;
        const studentName = studentDoc.nombre;

        // Guardar en history
        await addDoc(collection(db, "history"), {
          codigo: studentCode,
          programa: programa,
          nombre: studentName,
          fechaAcceso: serverTimestamp(),
        });

        setMessage("Ingreso exitosamente.");
      } else {
        router.push("/register");
      }
    };

    checkStudent();
  }, [router]);

  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Box display="flex" justifyContent="center" alignItems="center">
        {message === 'Ingreso exitosamente.' && (
          <CheckCircleOutlineOutlinedIcon color="success" sx={{ mr: 1 }} />
        )}
        <Typography variant="h5" align="center">
          {message}
        </Typography>
      </Box>
    </Container>
  );
}
