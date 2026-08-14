# Bóveda Arcana — cómo publicarlo

Esta es una tienda real (no un artifact de Claude): tiene una página pública para
que cualquiera vea tus cartas y te contacte, y un panel `/admin` protegido por
contraseña donde solo tú buscas en Scryfall y agregas cartas.

## Lo que necesitas (todo gratis)

1. Una cuenta en [github.com](https://github.com)
2. Una cuenta en [vercel.com](https://vercel.com) (puedes entrar directo con tu cuenta de GitHub)
3. Node.js instalado en tu computadora (para probarlo antes de subirlo) — [nodejs.org](https://nodejs.org)

## Paso 1 — Súbelo a GitHub

1. Crea un repositorio nuevo y vacío en GitHub, por ejemplo `boveda-arcana`.
2. En tu computadora, dentro de esta carpeta, corre:
   ```
   git init
   git add .
   git commit -m "Bóveda Arcana"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/boveda-arcana.git
   git push -u origin main
   ```

## Paso 2 — Impórtalo en Vercel

1. Entra a vercel.com → **Add New → Project**.
2. Selecciona el repositorio `boveda-arcana` que acabas de subir.
3. Vercel detecta que es Next.js automáticamente. Dale **Deploy** (aún no funcionará
   del todo — falta la base de datos y las variables de entorno, pasos 3 y 4).

## Paso 3 — Crea la base de datos (guarda tu inventario)

Vercel ya no tiene Postgres propio; ahora se usa **Prisma Postgres** desde el Marketplace.

1. Dentro de tu proyecto en Vercel, ve a la pestaña **Storage** → **Create Database** (o "Connect Database") → elige **Prisma Postgres** → **Continue**.
2. Te va a aparecer un diálogo "Install Integration" con un campo **Custom Prefix**
   que por default dice `STORAGE` seguido de `_URL`. **Bórralo y escribe `DATABASE`**
   — así la variable final queda como `DATABASE_URL`, que es el nombre exacto
   que espera el código (Prisma en Vercel solo te deja poner el prefijo, el
   sufijo `_URL` es fijo).
3. Deja marcadas las casillas **Production** y **Preview**, deja el toggle
   **Sensitive** activado, y dale a conectar/crear.

## Paso 4 — Configura tus variables

En tu proyecto de Vercel: **Settings → Environment Variables**, agrega estas
(la de `DATABASE_URL` ya quedó puesta sola en el paso anterior, no la toques):

| Nombre | Valor | Ejemplo |
|---|---|---|
| `ADMIN_PASSWORD` | la contraseña que tú quieras para entrar a `/admin` | `MiTiendaSegura2026` |
| `NEXT_PUBLIC_WHATSAPP_NUMBER` | tu número con lada, sin espacios ni signos | `52646XXXXXXX` |
| `NEXT_PUBLIC_SHOP_OWNER` | tu nombre (aparece en la tienda) | `Osani` |

La tabla de la base de datos se crea sola en cada build (el comando de build
incluye `prisma db push`), así que no tienes que crear ninguna tabla a mano.

Guarda y ve a **Deployments → (los tres puntos del último deploy) → Redeploy**
para que tome las variables nuevas.

## Paso 5 — Listo

- Tu tienda pública: `https://TU-PROYECTO.vercel.app`
- Tu panel para agregar cartas: `https://TU-PROYECTO.vercel.app/admin`
  (te pedirá la contraseña que pusiste en `ADMIN_PASSWORD`)

Ahí sí el buscador de Scryfall funciona en vivo, porque la búsqueda la hace tu
servidor (la función en `pages/api/search-cards.js`), no el navegador del
cliente — por eso no lo bloquea nada.

## Opcional — dominio propio

En Vercel: **Settings → Domains**, agregas tu dominio (ej. `bovedaarcana.mx`)
comprado en Namecheap/GoDaddy, y sigues las instrucciones de DNS que te muestra.

## Opcional — Stripe

Al agregar una carta desde `/admin`, si le pegas un link de **Stripe Payment
Link** en el prompt correspondiente (edítalo directo en la base de datos, o
te agrego un campo extra si quieres), aparecerá el botón "Pagar con Stripe"
cuando esa carta esté sola en el carrito de un cliente.

## Actualizar el sitio después

Cualquier cambio que quieras (agregar el campo de Stripe al formulario de admin,
cambiar colores, etc.), lo edito aquí contigo y luego solo necesitas:
```
git add .
git commit -m "cambios"
git push
```
Vercel vuelve a publicar solo, automáticamente.
