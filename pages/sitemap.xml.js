export default function handler(req, res) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
  const pages = ['', '/mis-pedidos', '/cuenta'];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url><loc>${baseUrl}${p}</loc></url>`).join('\n')}
</urlset>`;
  res.setHeader('Content-Type', 'application/xml');
  res.status(200).send(xml);
}
