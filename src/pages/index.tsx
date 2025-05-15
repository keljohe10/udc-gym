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
import { LoadingButton } from "@mui/lab";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
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
  const [user, setUser] = useState<any>(null);
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("id");
    if (!userId) {
      router.push("/register");
      return;
    }

    const fetchUser = async () => {
      const q = query(collection(db, "users"), where("id", "==", userId));
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
    if (!user || !branch) return;
    setLoading(true);

    const data = {
      userId: user.id,
      name: user.name,
      userType: user.userType,
      branch: branch,
      createdAt: serverTimestamp(),
      ...(user.department && { department: user.department }),
      ...(user.studentCode && { studentCode: user.studentCode }),
      ...(user.program && { program: user.program }),
    };

    try {
      await addDoc(collection(db, "history"), data);
      setIsRegistered(true);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      {user && (
        <>
          {!isRegistered ? (
            <>
              <Typography variant="h5" gutterBottom>
                Bienvenido, {user.name}
              </Typography>

              <Typography variant="subtitle1" gutterBottom>
                ¿En cuál sede te encuentras?
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel id="branch-label">Sede</InputLabel>
                <Select
                  labelId="branch-label"
                  value={branch}
                  label="Sede"
                  onChange={(e) => setBranch(e.target.value)}
                >
                  {sedes.map((sede) => (
                    <MenuItem key={sede} value={sede}>
                      {sede}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Box sx={{ mt: 4 }}>
                <LoadingButton
                  variant="contained"
                  loading={loading}
                  disabled={!branch}
                  onClick={handleIngreso}
                >
                  Registrar Ingreso
                </LoadingButton>
              </Box>
            </>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center">
              <CheckCircleOutlineOutlinedIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="h5" align="center">
                Ingreso exitosamente!
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
