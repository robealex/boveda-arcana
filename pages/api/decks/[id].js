import { prisma } from '../../../lib/prisma';
import { checkAdmin } from '../../../lib/auth';

export default async function handler(req, res) {
  const { id } = req.query;
  const deckId = parseInt(id);

  if (req.method === 'GET') {
    const deck = await prisma.deck.findUnique({ where: { id: deckId }, include: { cards: true } });
    if (!deck) return res.status(404).json({ error: 'Deck no encontrado' });
    return res.status(200).json({ deck: { ...deck, price: Number(deck.price), originalPrice: deck.originalPrice !== null ? Number(deck.originalPrice) : null } });
  }

  if (req.method === 'PATCH') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const deck = await prisma.deck.findUnique({ where: { id: deckId }, include: { cards: true } });
    if (!deck) return res.status(404).json({ error: 'Deck no encontrado' });

    const { action } = req.body;

    if (action === 'mark_sold') {
      const linked = deck.cards.filter(c => c.inventoryId);
      await prisma.$transaction([
        ...linked.map(c => prisma.inventory.update({ where: { id: c.inventoryId }, data: { qty: { decrement: c.qty } } })),
        prisma.deck.update({ where: { id: deckId }, data: { active: false } })
      ]);
      return res.status(200).json({ ok: true, affected: linked.length });
    }

    if (action === 'reactivate') {
      const linked = deck.cards.filter(c => c.inventoryId);
      await prisma.$transaction([
        ...linked.map(c => prisma.inventory.update({ where: { id: c.inventoryId }, data: { qty: { increment: c.qty } } })),
        prisma.deck.update({ where: { id: deckId }, data: { active: true } })
      ]);
      return res.status(200).json({ ok: true, affected: linked.length });
    }

    // Edición general de datos del deck (y opcionalmente su lista de cartas completa)
    const { name, description, coverImg, coverName, price, originalPrice, cards } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (description !== undefined) data.description = description;
    if (coverImg !== undefined) data.coverImg = coverImg;
    if (coverName !== undefined) data.coverName = coverName;
    if (price !== undefined) data.price = price;
    if (originalPrice !== undefined) data.originalPrice = originalPrice;

    if (Array.isArray(cards)) {
      await prisma.$transaction([
        prisma.deckCard.deleteMany({ where: { deckId } }),
        prisma.deck.update({
          where: { id: deckId },
          data: {
            ...data,
            cards: { create: cards.map(c => ({ name: c.name, qty: c.qty || 1, img: c.img || null, colors: c.colors || null, cmc: c.cmc ?? null, typeLine: c.typeLine || null, price: c.price ?? null, inventoryId: c.inventoryId || null })) }
          }
        })
      ]);
      const updated = await prisma.deck.findUnique({ where: { id: deckId }, include: { cards: true } });
      return res.status(200).json({ deck: { ...updated, price: Number(updated.price) } });
    }

    const updated = await prisma.deck.update({ where: { id: deckId }, data });
    return res.status(200).json({ deck: { ...updated, price: Number(updated.price) } });
  }

  if (req.method === 'DELETE') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    await prisma.deck.delete({ where: { id: deckId } });
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
