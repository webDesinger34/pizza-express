import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST /api/orders — neue Bestellung anlegen
  if (req.method === 'POST') {
    const body = req.body;

    if (!body || !body.customer || !body.items?.length) {
      return res.status(400).json({ error: 'Ungültige Bestelldaten' });
    }

    const order_id = 'PE-' + Date.now().toString(36).toUpperCase();

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        order_id,
        customer_name: `${body.customer.vorname} ${body.customer.nachname}`,
        customer_email: body.customer.email,
        customer_phone: body.customer.tel,
        order_type: body.order_type,
        items: body.items,
        subtotal: body.subtotal,
        lieferkosten: body.lieferkosten,
        total: body.total,
        zahlung: body.zahlung,
        note: body.note || '',
        adresse: body.adresse || null,
        status: 'neu',
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Datenbankfehler' });
    }

    // Optional: Bestätigungs-E-Mail via Supabase Edge Function oder Resend
    // Hier kannst du später einen E-Mail-Service einbinden

    return res.status(200).json({
      success: true,
      order_id,
      message: 'Bestellung erfolgreich eingegangen'
    });
  }

  // GET /api/orders — alle Bestellungen (nur für Admin mit Secret)
  if (req.method === 'GET') {
    const secret = req.headers['x-admin-secret'];
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Nicht autorisiert' });
    }

    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return res.status(500).json({ error: 'Datenbankfehler' });

    return res.status(200).json({ orders: data });
  }

  return res.status(405).json({ error: 'Methode nicht erlaubt' });
}
