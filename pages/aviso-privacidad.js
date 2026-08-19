import Head from 'next/head';
import Header from '../components/Header';

const SHOP_OWNER = process.env.NEXT_PUBLIC_SHOP_OWNER || 'el responsable de esta tienda';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || '';
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

export default function Privacidad() {
  return (
    <div>
      <Head>
        <title>Aviso de Privacidad | Bóveda Arcana</title>
        <meta name="robots" content="noindex, follow" />
      </Head>

      <Header active="PRIVACIDAD" cartCount={0} onCartClick={() => window.location.href = '/'} />

      <div className="hero">
        <div className="eyebrow">Bóveda Arcana</div>
        <h1>Aviso de Privacidad</h1>
        <p className="sub">Última actualización: agosto 2026</p>
      </div>

      <main style={{ maxWidth: 720 }}>
        <p>
          {SHOP_OWNER}, con domicilio en Ensenada, Baja California, México, es responsable del tratamiento
          de tus datos personales conforme a lo dispuesto en la Ley Federal de Protección de Datos Personales
          en Posesión de los Particulares.
        </p>

        <h2>¿Qué datos recabamos?</h2>
        <ul style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
          <li>Nombre</li>
          <li>Teléfono</li>
          <li>Correo electrónico</li>
          <li>Dirección (opcional, solo si creas una cuenta y la agregas tú mismo)</li>
          <li>Contraseña (si creas una cuenta) — se guarda siempre cifrada, nunca en texto plano</li>
        </ul>

        <h2>¿Para qué usamos tus datos?</h2>
        <p>
          Usamos tus datos únicamente para coordinar la compra y entrega de tus pedidos, contactarte por
          WhatsApp o correo sobre el estatus de tu compra, y —si creaste una cuenta— para que puedas ver
          tu historial de compras. No usamos tus datos para fines de mercadotecnia ni los vendemos ni
          compartimos con terceros ajenos a la operación de la tienda.
        </p>

        <h2>¿Con quién compartimos tus datos?</h2>
        <p>
          Solo con los proveedores necesarios para operar la tienda: el servicio de hospedaje (Vercel),
          la base de datos (Prisma Postgres) y el servicio de envío de correos (Resend), todos bajo sus
          propias políticas de seguridad y privacidad.
        </p>

        <h2>Tus derechos (ARCO)</h2>
        <p>
          Puedes solicitar en cualquier momento el Acceso, Rectificación, Cancelación u Oposición
          al tratamiento de tus datos personales. Si tienes una cuenta, puedes editar o eliminar tu
          información directamente en la sección "Mi cuenta". Para cualquier otra solicitud, contáctanos:
        </p>
        <ul style={{ color: 'var(--muted)', lineHeight: 1.8 }}>
          {CONTACT_EMAIL && <li>Correo: {CONTACT_EMAIL}</li>}
          {WA_NUMBER && <li>WhatsApp: {WA_NUMBER}</li>}
        </ul>

        <h2>Uso de cookies y almacenamiento local</h2>
        <p>
          Usamos almacenamiento del navegador (no cookies de rastreo) para recordar tu sesión si creaste
          una cuenta, tu preferencia de tema claro/oscuro, y el contenido de tu carrito de compras mientras
          navegas. Esta información no se comparte con nadie y puedes borrarla limpiando los datos de tu
          navegador en cualquier momento.
        </p>

        <h2>Cambios a este aviso</h2>
        <p>
          Este aviso de privacidad puede actualizarse en cualquier momento. Los cambios se publicarán en
          esta misma página.
        </p>
      </main>

      <footer>Bóveda Arcana</footer>
    </div>
  );
}
