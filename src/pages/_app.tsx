// pages/_app.tsx
import type { AppProps } from 'next/app';
import Header from '../components/Header';
import { CssBaseline } from '@mui/material';

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <CssBaseline />
      <Header />
      <Component {...pageProps} />
    </>
  );
}
