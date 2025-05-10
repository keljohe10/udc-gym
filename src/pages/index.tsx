import { Typography, Container } from '@mui/material';

export default function Home() {
  return (
    <Container maxWidth="sm" sx={{ mt: 10 }}>
      <Typography variant="h2" align="center" gutterBottom>
        Welcome
      </Typography>
    </Container>
  );
}
