import { prisma } from '../../lib/prisma';
import { checkAdmin } from '../../lib/auth';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const isAdmin = checkAdmin(req);
    const where = isAdmin && req.query.all ? {} : { active: true };
    const decks = await prisma.deck.findMany({
      where, orderBy: { createdAt: 'desc' },
      include: { cards: true }
    });
    return res.status(200).json({
      decks: decks.map(d => ({ ...d, price: Number(d.price), cardCount: d.cards.reduce((s, c) => s + c.qty, 0) }))
    });
  }

  if (req.method === 'POST') {
    if (!checkAdmin(req)) return res.status(401).json({ error: 'Password de administrador incorrecto' });
    const { name, description, coverImg, coverName, price, originalPrice, moxfieldUrl, cards } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Faltan datos: nombre y precio son obligatorios' });
    if (!Array.isArray(cards) || cards.length === 0) return res.status(400).json({ error: 'El deck necesita al menos una carta' });

    const deck = await prisma.deck.create({
      data: {
        name, description: description || null, coverImg: coverImg || null, coverName: coverName || null,
        price, originalPrice: originalPrice || null, moxfieldUrl: moxfieldUrl || null,
        cards: {
          create: cards.map(c => ({
            name: c.name, qty: c.qty || 1, img: c.img || null, colors: c.colors || null,
            cmc: c.cmc !== undefined && c.cmc !== null ? Math.round(c.cmc) : null,
            price: c.price || null, inventoryId: c.inventoryId || null
          }))
        }
      },
      include: { cards: true }
    });
    return res.status(201).json({ deck: { ...deck, price: Number(deck.price) } });
  }

  res.status(405).json({ error: 'Método no permitido' });
}
