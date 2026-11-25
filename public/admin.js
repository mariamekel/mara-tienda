import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(
  'https://ivxtyzcpqyzrlaayirlo.supabase.co',
  'sb_publishable_r2Q5PnnFw7jbXVFMqTGS5g_kGP5SeIW'
);
const app = document.getElementById('app');

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
    app.innerHTML = '<p class="wrap">Sesión iniciada. Siguiente paso: resumen.</p>';
  };
}

async function boot() {
  const { data } = await sb.auth.getSession();
  if (data.session) app.innerHTML = '<p class="wrap">Sesión iniciada. Siguiente paso: resumen.</p>';
  else loginView();
}
boot();
