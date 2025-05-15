// pages/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import {
  Container,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Box,
} from "@mui/material";
import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";

const sedes = ["Sede Norte", "Sede Centro", "Sede Sur"];

export default function Home() {
  const [codigo, setCodigo] = useState("");
  const [user, setUser] = useState<any>(null);
  const [sede, setSede] = useState("");
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("id");
    if (!userId) {
      router.push("/register");
      return;
    }
    setCodigo(userId);

    const fetchUser = async () => {
      const q = query(
        collection(db, "users"),
        where("id", "==", userId)
      );
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const userDoc = snapshot.docs[0];
        const user = { id: userDoc.id, ...userDoc.data() };
        setUser(user);
      } else {
        console.error("Usuario no encontrado");
        router.push("/register");
      }
    };

    fetchUser();
  }, [router]);

  const handleIngreso = async () => {
    if (!user || !sede) return;

    const data = {
      codigo: user.studentCode,
      nombre: user.name,
      userType: user.userType,
      program: user.program || null,
      department: user.department || null,
      sede,
      createdAt: serverTimestamp(),
    };

    await addDoc(collection(db, "history"), data);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      {user && (
        <>
          <Typography variant="h5" gutterBottom>
            Bienvenido, {user.name}
          </Typography>
          <Typography variant="subtitle1" gutterBottom>
            ¿En cuál sede te encuentras?
          </Typography>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel id="sede-label">Sede</InputLabel>
            <Select
              labelId="sede-label"
              value={sede}
              label="Sede"
              onChange={(e) => setSede(e.target.value)}
            >
              {sedes.map((sede) => (
                <MenuItem key={sede} value={sede}>
                  {sede}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              disabled={!sede}
              onClick={handleIngreso}
            >
              Registrar Ingreso
            </Button>
          </Box>
        </>
      )}
    </Container>
  );
}
