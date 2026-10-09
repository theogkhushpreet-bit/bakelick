const PRODUCTS = [
  { id: 'choco-chip', name: 'Chocolate Chip', description: 'Classic, chewy and loaded with chocolate chips.', price: 75 },
  { id: 'biscoff-lava', name: 'Biscoff Lava', description: 'A warm, gooey centre filled with rich Biscoff goodness.', price: 110 },
  { id: 'mini-dippers', name: 'Mini Dippers (8 cookies with chocolate dip)', description: 'Eight mini cookies served with chocolate dip.', price: 250 }
];
const cart = new Map();
const $ = (id) => document.getElementById(id);
const rupees = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
const delivery = 45;
function subtotal() { return [...cart].reduce((sum, [id, qty]) => sum + PRODUCTS.find(p => p.id === id).price * qty, 0); }
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 2500); }
function renderCart() {
  const count = [...cart.values()].reduce((a, b) => a + b, 0); $('cart-count').textContent = count;
  const host = $('cart-items');
  if (!cart.size) host.innerHTML = '<p class="empty-cart">Your bag is waiting for something sweet.</p>';
  else host.innerHTML = [...cart].map(([id, qty]) => { const p = PRODUCTS.find(x => x.id === id); return `<div class="cart-item"><div><h4>${p.name}</h4><small>${rupees(p.price)} each</small><div class="quantity-control"><button type="button" data-minus="${id}" aria-label="Remove one ${p.name}">−</button><span>${qty}</span><button type="button" data-plus="${id}" aria-label="Add one ${p.name}">+</button></div></div><b>${rupees(p.price * qty)}</b></div>`; }).join('');
  $('cart-subtotal').textContent = rupees(subtotal()); $('cart-total').textContent = rupees(subtotal() + (cart.size ? delivery : 0)); $('checkout-total').textContent = rupees(subtotal() + delivery);
  $('go-checkout').disabled = !cart.size; $('go-checkout').style.opacity = cart.size ? '1' : '.5';
}
function add(id) { if (!PRODUCTS.some(p => p.id === id)) return; cart.set(id, Math.min(30, (cart.get(id) || 0) + 1)); renderCart(); toast('Added to your bag ♡'); }
document.querySelectorAll('.add-button').forEach(button => button.addEventListener('click', () => add(button.dataset.id)));
$('cart-items').addEventListener('click', e => { const id = e.target.dataset.plus || e.target.dataset.minus; if (!id) return; const qty = cart.get(id) || 0; if (e.target.dataset.plus) cart.set(id, Math.min(30, qty + 1)); else if (qty <= 1) cart.delete(id); else cart.set(id, qty - 1); renderCart(); });
$('open-cart').addEventListener('click', () => { $('cart-overlay').hidden = false; document.body.style.overflow = 'hidden'; });
function closeCart() { $('cart-overlay').hidden = true; document.body.style.overflow = ''; }
$('close-cart').addEventListener('click', closeCart); $('cart-overlay').addEventListener('click', e => { if (e.target === $('cart-overlay')) closeCart(); });
$('go-checkout').addEventListener('click', () => { if (!cart.size) return; closeCart(); $('checkout-modal').hidden = false; document.body.style.overflow = 'hidden'; renderCart(); });
function closeCheckout() { $('checkout-modal').hidden = true; document.body.style.overflow = ''; }
$('close-checkout').addEventListener('click', closeCheckout); $('checkout-modal').addEventListener('click', e => { if (e.target === $('checkout-modal')) closeCheckout(); });
$('payment-proof').addEventListener('change', () => { const file = $('payment-proof').files[0]; if (file && file.size > 3 * 1024 * 1024) { $('payment-proof').value = ''; $('checkout-error').textContent = 'Screenshot must be smaller than 3 MB.'; } else $('checkout-error').textContent = ''; });
$('checkout-form').addEventListener('submit', async e => {
  e.preventDefault(); const error = $('checkout-error'); error.textContent = '';
  if (!cart.size) { error.textContent = 'Your bag is empty.'; return; }
  const form = e.currentTarget; const data = new FormData(form); const file = $('payment-proof').files[0];
  if (!file) { error.textContent = 'Please upload your payment screenshot.'; return; }
  if (file.size > 3 * 1024 * 1024) { error.textContent = 'Screenshot must be smaller than 3 MB.'; return; }
  const city = String(data.get('city') || '').trim(); if (!/ambala/i.test(city)) { error.textContent = 'This version currently delivers in Ambala only.'; return; }
  const button = $('place-order'); button.disabled = true; button.textContent = 'Submitting order…';
  try {
    const paymentProof = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read screenshot.')); reader.readAsDataURL(file); });
    const payload = { name: data.get('name'), phone: data.get('phone'), address: data.get('address'), city, pincode: data.get('pincode'), notes: data.get('notes'), transactionRef: data.get('transactionRef'), items: [...cart].map(([id, quantity]) => ({ id, quantity })), paymentProof };
    const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not submit order.');
    cart.clear(); renderCart(); form.hidden = true; const success = $('order-success'); success.hidden = false; success.innerHTML = `<div style="font-size:40px;color:#496b4c">♡</div><h3>Order received!</h3><p>Your order number is</p><div class="order-code">${result.order.order_number}</div><p>Total: <b>${rupees(result.order.total)}</b><br>Payment status: <b>Pending verification</b></p><p>We'll check the payment before confirming your order. Please save your order number.</p><button type="button" class="button button-dark" id="done-order">Back to the shop</button>`;
    $('done-order').addEventListener('click', () => { closeCheckout(); form.hidden = false; success.hidden = true; form.reset(); form.querySelector('[name="city"]').value = 'Ambala'; });
  } catch (err) { error.textContent = err.message || 'Something went wrong. Please try again.'; }
  finally { button.disabled = false; button.textContent = 'Place order →'; }
});
$('year').textContent = new Date().getFullYear();
const intro = $('intro'); const dismissIntro = () => { intro.classList.add('done'); try { sessionStorage.setItem('bakelick-intro-seen','1'); } catch (_) {} };
$('skip-intro').addEventListener('click', dismissIntro);
try { if (sessionStorage.getItem('bakelick-intro-seen')) intro.classList.add('done'); } catch (_) {}
$('menu-toggle').addEventListener('click', () => document.querySelector('.site-header nav').classList.toggle('open'));
document.querySelectorAll('.site-header nav a').forEach(a => a.addEventListener('click', () => document.querySelector('.site-header nav').classList.remove('open')));
renderCart();
