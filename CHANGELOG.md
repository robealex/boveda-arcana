# Changelog — Bóveda Arcana

Registro de todo lo construido hasta esta versión.

## Base de la tienda
- Sitio real en Next.js + Vercel + Prisma Postgres (no un artifact de Claude — funciona con dominio propio, base de datos persistente y backend real).
- Búsqueda en vivo contra la API de Scryfall (hecha desde el servidor, así que no la bloquea el navegador).
- Catálogo público (`/`) y panel de administrador protegido por contraseña (`/admin`).
- Precios guardados siempre en USD; la tienda los convierte a MXN al momento de mostrarlos, usando el tipo de cambio del día (`/api/exchange-rate`).

## Inventario
- Agregar cartas por búsqueda en Scryfall, manualmente, o importando un **CSV masivo** (busca cada nombre automáticamente y deja revisar precio/cantidad/condición antes de guardar).
- Edición completa por carta: nombre, edición, imagen, precio, precio original (para ofertas), cantidad, condición, rareza, tipo, colores, **foil** (con ícono holográfico), **idioma**, link de pago Stripe, y notas internas (solo visibles para ti).
- Botón **Duplicar** para repetir una carta con otra condición/foil sin rebuscarla.
- **Historial de precios**: cada vez que agregas o editas el precio se guarda un snapshot (tu precio vs. precio de referencia de Scryfall).
- **Contador de vistas** por carta (cuántas veces la abrieron en la tienda).
- Vista de **tarjetas** o de **tabla editable tipo Excel** (edita varias cartas a la vez y guarda todo con un botón).
- Filtros por color (identidad exacta, con botón "Penta" para 5 colores), rareza y tipo. Orden por nombre, precio o más nuevas.
- Paginación de 20 en 20 (con flechas y puntos) en la tienda, en la tabla de admin, y en los resultados de búsqueda de Scryfall.
- Botón de **borrar toda la biblioteca**, con confirmación y cuenta regresiva de 5 segundos.

## Compras y pedidos
- Carrito con reserva temporal de **48 horas** al mandar el pedido — el stock no se resta de forma permanente hasta que confirmas la venta.
- Pestaña **Pedidos** en admin: ver, confirmar, cancelar, y **editar** pedidos pendientes (agregar/quitar cartas).
- Checkout con formulario (nombre, teléfono, correo) — **teléfono o correo son obligatorios** (al menos uno) para poder contactar al comprador.
- Botón "Pagar con Stripe" cuando el carrito trae una sola carta con link de pago configurado.
- Cartas agotadas se muestran atenuadas con badge "Agotado" y botón bloqueado, en vez de desaparecer.

## Cuentas
- Cuenta de cliente opcional (`/cuenta`): registro/login, historial real de compras, configuración de sus datos. **No es necesario tener cuenta para comprar.**
- Consulta de pedidos por teléfono sin necesidad de cuenta (`/mis-pedidos`).
- Pestaña **Usuarios** en admin: ver quién se registró, editar o eliminar sus datos.

## Notificaciones
- Correo automático a robealex@hotmail.com por cada pedido nuevo (vía Resend), y confirmación al cliente si dejó su correo.

## Presentación
- Modal de detalle al hacer clic en una carta: imagen, precio MXN/USD, colores, rareza, tipo, foil, idioma, cantidad disponible, y link a la ficha completa en Scryfall.
- Miniatura con imagen flotante al pasar el mouse (en las vistas de lista/tabla).
- Favicon y título de pestaña personalizados.
- Sección de contacto al pie de página.

## Decks (mazos completos)
- Sección separada de las cartas sueltas: catálogo público de decks (`/decks`) y detalle tipo Moxfield (`/decks/[id]`) con portada elegida, precio, y lista completa de cartas.
- Creación en admin: pegar la lista a mano (confiable, vía Scryfall), importar desde **Archidekt** (confiable, su API sí permite acceso automático), o importar desde Moxfield (poco confiable — bloquea peticiones automáticas con Cloudflare, puede fallar seguido).
- Suma total de las cartas de la lista siempre visible en pantalla mientras armas el deck, junto a los campos de precio.
- Precio de referencia calculado automático como la suma de las cartas del deck, con precio de venta editable y descuento visible en la página pública si vendes más barato que la suma.
- Cada carta del deck es editable individualmente (cantidad, condición, precio unitario) y la suma se recalcula en vivo.
- Botón "+ Agregar a inventario" por cada carta del deck que no esté en tu catálogo, sin salir del formulario.
- Reintentar búsquedas fallidas sin rehacer todo el deck, incluso reabriendo un deck ya guardado para editarlo.
- Al marcar un deck como vendido, se descuentan del inventario las cartas vinculadas; al reactivarlo, se regresan.
- Estadísticas visuales en la página pública del deck: gráfica de pastel de distribución de colores, y gráfica de barras de curva de maná.
- Toggle de vista lista/imágenes grandes en la lista de cartas del deck, con precio por carta visible.

## Precio automático y ofertas
- Precio sugerido según la condición de la carta (Near Mint, Lightly Played, etc.), con porcentajes configurables en `/admin` → Precios.
- Modo de precio de oferta (precio original tachado + precio rebajado), visible como badge de descuento llamativo en la tienda.
- Tipo de cambio USD→MXN automático (actualizado una vez al día) con opción de fijar uno manual.
- Descuento general programable para toda la tienda, con fecha de inicio/fin opcional y banner de aviso en la tienda pública.
- Vista previa del precio en pesos mientras escribes el precio en USD, en el admin.

## Historial, notas y estadísticas
- Historial de precios por carta (snapshot cada vez que se agrega o edita el precio).
- Contador de vistas por carta.
- Notas internas por carta, solo visibles para el administrador.
- Botón Duplicar para repetir una carta con otra condición/foil.
- Panel de Estadísticas: total vendido, cartas vendidas, ingresos por mes, cartas más vistas sin vender.
- Exportar a CSV: biblioteca completa de inventario, y pedidos confirmados (para contabilidad).
- Botón de borrar toda la biblioteca, con confirmación y cuenta regresiva de 5 segundos.
- Vista de tabla editable tipo Excel en el inventario, con acciones en bloque (cambiar precio por %, eliminar varias a la vez) y selección múltiple.

## Cuentas y notificaciones
- Recuperar contraseña de cuenta de cliente por correo (vía Resend).
- Aviso de restock: un cliente deja su correo en una carta agotada y le llega notificación automática cuando vuelve a haber stock.
- Recibo de pedido imprimible/PDF desde admin.
- Protección anti-abuso: máximo 5 pedidos por hora por teléfono, correo o IP.
- Correo obligatorio o teléfono obligatorio (al menos uno) para poder mandar un pedido.

## SEO y analítica
- Meta títulos y meta descripciones únicos por página.
- Un solo H1 por página, con jerarquía real de H2/H3.
- Sección de FAQ con datos estructurados (schema FAQPage) y datos estructurados de negocio local (schema Store) en la portada.
- Alt text descriptivo en todas las imágenes.
- `robots.txt` y `sitemap.xml` dinámico, más `llms.txt` para asistentes de IA.
- Botón de compartir (Web Share API) en cartas y decks.
- CTA fijo de WhatsApp en la versión móvil.
- Integración de Google Tag Manager (vía variable de entorno, sin código hardcodeado).
