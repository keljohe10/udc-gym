import { useForm, SubmitHandler } from 'react-hook-form';
import { Container, TextField, Button, Typography, Box, Snackbar, Alert } from '@mui/material';
import { db } from '../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { useState } from 'react';

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
    formState: { errors },
  } = useForm<FormData>();

  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    try {
      const docRef = await addDoc(collection(db, 'students'), data);
      console.log('Document written with ID: ', docRef.id);
      setSnackbarMessage('¡Registro guardado exitosamente!');
      setSnackbarSeverity('success');
      setOpenSnackbar(true);
      reset();
    } catch (error) {
      console.error('Error adding document: ', error);
      setSnackbarMessage('Ocurrió un error al guardar. Intenta de nuevo.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
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
        />

        <TextField
          fullWidth
          label="Programa Académico"
          margin="normal"
          {...register('programa', { required: 'El programa es obligatorio' })}
          error={!!errors.programa}
          helperText={errors.programa?.message}
        />

        <Button type="submit" fullWidth variant="contained" sx={{ mt: 3 }}>
          Registrar
        </Button>
      </Box>

      <Snackbar
        open={openSnackbar}
        autoHideDuration={4000}
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
