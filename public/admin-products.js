export async function renderProductos(sb, app, toast) {
  const money = n => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let prods = [];
  const { data, error } = await sb.from('products')
    .select('id,name,cost,price,published,variants(stock)')
    .order('pos').order('id', { ascending: false });
  if (error) { toast(error.message); return; }
  prods = data || [];
  const rows = prods.map(p => {
    const uds = (p.variants || []).reduce((a, v) => a + (v.stock || 0), 0);
    return `<div class="row"><div class="in"><b>${esc(p.name)}</b>
      <small>Costo ${money(p.cost)} · Venta ${money(p.price)} · ${uds} uds.</small><br>
      <span class="pill ${p.published ? 'g' : ''}">${p.published ? 'Publicado' : 'Borrador'}</span></div></div>`;
  }).join('');
  app.innerHTML = `<div class="wrap"><div class="bar"><button class="btn o s" id="volver">← Resumen</button></div>
    <h2>Mis prendas</h2>${rows || '<p>Todavía no hay prendas.</p>'}</div>`;
  document.getElementById('volver').onclick = () => location.reload();
}
