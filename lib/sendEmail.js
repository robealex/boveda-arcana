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
