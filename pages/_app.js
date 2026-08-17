import Head from 'next/head';
import '../styles/globals.css';

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Bóveda Arcana" />
      </Head>

      <Component {...pageProps} />

      {WA_NUMBER && (
        <a
          href={`https://wa.me/${WA_NUMBER}`}
          target="_blank"
          rel="noreferrer"
          className="mobile-sticky-cta"
        >
          💬 Escríbenos por WhatsApp
        </a>
      )}
    </>
  );
}
