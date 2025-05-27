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
import branches from "../data/branch";
import dayjs from "dayjs";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [branch, setBranch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState({
    value: false,
    message: "",
  });
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem("id");
    if (!userId) {
      router.push({
        pathname: "/register",
        query: { attendance: "true" },
      });
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
        router.push({
          pathname: "/register",
          query: { attendance: "true" },
        });
      }
    };

    fetchUser();
  }, [router]);

  const handleIngreso = async () => {
    if (!user || !branch) return;
    setLoading(true);

    const startOfDay = dayjs().startOf("day").toDate();
    const endOfDay = dayjs().endOf("day").toDate();
    const q = query(
      collection(db, "history"),
      where("userId", "==", user.id),
      where("branch", "==", branch),
      where("createdAt", ">=", startOfDay),
      where("createdAt", "<=", endOfDay)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      setLoading(false);
      setIsRegistered({
        value: true,
        message: "Ya has registrado tu asistencia hoy en esta sede.",
      });
      return;
    }

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
      setIsRegistered({
        value: true,
        message: "Asistencia registrada!",
      });
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  return (
    <Container sx={{ mt: 5 }}>
      {user && (
        <>
          {!isRegistered.value ? (
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
                  {branches.map((branch: string) => (
                    <MenuItem key={branch} value={branch}>
                      {branch}
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
                {isRegistered.message}
              </Typography>
            </Box>
          )}
        </>
      )}
    </Container>
  );
}
