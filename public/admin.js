import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { renderProductos } from './admin-products.js';

const sb = createClient(
  'https://ivxtyzcpqyzrlaayirlo.supabase.co',
  'sb_publishable_r2Q5PnnFw7jbXVFMqTGS5g_kGP5SeIW',
  { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true } }
);

const app = document.getElementById('app');
const money = n => '$' + Number(n || 0).toFixed(2).replace(/\.00$/, '');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// ===== Cierre automático por inactividad (15 min) =====
const IDLE_MS = 15 * 60 * 1000;
let idleTimer;
function resetIdle() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(async () => {
    await sb.auth.signOut();
    toast('Sesión cerrada por inactividad');
    loginView();
  }, IDLE_MS);
}
['click', 'keydown', 'touchstart', 'mousemove'].forEach(ev =>
  document.addEventListener(ev, resetIdle, { passive: true })
);

function toast(m) {
  const t = document.getElementById('toast');
  t.textContent = m; t.style.display = 'block';
  clearTimeout(toast.i); toast.i = setTimeout(() => t.style.display = 'none', 2600);
}

// ===== Login =====
function loginView() {
  app.innerHTML = `
    <form class="login" id="lf">
      <div class="logo" style="font-size:52px">Mara</div>
      <p style="color:var(--mut);margin:6px 0 20px">Administración privada</p>
      <label>Email<input id="le" type="email" autocomplete="username" required></label>
      <label>Contraseña<input id="lp" type="password" autocomplete="current-password" required></label>
      <p class="err" id="lerr"></p>
      <button class="btn" style="width:100%">Entrar</button>
    </form>`;
  document.getElementById('lf').onsubmit = async e => {
    e.preventDefault();
    const { error } = await sb.auth.signInWithPassword({
      email: document.getElementById('le').value.trim(),
      password: document.getElementById('lp').value
    });
    if (error) { document.getElementById('lerr').textContent = 'Email o contraseña incorrectos'; return; }
    resumen();
  };
}

// ===== Resumen =====
async function resumen() {
  resetIdle();
  app.innerHTML = '<div class="wrap">Cargando resumen…</div>';
  const { data: t, error } = await sb.rpc('admin_totals');
  if (error || !t) {
    app.innerHTML = `<div class="wrap"><p class="err">No se pudieron cargar los totales. ${esc(error?.message || '')}</p>
      <button class="btn o s" onclick="location.reload()">Reintentar</button></div>`;
    return;
  }
  app.innerHTML = `
    <div class="top"><span class="logo">Mara <small style="font:500 12px system-ui;color:var(--mut)">Admin</small></span>
      <button class="link" id="out">Salir</button></div>
    <div class="wrap">
      <div class="cards">
        <div class="k"><b>${t.productos}</b><span>Productos publicados</span></div>
        <div class="k"><b>${t.prendas}</b><span>Prendas en stock</span></div>
        <div class="k"><b>${money(t.mercancia_costo)}</b><span>Mercancía a costo</span></div>
        <div class="k"><b>${money(t.mercancia_venta)}</b><span>Mercancía a precio de venta</span></div>
        <div class="k"><b>${money(t.ganancia_potencial)}</b><span>Ganancia potencial</span></div>
        <div class="k"><b>${t.pedidos}</b><span>Pedidos recibidos</span></div>
        <div class="k"><b>${money(t.ventas)}</b><span>Ventas (sin cancelados)</span></div>
      </div>
    </div>`;
  document.getElementById('out').onclick = async () => {
    await sb.auth.signOut();
    loginView();
  };
}

// ===== Cierre al cerrar la pestaña: sessionStorage lo borra solo =====
// Al volver a abrir /admin.html, la sesión ya no existe y se pide login.

// ===== Arranque =====
async function boot() {
  const { data } = await sb.auth.getSession();
  if (data.session) resumen();
  else loginView();
}
boot();
