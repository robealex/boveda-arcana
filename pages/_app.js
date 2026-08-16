import Head from 'next/head';
import '../styles/globals.css';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>Bóveda Arcana — Cartas de Magic: The Gathering en venta</title>
        <meta name="description" content="Colección personal de cartas de Magic: The Gathering en venta en Ensenada, México. Busca por color, rareza, tipo y precio." />
        <meta property="og:title" content="Bóveda Arcana" />
        <meta property="og:description" content="Cartas de Magic: The Gathering en venta." />
        <meta property="og:type" content="website" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
