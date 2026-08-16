import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';
import { getCustomerIdFromReq } from '../../lib/customerAuth';
import { sendOrderEmails } from '../../lib/sendEmail';

const HOLD_HOURS = 48;

async function getAvailable(inventoryId, excludeOrderId) {
  const item = await prisma.inventory.findUnique({ where: { id: inventoryId } });
  if (!item) return { item: null, available: 0 };
  const reserved = await prisma.orderItem.aggregate({
    where: {
      inventoryId,
      order: {
        status: 'pending',
        expiresAt: { gt: new Date() },
        ...(excludeOrderId ? { id: { not: excludeOrderId } } : {})
      }
    },
    _sum: { qty: true }
  });
  return { item, available: Math.max(0, item.qty - (reserved._sum.qty || 0)) };
}

async function recomputeTotal(orderId) {
  const items = await prisma.orderItem.findMany({ where: { orderId } });
  const totalUsd = items.reduce((s, it) => s + Number(it.priceUsd) * it.qty, 0);
  await prisma.order.update({ where: { id: orderId }, data: { totalUsd } });
}

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const { items, customerName, customerPhone, customerEmail } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Carrito vacío' });
    }

    const customerId = getCustomerIdFromReq(req);
    let account = null;
    if (customerId) account = await prisma.customer.findUnique({ where: { id: customerId } });

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress || null;
    const effectivePhone = (account?.phone) || customerPhone || null;
    const effectiveEmail = (account?.email) || customerEmail || null;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await prisma.order.count({
      where: {
        createdAt: { gt: oneHourAgo },
        OR: [
          ...(effectivePhone ? [{ customerPhone: effectivePhone }] : []),
          ...(effectiveEmail ? [{ customerEmail: effectiveEmail }] : []),
          ...(ip ? [{ ipAddress: ip }] : [])
        ]
      }
    });
    if (recentCount >= 5) {
      return res.status(429).json({ error: 'Has hecho varios pedidos en la última hora. Espera un poco o contáctanos directo por WhatsApp para seguir comprando.' });
    }

    const lines = [];
    for (const raw of items) {
      const id = parseInt(raw.id);
      const wanted = parseInt(raw.qty);
      if (!id || !wanted || wanted <= 0) continue;
      const { item, available } = await getAvailable(id);
      if (!item) return res.status(400).json({ error: `Una de las cartas ya no existe en el inventario.` });
      if (available < wanted) {
        return res.status(409).json({ error: `Ya no hay suficiente stock de "${item.name}" (quedan ${available} disponibles). Ajusta tu carrito.` });
      }
      lines.push({ id, name: item.name, qty: wanted, priceUsd: item.price });
    }

    if (lines.length === 0) return res.status(400).json({ error: 'Carrito vacío' });

    const totalUsd = lines.reduce((s, l) => s + Number(l.priceUsd) * l.qty, 0);
    const expiresAt = new Date(Date.now() + HOLD_HOURS * 60 * 60 * 1000);

    const order = await prisma.order.create({
      data: {
        status: 'pending',
        expiresAt,
        totalUsd,
        customerName: (account?.name) || customerName || null,
        customerPhone: (account?.phone) || customerPhone || null,
        customerEmail: (account?.email) || customerEmail || null,
        customerId: account?.id || null,
        ipAddress: ip,
        items: { create: lines.map(l => ({ inventoryId: l.id, name: l.name, qty: l.qty, priceUsd: l.priceUsd })) }
      },
      include: { items: true }
    });

    sendOrderEmails(order).catch(() => {});

    return res.status(201).json({ order, expiresAt });
  }

  if (req.method === 'GET') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const orders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      include: { items: true }
    });
    return res.status(200).json({ orders });
  }

  if (req.method === 'PATCH') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const { id } = req.query;
    const orderId = parseInt(id);
    if (!orderId) return res.status(400).json({ error: 'Falta id' });
    const { status, action, inventoryId, qty, orderItemId } = req.body;

    const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

    // Cambiar estado (confirmar / cancelar)
    if (status) {
      if (!['confirmed', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Estado inválido' });
      if (order.status !== 'pending') return res.status(400).json({ error: 'Este pedido ya fue procesado' });

      if (status === 'confirmed') {
        const stillExisting = order.items.filter(it => it.inventoryId !== null);
        await prisma.$transaction([
          ...stillExisting.map(it =>
            prisma.inventory.update({ where: { id: it.inventoryId }, data: { qty: { decrement: it.qty } } })
          ),
          prisma.order.update({ where: { id: order.id }, data: { status: 'confirmed' } })
        ]);
      } else {
        await prisma.order.update({ where: { id: order.id }, data: { status: 'cancelled' } });
      }
      return res.status(200).json({ ok: true });
    }

    // Editar cartas del pedido (solo si sigue pendiente)
    if (order.status !== 'pending') return res.status(400).json({ error: 'Este pedido ya fue procesado, no se puede editar' });

    if (action === 'remove_item') {
      const target = order.items.find(it => it.id === parseInt(orderItemId));
      if (!target) return res.status(404).json({ error: 'Esa carta no está en el pedido' });
      await prisma.orderItem.delete({ where: { id: target.id } });
      await recomputeTotal(orderId);
      return res.status(200).json({ ok: true });
    }

    if (action === 'add_item') {
      const invId = parseInt(inventoryId);
      const wanted = parseInt(qty);
      if (!invId || !wanted || wanted <= 0) return res.status(400).json({ error: 'Datos inválidos' });
      const { item, available } = await getAvailable(invId, orderId);
      if (!item) return res.status(400).json({ error: 'Esa carta ya no existe en el inventario' });
      if (available < wanted) return res.status(409).json({ error: `Solo quedan ${available} disponibles de "${item.name}".` });
      await prisma.orderItem.create({
        data: { orderId, inventoryId: invId, name: item.name, qty: wanted, priceUsd: item.price }
      });
      await recomputeTotal(orderId);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Acción no reconocida' });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
