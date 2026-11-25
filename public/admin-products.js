export async function renderProductos(sb, app, toast) {
  const money = n => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const SIZES = ['XS','S','M','L','XL','Única'];

  let cats = [], prods = [], edit = null;

  async function cargar() {
    const { data: c } = await sb.from('categories').select('slug,name,pos').order('pos');
    cats = c || [];
    const { data, error } = await sb.from('products')
      .select('id,name,descr,cat,price,cost,old_price,tag,published,images,pos,variants(id,size,color_key,color_name,color_hex,stock)')
      .order('pos').order('id', { ascending: false });
    if (error) { toast(error.message); return; }
    prods = data || [];
  }

  function lista() {
    const rows = prods.map(p => {
      const uds = (p.variants || []).reduce((a, v) => a + (v.stock || 0), 0);
      return `<div class="row">
        <div class="in"><b>${esc(p.name)}</b>
        <small>Costo ${money(p.cost)} · Venta ${money(p.price)} · ${uds} uds.</small><br>
        <span class="pill ${p.published ? 'g' : ''}">${p.published ? 'Publicado' : 'Borrador'}</span></div>
        <button class="btn s" data-id="${p.id}">Editar</button></div>`;
    }).join('');
    app.innerHTML = `<div class="wrap">
      <div class="bar"><button class="btn o s" id="volver">← Resumen</button><button class="btn s" id="nueva">+ Nueva prenda</button></div>
      <h2>Mis prendas</h2>${rows || '<p>Todavía no hay prendas.</p>'}</div>`;
    document.getElementById('volver').onclick = () => location.reload();
    document.getElementById('nueva').onclick = () => { edit = { id: 0, name: '', descr: '', cat: cats[0]?.slug || '', cost: '', price: '', old_price: '', tag: '', published: false, variants: [], images: [] }; form(); };
    app.querySelectorAll('[data-id]').forEach(b => b.onclick = () => {
      const p = prods.find(x => x.id === +b.dataset.id);
      edit = JSON.parse(JSON.stringify(p)); form();
    });
  }

  function colores() {
    return [...new Map((edit.variants || []).map(v => [v.color_key, { k: v.color_key, n: v.color_name, h: v.color_hex }])).values()];
  }

  function form() {
    const colors = colores();
    const sizesOn = new Set((edit.variants || []).map(v => v.size));
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
        <label>Precio de venta ($)<input id="f_price" type="number" step="0.01" min="0" value="${edit.price ?? ''}"></label>
      </div>
      <label>Precio anterior, si hay oferta ($)<input id="f_old" type="number" step="0.01" min="0" value="${edit.old_price || ''}"></label>
      <h3>Colores</h3>
      <div class="chips">${colors.map((c, i) => `<span class="chip"><span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${esc(c.h)};vertical-align:-2px;margin-right:4px"></span>${esc(c.n)} <button class="link" data-delcolor="${i}">×</button></span>`).join('')}</div>
      <div class="r2" style="margin-top:8px"><input id="cn" placeholder="Nombre del color"><input id="ch" type="color" value="#D8A9A8"></div>
      <div class="bar"><button class="btn o s" id="addcolor">Añadir color</button></div>
      <h3>Tallas</h3>
      <div class="chips">${SIZES.map(z => `<button class="chip ${sizesOn.has(z) ? 'on' : ''}" data-size="${z}">${z}</button>`).join('')}</div>
      ${sizesOn.size && colors.length ? `<h3>Inventario (unidades)</h3><div style="overflow-x:auto"><table><tr><th></th>${colors.map(c => `<th>${esc(c.n)}</th>`).join('')}</tr>${[...sizesOn].map(z => `<tr><th>${z}</th>${colors.map(c => { const v = (edit.variants || []).find(x => x.size === z && x.color_key === c.k); return `<td><input type="number" min="0" inputmode="numeric" data-z="${z}" data-k="${c.k}" value="${v ? v.stock : 0}"></td>`; }).join('')}</tr>`).join('')}</table></div>` : '<p style="color:var(--mut);margin-top:12px">Añade colores y tallas para poner inventario.</p>'}
      <label class="bar" style="align-items:center;color:var(--ink)"><input type="checkbox" id="f_pub" style="width:22px;min-height:22px" ${edit.published ? 'checked' : ''}> Publicado en la tienda</label>
      <div class="bar"><button class="btn" id="guardar">Guardar</button>${edit.id ? '<button class="btn o" id="borrar">Eliminar</button>' : ''}</div>
    </div>`;

    document.getElementById('atras').onclick = async () => { await cargar(); lista(); };
    document.getElementById('addcolor').onclick = () => {
      leer();
      const n = document.getElementById('cn').value.trim();
      if (!n) return toast('Escribe el nombre del color');
      const k = n.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'c' + Date.now();
      if (colores().some(c => c.k === k)) return toast('Ese color ya existe');
      const h = document.getElementById('ch').value;
      const sizes = [...new Set((edit.variants || []).map(v => v.size))];
      sizes.forEach(z => edit.variants.push({ size: z, color_key: k, color_name: n, color_hex: h, stock: 0 }));
      if (!sizes.length) edit.pendingColors = [...(edit.pendingColors || []), { k, n, h }];
      form();
    };
    app.querySelectorAll('[data-delcolor]').forEach(b => b.onclick = () => {
      leer(); const k = colores()[+b.dataset.delcolor].k;
      edit.variants = edit.variants.filter(v => v.color_key !== k); form();
    });
    app.querySelectorAll('[data-size]').forEach(b => b.onclick = () => {
      leer();
      const z = b.dataset.size, has = new Set((edit.variants || []).map(v => v.size));
      if (has.has(z)) edit.variants = edit.variants.filter(v => v.size !== z);
      else colores().forEach(c => edit.variants.push({ size: z, color_key: c.k, color_name: c.n, color_hex: c.h, stock: 0 }));
      form();
    });
    document.getElementById('guardar').onclick = guardar;
    if (edit.id) document.getElementById('borrar').onclick = borrar;
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
  }

  async function guardar() {
    leer();
    if (!edit.name) return toast('Escribe un nombre');
    if (!(edit.price > 0)) return toast('Indica el precio de venta');
    const stocks = {};
    app.querySelectorAll('[data-z]').forEach(i => stocks[i.dataset.z + '|' + i.dataset.k] = Math.max(0, parseInt(i.value) || 0));
    const variants = (edit.variants || []).map(v => ({
      size: v.size, color_key: v.color_key, color_name: v.color_name, color_hex: v.color_hex,
      stock: stocks[v.size + '|' + v.color_key] ?? v.stock ?? 0
    }));
    const row = { name: edit.name, descr: edit.descr, cat: edit.cat, cost: edit.cost, price: edit.price, old_price: edit.old_price, tag: edit.tag, published: edit.published };
    let id = edit.id;
    if (id) {
      const { error } = await sb.from('products').update(row).eq('id', id);
      if (error) return toast(error.message);
    } else {
      const { data, error } = await sb.from('products').insert(row).select('id').single();
      if (error) return toast(error.message);
      id = data.id;
    }
    await sb.from('variants').delete().eq('product_id', id);
    if (variants.length) {
      const { error } = await sb.from('variants').insert(variants.map(v => ({ ...v, product_id: id })));
      if (error) return toast(error.message);
    }
    toast('Guardado. Ya se ve en la tienda.');
    await cargar(); lista();
  }

  async function borrar() {
    if (!confirm('¿Eliminar esta prenda? No se puede deshacer.')) return;
    const { error } = await sb.from('products').delete().eq('id', edit.id);
    if (error) return toast(error.message);
    await cargar(); lista();
  }

  await cargar();
  lista();
}
