import { subirFoto } from './admin-photos.js';

export async function renderProductos(sb, app, toast) {
  const money = n => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let prods = [], edit = null, cats = [];

  async function cargar() {
    const { data: c } = await sb.from('categories').select('slug,name,pos').order('pos');
    cats = c || [];
    const { data, error } = await sb.from('products')
      .select('id,name,descr,cat,price,cost,old_price,tag,published,images,variants(size,color_key,color_name,color_hex,stock)')
      .order('pos').order('id', { ascending: false });
    if (error) { toast(error.message); return; }
    prods = data || [];
  }

  function lista() {
    const rows = prods.map(p => {
      const uds = (p.variants || []).reduce((a, v) => a + (v.stock || 0), 0);
      return `<div class="row">
        ${p.images && p.images[0] ? `<img src="${esc(p.images[0])}" alt="" style="width:52px;height:66px;object-fit:cover">` : ''}
        <div class="in"><b>${esc(p.name)}</b>
        <small>Costo ${money(p.cost)} · Venta ${money(p.price)} · ${uds} uds.</small><br>
        <span class="pill ${p.published ? 'g' : ''}">${p.published ? 'Publicado' : 'Borrador'}</span></div>
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
  }

  function form() {
    const imgs = (edit.images || []).map((u, i) => `<div>
      <img src="${esc(u)}" style="width:90px;height:110px;object-fit:cover;display:block">
      <button class="link" style="font-size:12px" data-delimg="${i}">Quitar</button></div>`).join('');
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
      <h3>Fotos</h3>
      <div class="bar">${imgs || '<small>Todavía no hay fotos.</small>'}</div>
      <label>Subir fotos (celular o computadora)<input type="file" accept="image/*" multiple id="f_files"></label>
      <label class="bar" style="align-items:center;color:var(--ink)"><input type="checkbox" id="f_pub" style="width:22px;min-height:22px" ${edit.published ? 'checked' : ''}> Publicado en la tienda</label>
      <div class="bar"><button class="btn" id="guardar">Guardar</button>${edit.id ? '<button class="btn o" id="borrar">Eliminar</button>' : ''}</div>
    </div>`;

    document.getElementById('atras').onclick = async () => { await cargar(); lista(); };
    document.getElementById('guardar').onclick = guardar;
    if (edit.id) document.getElementById('borrar').onclick = borrar;
    app.querySelectorAll('[data-delimg]').forEach(b => b.onclick = () => {
      leer(); edit.images.splice(+b.dataset.delimg, 1); form();
    });
    document.getElementById('f_files').onchange = async e => {
      leer();
      for (const f of e.target.files) {
        try { edit.images.push(await subirFoto(sb, f)); }
        catch (err) { toast('Error al subir foto: ' + (err.message || '')); }
      }
      form();
    };
  }

  async function guardar() {
    leer();
    if (!edit.name) return toast('Escribe un nombre');
    if (!(edit.price > 0)) return toast('Indica el precio de venta');
    const row = { name: edit.name, descr: edit.descr, cat: edit.cat, cost: edit.cost, price: edit.price,
      old_price: edit.old_price, tag: edit.tag, published: edit.published, images: edit.images || [] };
    let id = edit.id;
    if (id) {
      const { error } = await sb.from('products').update(row).eq('id', id);
      if (error) return toast(error.message);
    } else {
      const { data, error } = await sb.from('products').insert(row).select('id').single();
      if (error) return toast(error.message);
      id = data.id;
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


    
