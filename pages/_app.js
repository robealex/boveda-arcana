import Head from 'next/head';
import Script from 'next/script';
import '../styles/globals.css';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Bóveda Arcana" />
      </Head>

      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}');
            `}
          </Script>
        </>
      )}

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
