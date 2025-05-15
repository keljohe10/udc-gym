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
  Stepper,
  Step,
  StepLabel,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { LoadingButton } from '@mui/lab';
import programs from '../data/program';

interface FormData {
  name: string;
  id: string;
  email: string;
  userType: 'docente' | 'estudiante';
  department?: string;
  studentCode?: string;
  program?: string;
}

const steps = ['Información Básica', 'Tipo de Usuario', 'Información Adicional'];

export default function RegisterStepper() {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    setError,
    watch,
    trigger,
  } = useForm<FormData>({ mode: 'onChange' });
  const router = useRouter();
  const userType = watch('userType');
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const validateStudentCode = async (studentCode: string) => {
    const q = query(collection(db, 'users'), where('studentCode', '==', studentCode));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const validateId = async (id: string) => {
    const q = query(collection(db, 'users'), where('id', '==', id));
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const onSubmit: SubmitHandler<FormData> = async (data) => {
    setLoading(true);
    const idIsValid = await validateId(data.id);
    if (!idIsValid) {
      setError('id', { type: 'manual', message: 'Este documento ya está registrado' });
      setLoading(false);
      return;
    }
    if (data.userType === 'estudiante') {
      const codeIsValid = await validateStudentCode(data.studentCode!);
      if (!codeIsValid) {
        setError('studentCode', { type: 'manual', message: 'Este código ya está registrado' });
        setLoading(false);
        return;
      }
    }

    try {
      await addDoc(collection(db, 'users'), {
        ...data,
        createdAt: serverTimestamp(),
      });
      localStorage.setItem('id', data.id);
      router.push('/success');
    } catch (error) {
      console.error('Error adding document:', error);
      setSnackbarMessage('Ocurrió un error al guardar. Intenta de nuevo.');
      setSnackbarSeverity('error');
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 0) {
      const isStepValid = await trigger(['name', 'id', 'email']);
      if (!isStepValid) return;
      const idValue = watch('id');
      if (idValue) {
        const idIsValid = await validateId(idValue);
        if (!idIsValid) {
          setError('id', { type: 'manual', message: 'Este documento ya está registrado' });
          return;
        }
      }
      setActiveStep((prev) => prev + 1);
    } else {
      const isStepValid = await trigger();
      if (isStepValid) {
        setActiveStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 5 }}>
      <Typography variant="h4" align="center" gutterBottom>
        Registro de Usuario - UDC Gym
      </Typography>
      <Stepper activeStep={activeStep} sx={{ mb: 3 }} alternativeLabel={isMobile}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {activeStep === 0 && (
          <Box>
            <TextField
              fullWidth
              label="Nombre"
              margin="normal"
              {...register('name', { required: 'El nombre es obligatorio' })}
              error={!!errors.name}
              helperText={errors.name?.message}
            />
            <TextField
              fullWidth
              label="Documento de Identidad"
              margin="normal"
              {...register('id', { required: 'El documento es obligatorio' })}
              error={!!errors.id}
              helperText={errors.id?.message}
            />
            <TextField
              fullWidth
              label="Correo Electrónico"
              margin="normal"
              type="email"
              {...register('email', {
                required: 'El correo es obligatorio',
                pattern: {
                  value: /^\S+@\S+$/i,
                  message: 'Correo no válido',
                },
              })}
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          </Box>
        )}

        {activeStep === 1 && (
          <FormControl fullWidth margin="normal" error={!!errors.userType}>
            <InputLabel id="user-type-label">Tipo de Usuario</InputLabel>
            <Controller
              name="userType"
              control={control}
              defaultValue="estudiante"
              rules={{ required: 'El tipo es obligatorio' }}
              render={({ field }) => (
                <Select {...field} labelId="user-type-label" label="Tipo de Usuario">
                  <MenuItem value="estudiante">Estudiante</MenuItem>
                  <MenuItem value="docente">Docente</MenuItem>
                </Select>
              )}
            />
            {errors.userType && (
              <Typography variant="caption" color="error">
                {errors.userType.message}
              </Typography>
            )}
          </FormControl>
        )}

        {activeStep === 2 && userType === 'docente' && (
          <Box>
            <TextField
              fullWidth
              label="Dependencia"
              margin="normal"
              {...register('department', { required: 'La dependencia es obligatoria' })}
              error={!!errors.department}
              helperText={errors.department?.message}
            />
          </Box>
        )}

        {activeStep === 2 && userType === 'estudiante' && (
          <Box>
            <TextField
              fullWidth
              label="Código de Estudiante"
              margin="normal"
              {...register('studentCode', { required: 'El código es obligatorio' })}
              error={!!errors.studentCode}
              helperText={errors.studentCode?.message}
            />
            <FormControl fullWidth margin="normal" error={!!errors.program}>
              <InputLabel id="program-label">Programa Académico</InputLabel>
              <Controller
                name="program"
                control={control}
                defaultValue=""
                rules={{ required: 'El programa es obligatorio' }}
                render={({ field }) => (
                  <Select {...field} labelId="program-label" label="Programa Académico">
                    {programs.map((program) => (
                      <MenuItem key={program} value={program}>
                        {program}
                      </MenuItem>
                    ))}
                  </Select>
                )}
              />
              {errors.program && (
                <Typography variant="caption" color="error">
                  {errors.program.message}
                </Typography>
              )}
            </FormControl>
          </Box>
        )}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
          <Button disabled={activeStep === 0} onClick={handleBack}>
            Atrás
          </Button>
          {activeStep === steps.length - 1 ? (
            <LoadingButton type="submit" variant="contained" loading={loading} disabled={!isValid || loading}>
              Registrar
            </LoadingButton>
          ) : (
            <Button variant="contained" onClick={handleNext} disabled={!isValid || loading}>
              Siguiente
            </Button>
          )}
        </Box>
      </form>

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