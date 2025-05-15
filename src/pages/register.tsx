import { useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useRouter } from 'next/router';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Container,
  TextField,
  Typography,
  Box,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import programas from '../data/programas';

interface FormData {
  nombre: string;
  documento: string;
  correo: string;
  codigo: string;
  programa: string;
}

export default function Register() {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
    setError,
    clearErrors,
    trigger,
  } = useForm<FormData>();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const validateCodigo = async (codigo: string) => {
    const q = query(collection(db, 'students'), where('codigo', '==', codigo));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    const isValid = await validateCodigo(data.codigo);

    if (!isValid) {
      setError('codigo', { type: 'manual', message: 'Este código ya está registrado' });
      setLoading(false);
      return;
    }

    try {
      await addDoc(collection(db, 'students'), {
        ...data,
        createdAt: serverTimestamp(),
      });

      localStorage.setItem('studentCode', data.codigo);
      setSnackbarMessage('¡Registro exitoso!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      reset();
    } catch (error) {
      console.error('Error adding document: ', error);
      setSnackbarMessage('Ocurrió un error al guardar. Intenta de nuevo.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCodigoBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      const isValid = await validateCodigo(value);
      if (!isValid) {
        setError('codigo', { type: 'manual', message: 'Este código ya está registrado' });
      } else {
        clearErrors('codigo');
      }
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Registro de Estudiante
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Nombre"
          margin="normal"
          {...register('nombre', { required: 'El nombre es obligatorio' })}
          error={!!errors.nombre}
          helperText={errors.nombre?.message}
        />

        <TextField
          fullWidth
          label="Documento de Identidad"
          margin="normal"
          {...register('documento', { required: 'El documento es obligatorio' })}
          error={!!errors.documento}
          helperText={errors.documento?.message}
        />

        <TextField
          fullWidth
          label="Correo Electrónico"
          margin="normal"
          type="email"
          {...register('correo', {
            required: 'El correo es obligatorio',
            pattern: {
              value: /^\S+@\S+$/i,
              message: 'Correo no válido',
            },
          })}
          error={!!errors.correo}
          helperText={errors.correo?.message}
        />

        <TextField
          fullWidth
          label="Código de Estudiante"
          margin="normal"
          {...register('codigo', { required: 'El código es obligatorio' })}
          error={!!errors.codigo}
          helperText={errors.codigo?.message}
          onBlur={handleCodigoBlur}
        />

        <FormControl fullWidth margin="normal" error={!!errors.programa}>
          <InputLabel id="programa-label">Programa Académico</InputLabel>
          <Controller
            name="programa"
            control={control}
            defaultValue=""
            rules={{ required: 'El programa es obligatorio' }}
            render={({ field }) => (
              <Select
                {...field}
                labelId="programa-label"
                label="Programa Académico"
              >
                {programas.map((programa) => (
                  <MenuItem key={programa} value={programa}>
                    {programa}
                  </MenuItem>
                ))}
              </Select>
            )}
          />
          {errors.programa && (
            <Typography variant="caption" color="error">
              {errors.programa.message}
            </Typography>
          )}
        </FormControl>

        <LoadingButton
          type="submit"
          fullWidth
          variant="contained"
          sx={{ mt: 3 }}
          loading={loading}
        >
          Registrar
        </LoadingButton>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={3000}
        onClose={() => setOpenSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setOpenSnackbar(false)}
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}