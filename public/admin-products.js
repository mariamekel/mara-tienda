import { subirFoto } from './admin-photos.js';

export async function renderProductos(sb, app, toast) {
  const money = n => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SIZES = ['XS','S','M','L','XL','Única'];
  let prods = [], edit = null, cats = [];

  async function cargar() {
    const { data: c } = await sb.from('categories').select('slug,name,pos').order('pos');
    cats = c || [];
    const { data, error } = await sb.from('products')
      .select('id,name,descr,cat,price,cost,old_price,tag,published,images,variants(id,size,color_key,color_name,color_hex,stock)')
      .order('pos').order('id', { ascending: false });
    if (error) { toast(error.message); return; }
    prods = data || [];
  }

  function colores() {
    return [...new Map((edit.variants || []).map(v => [v.color_key, { k: v.color_key, n: v.color_name, h: v.color_hex }])).values()];
  }

  function lista() {
    const rows = prods.map(p => {
      const uds = (p.variants || []).reduce((a, v) => a + (v.stock || 0), 0);
      const ganancia = (p.price || 0) - (p.cost || 0);
      return `<div class="row">
        ${p.images && p.images[0] ? `<img src="${esc(p.images[0])}" alt="" style="width:52px;height:66px;object-fit:cover">` : ''}
        <div class="in"><b>${esc(p.name)}</b>
        <small>Costo ${money(p.cost)} · Venta ${money(p.price)} · Ganancia ${money(ganancia)} · ${uds} uds.</small><br>
        <span class="pill ${p.published ? 'g' : ''}">${p.published ? 'Publicado' : 'Borrador'}</span>
        ${uds <= 0 ? '<span class="pill r">Agotado</span>' : ''}</div>
        <button class="btn s" data-id="${p.id}">Editar</button></div>`;
    }).join('');
    app.innerHTML = `<div class="wrap">
      <div class="bar"><button class="btn o s" id="volver">← Resumen</button><button class="btn s" id="nueva">+ Nueva prenda</button></div>
      <h2>Mis prendas</h2>${rows || '<p>Todavía no hay prendas.</p>'}</div>`;
    document.getElementById('volver').onclick = () => location.reload();
    document.getElementById('nueva').onclick = () => {
      edit = { id: 0, name: '', descr: '', cat: cats[0]?.slug || '', cost: '', price: '', old_price: '', tag: '', published: false, variants: [], images: [] };
      form();
    };
    app.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
      edit = JSON.parse(JSON.stringify(prods.find(x => x.id === +b.dataset.id)));
      form();
    });
  }

  function leer() {
    edit.name = document.getElementById('f_name').value.trim();
    edit.descr = document.getElementById('f_descr').value;
    edit.cat = document.getElementById('f_cat').value;
    edit.tag = document.getElementById('f_tag').value;
    edit.cost = +document.getElementById('f_cost').value || 0;
    edit.price = +document.getElementById('f_price').value || 0;
    edit.old_price = +document.getElementById('f_old').value || 0;
    edit.published = document.getElementById('f_pub').checked;
    app.querySelectorAll('[data-z]').forEach(i => {
      const v = edit.variants.find(x => x.size === i.dataset.z && x.color_key === i.dataset.k);
      if (v) v.stock = Math.max(0, parseInt(i.value) || 0);
    });
  }

  function form() {
    const colors = colores();
    const sizesOn = new Set((edit.variants || []).map(v => v.size));
    const imgs = (edit.images || []).map((u, i) => `<div>
      <img src="${esc(u)}" style="width:90px;height:110px;object-fit:cover;display:block;border:${i ? '1px solid var(--line)' : '2px solid var(--rd)'}">
      <div style="display:flex;gap:6px;margin-top:4px">
        ${i ? `<button class="link" style="font-size:12px" data-main="${i}">Principal</button>` : '<small>Principal</small>'}
        <button class="link" style="font-size:12px" data-delimg="${i}">Quitar</button></div></div>`).join('');

    app.innerHTML = `<div class="wrap">
      <div class="bar"><button class="btn o s" id="atras">← Mis prendas</button></div>
      <h2>${edit.id ? 'Editar' : 'Nueva'} prenda</h2>
      <label>Nombre<input id="f_name" value="${esc(edit.name)}"></label>
      <label>Descripción<textarea id="f_descr" rows="3">${esc(edit.descr)}</textarea></label>
      <div class="r2">
        <label>Categoría<select id="f_cat">${cats.map(c => `<option value="${esc(c.slug)}" ${c.slug === edit.cat ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>
        <label>Etiqueta<select id="f_tag">${[['','Ninguna'],['NUEVO','NUEVO'],['BEST','BEST SELLER'],['SALE','SALE']].map(([v,n]) => `<option value="${v}" ${v === edit.tag ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      </div>
      <div class="r2">
        <label>Costo por prenda ($)<input id="f_cost" type="number" step="0.01" min="0" value="${edit.cost ?? ''}"></label>
        <label>Precio de venta ($)


    
