const ADMIN_EMAIL = 'robealex@hotmail.com';

async function sendViaResend(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('RESEND_API_KEY no configurada, no se envió correo a', to);
    return;
  }
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'Bóveda Arcana <onboarding@resend.dev>',
        to: [to],
        subject,
        html
      })
    });
  } catch (e) {
    console.log('Error enviando correo:', e.message);
  }
}

export async function sendPasswordResetEmail(email, resetUrl) {
  const html = `
    <h2>Recuperar contraseña — Bóveda Arcana</h2>
    <p>Recibimos una solicitud para restablecer tu contraseña. Este link es válido por 1 hora:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>Si tú no pediste esto, puedes ignorar este correo.</p>
  `;
  await sendViaResend(email, 'Recupera tu contraseña — Bóveda Arcana', html);
}

export async function sendStockAlertEmails(item, emails) {
  const html = `
    <h2>¡"${item.name}" ya está disponible! — Bóveda Arcana</h2>
    <p>Nos pediste que te avisáramos cuando volviera a haber stock. Ya puedes comprarla en la tienda.</p>
  `;
  for (const email of emails) {
    await sendViaResend(email, `"${item.name}" ya está disponible — Bóveda Arcana`, html);
  }
}

export async function sendOrderEmails(order) {
  const itemsHtml = order.items.map(it => `<li>${it.name} x${it.qty} — $${Number(it.priceUsd).toFixed(2)} USD c/u</li>`).join('');
  const summary = `
    <h2>Nuevo pedido #${order.id} — Bóveda Arcana</h2>
    <p><b>Cliente:</b> ${order.customerName || 'Sin nombre'}<br/>
    <b>Teléfono:</b> ${order.customerPhone || '—'}<br/>
    <b>Email:</b> ${order.customerEmail || '—'}</p>
    <ul>${itemsHtml}</ul>
    <p><b>Total:</b> $${Number(order.totalUsd).toFixed(2)} USD</p>
    <p>Se apartó por 48 horas. Entra a tu panel de administrador para confirmar o cancelar.</p>
  `;

  await sendViaResend(ADMIN_EMAIL, `Nuevo pedido #${order.id} en Bóveda Arcana`, summary);

  if (order.customerEmail) {
    const customerHtml = `
      <h2>¡Gracias por tu pedido, ${order.customerName || ''}!</h2>
      <p>Apartamos estas cartas por 48 horas mientras confirmamos contigo por WhatsApp:</p>
      <ul>${itemsHtml}</ul>
      <p><b>Total:</b> $${Number(order.totalUsd).toFixed(2)} USD</p>
    `;
    await sendViaResend(order.customerEmail, `Tu pedido #${order.id} en Bóveda Arcana`, customerHtml);
  }
}

export async function sendCustomerWelcomeEmail(customer, siteUrl) {
  const html = `
    <h2>¡Bienvenido a Bóveda Arcana, ${customer.name}!</h2>
    <p>Tu cuenta se creó exitosamente con el correo <b>${customer.email}</b>.</p>
    <p>Ya puedes iniciar sesión para ver tu historial de compras y tus cartas favoritas.</p>
    ${siteUrl ? `<p><a href="${siteUrl}/cuenta">Entrar a mi cuenta</a></p>` : ''}
  `;
  await sendViaResend(customer.email, '¡Bienvenido a Bóveda Arcana!', html);
}

export async function sendStaffWelcomeEmail(staff, plainPassword, siteUrl) {
  const html = `
    <h2>Se creó tu cuenta de staff en Bóveda Arcana</h2>
    <p>Ya puedes entrar al panel de administrador con estas credenciales:</p>
    <p>
      <b>Correo:</b> ${staff.email}<br/>
      <b>Contraseña:</b> ${plainPassword}<br/>
      <b>Rol:</b> ${staff.role === 'owner' ? 'Dueño (acceso completo)' : 'Staff (acceso limitado)'}
    </p>
    <p>Entra en ${siteUrl ? `<a href="${siteUrl}/admin">${siteUrl}/admin</a>` : '/admin'}, pestaña "Staff", con tu correo y contraseña.</p>
    <p>Por seguridad, te recomendamos pedirle al dueño que te cambie la contraseña si la vas a compartir con alguien más.</p>
  `;
  await sendViaResend(staff.email, 'Tu cuenta de staff en Bóveda Arcana', html);
}
