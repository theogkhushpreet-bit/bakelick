const crypto = require('crypto');
const { supabase, json, isAdmin, clean, money } = require('./_lib');

const CATALOG = {
  'choco-chip': { name: 'Chocolate Chip Cookies', price: 149 },
  'butter-bites': { name: 'Classic Butter Bites', price: 129 },
  'cookie-box': { name: 'Bakelick Assorted Box', price: 249 },
  'double-choco': { name: 'Double Chocolate Cookies', price: 179 }
};
const MAX_PROOF_BYTES = 3 * 1024 * 1024;
function decodeImage(dataUrl) {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!match) throw new Error('Upload a JPG, PNG or WebP payment screenshot.');
  const buffer = Buffer.from(match[2], 'base64');
  if (!buffer.length || buffer.length > MAX_PROOF_BYTES) throw new Error('Payment screenshot must be smaller than 4 MB.');
  return { buffer, contentType: match[1], ext: match[1] === 'image/jpeg' ? 'jpg' : match[1].split('/')[1] };
}
function priceItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length < 1 || rawItems.length > 20) throw new Error('Please add at least one product to your cart.');
  const items = rawItems.map((raw) => {
    const product = CATALOG[clean(raw.id, 40)];
    const qty = Number(raw.quantity);
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 30) throw new Error('One of the cart items is invalid. Please refresh and try again.');
    return { id: raw.id, name: product.name, price: product.price, quantity: qty, lineTotal: product.price * qty };
  });
  return { items, subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0) };
}
module.exports = async function handler(req, res) {
  try {
    if (req.method === 'POST') {
      const body = req.body || {};
      const customer_name = clean(body.name, 100);
      const phone = clean(body.phone, 20);
      const address = clean(body.address, 300);
      const city = clean(body.city, 80);
      const pincode = clean(body.pincode, 10);
      const notes = clean(body.notes, 300);
      const transaction_ref = clean(body.transactionRef, 100);
      if (customer_name.length < 2 || !/^[+\d][\d\s-]{7,17}$/.test(phone) || address.length < 8 || city.length < 2 || !/^\d{6}$/.test(pincode)) {
        return json(res, 400, { error: 'Please check your name, phone, full address, city and 6-digit PIN code.' });
      }
      const priced = priceItems(body.items);
      const isAmbala = /ambala/i.test(city);
      const delivery_fee = isAmbala ? Math.max(0, money(process.env.AMBALA_DELIVERY_FEE || 45)) : 0;
      if (!isAmbala) return json(res, 400, { error: 'This first version currently accepts delivery addresses in Ambala only. Please enter Ambala as your city.' });
      const total = priced.subtotal + delivery_fee;
      const image = decodeImage(body.paymentProof);
      const db = supabase();
      const order_number = `BK${Date.now().toString().slice(-7)}${crypto.randomInt(10, 99)}`;
      const proof_path = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${image.ext}`;
      const uploaded = await db.storage.from('payment-proofs').upload(proof_path, image.buffer, { contentType: image.contentType, upsert: false });
      if (uploaded.error) throw new Error('Could not save the screenshot. Please retry.');
      const result = await db.from('orders').insert({ order_number, customer_name, phone, address, city, pincode, notes, items: priced.items, subtotal: priced.subtotal, delivery_fee, total, transaction_ref, proof_path, payment_status: 'Pending verification', order_status: 'New' }).select('order_number,total,payment_status,order_status,created_at').single();
      if (result.error) {
        await db.storage.from('payment-proofs').remove([proof_path]);
        throw new Error('Could not save your order. Please try again in a moment.');
      }
      return json(res, 201, { ok: true, order: result.data, message: 'Order received. Payment is pending manual verification.' });
    }
    if (req.method === 'GET') {
      if (!isAdmin(req)) return json(res, 401, { error: 'Please sign in to the admin dashboard.' });
      const db = supabase();
      const result = await db.from('orders').select('*').order('created_at', { ascending: false }).limit(250);
      if (result.error) throw new Error('Could not load orders. Check the Supabase setup SQL and environment variables.');
      const orders = await Promise.all(result.data.map(async order => {
        let proofUrl = null;
        if (order.proof_path) {
          const signed = await db.storage.from('payment-proofs').createSignedUrl(order.proof_path, 10 * 60);
          if (!signed.error) proofUrl = signed.data.signedUrl;
        }
        return { ...order, proofUrl };
      }));
      return json(res, 200, { ok: true, orders });
    }
    if (req.method === 'PATCH') {
      if (!isAdmin(req)) return json(res, 401, { error: 'Please sign in to the admin dashboard.' });
      const body = req.body || {};
      const orderId = clean(body.id, 50);
      const payment_status = clean(body.payment_status, 40);
      const order_status = clean(body.order_status, 40);
      if (!/^[0-9a-f-]{36}$/i.test(orderId)) return json(res, 400, { error: 'Invalid order ID.' });
      const allowedPayments = ['Pending verification', 'Paid', 'Rejected'];
      const allowedStatuses = ['New', 'Confirmed', 'Preparing', 'Dispatched', 'Delivered', 'Cancelled'];
      if (!allowedPayments.includes(payment_status) || !allowedStatuses.includes(order_status)) return json(res, 400, { error: 'Invalid status selection.' });
      if (['Confirmed','Preparing','Dispatched','Delivered'].includes(order_status) && payment_status !== 'Paid') return json(res, 400, { error: 'Verify payment before confirming or fulfilling this order.' });
      const result = await supabase().from('orders').update({ payment_status, order_status, updated_at: new Date().toISOString() }).eq('id', orderId).select('id,order_number,payment_status,order_status').single();
      if (result.error) throw new Error('Could not update order status.');
      return json(res, 200, { ok: true, order: result.data });
    }
    res.setHeader('Allow', 'GET, POST, PATCH');
    return json(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    console.error('Bakelick orders API error:', error.message);
    return json(res, 500, { error: error.message || 'Something went wrong.' });
  }
};
