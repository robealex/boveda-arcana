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
