import { createClient } from '@supabase/supabase-js';
import './style.css';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = (url && key) ? createClient(url, key) : null;

const app = document.querySelector('#app');
let addons = [];
let session = null;
let filter = 'all';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function refreshSession() {
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  session = data.session;
}

async function loadAddons() {
  if (!supabase) { addons = []; render(); return; }
  const { data, error } = await supabase.from('addons').select('*').order('created_at', {ascending:false});
  if (error) console.error(error);
  addons = data || [];
  render();
}

function card(a) {
  return `<article class="card">
    <div class="cover">${a.image_url ? `<img src="${esc(a.image_url)}" alt="">` : '<span>🧩</span>'}</div>
    <div class="card-body">
      <span class="tag">${esc(a.edition || 'Bedrock')}</span>
      <h3>${esc(a.title)}</h3>
      <p>${esc(a.description || 'إضافة Minecraft')}</p>
      <button data-download="${esc(a.id)}" class="primary">⬇ تحميل</button>
    </div>
  </article>`;
}

function render() {
  const visible = filter === 'all' ? addons : addons.filter(a => (a.edition||'').toLowerCase() === filter);
  app.innerHTML = `
  <header><div class="brand">KIM <b>ADDONS</b></div>
    <nav>
      <button data-filter="all">الكل</button>
      <button data-filter="bedrock">Bedrock</button>
      <button data-filter="java">Java</button>
      <button id="uploadOpen">رفع إضافة</button>
      <button id="authOpen">${session ? 'حسابي' : 'تسجيل الدخول'}</button>
    </nav>
  </header>
  <main>
    <section class="hero"><div><small>منصة Minecraft للمبدعين</small><h1>إضافاتك، في مكان واحد.</h1>
      <p>ارفع ملفاتك فعليًا وشاركها مع اللاعبين، أو نزّل إضافات المجتمع.</p>
      <button class="primary" id="heroUpload">📤 ارفع ملفك</button>
    </div></section>
    <section><div class="section-head"><h2>أحدث الإضافات</h2><span>${visible.length} إضافة</span></div>
      <div class="grid">${visible.length ? visible.map(card).join('') : '<div class="empty">لا توجد إضافات بعد.</div>'}</div>
    </section>
  </main>
  <dialog id="modal"></dialog>`;
  bind();
}

function modal(html) {
  const m = document.querySelector('#modal'); m.innerHTML = html; m.showModal();
  m.addEventListener('click', e => { if (e.target === m) m.close(); }, {once:true});
}

function bind() {
  document.querySelectorAll('[data-filter]').forEach(b => b.onclick = () => { filter=b.dataset.filter; render(); });
  document.querySelector('#authOpen').onclick = openAuth;
  document.querySelector('#uploadOpen').onclick = openUpload;
  document.querySelector('#heroUpload').onclick = openUpload;
  document.querySelectorAll('[data-download]').forEach(b => b.onclick = () => downloadAddon(b.dataset.download));
}

function openAuth() {
  if (session) {
    modal(`<form method="dialog" class="modal-box"><h2>حسابك</h2><p>${esc(session.user.email)}</p><button id="signout" class="danger">تسجيل الخروج</button></form>`);
    document.querySelector('#signout').onclick = async e => { e.preventDefault(); await supabase.auth.signOut(); await refreshSession(); render(); };
    return;
  }
  modal(`<form class="modal-box" id="authForm"><h2>تسجيل الدخول / إنشاء حساب</h2>
    <input id="email" type="email" placeholder="البريد الإلكتروني" required>
    <input id="password" type="password" placeholder="كلمة المرور" minlength="6" required>
    <button class="primary">متابعة</button><p id="authMsg"></p></form>`);
  document.querySelector('#authForm').onsubmit = async e => {
    e.preventDefault();
    if (!supabase) return msg('authMsg','أضف بيانات Supabase في ملف .env أولًا.');
    const email = emailInput().value, password = document.querySelector('#password').value;
    let r = await supabase.auth.signInWithPassword({email,password});
    if (r.error) r = await supabase.auth.signUp({email,password});
    if (r.error) msg('authMsg',r.error.message);
    else { await refreshSession(); document.querySelector('#modal').close(); render(); }
  };
}
const emailInput=()=>document.querySelector('#email');
const msg=(id,t)=>document.querySelector('#'+id).textContent=t;

function openUpload() {
  modal(`<form class="modal-box" id="uploadForm"><h2>رفع إضافة</h2>
    <input id="title" placeholder="اسم الإضافة" required>
    <select id="edition"><option value="bedrock">Bedrock</option><option value="java">Java</option></select>
    <textarea id="description" placeholder="الوصف"></textarea>
    <input id="file" type="file" required>
    <input id="image" type="file" accept="image/*">
    <button class="primary">📤 رفع فعلي</button><p id="uploadMsg"></p></form>`);
  document.querySelector('#uploadForm').onsubmit = uploadAddon;
}

async function uploadAddon(e) {
  e.preventDefault();
  if (!supabase || !session) return msg('uploadMsg','يجب تسجيل الدخول وإعداد Supabase.');
  const file = document.querySelector('#file').files[0];
  const image = document.querySelector('#image').files[0];
  if (!file) return;
  msg('uploadMsg','جاري الرفع...');
  const safe = `${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
  const path = `${session.user.id}/${safe}`;
  let r = await supabase.storage.from('addons').upload(path,file,{upsert:false});
  if (r.error) return msg('uploadMsg',r.error.message);
  const { data: pub } = supabase.storage.from('addons').getPublicUrl(path);
  let image_url = null;
  if (image) {
    const ipath = `${session.user.id}/${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const ir = await supabase.storage.from('addon-images').upload(ipath,image,{upsert:false});
    if (!ir.error) image_url = supabase.storage.from('addon-images').getPublicUrl(ipath).data.publicUrl;
  }
  r = await supabase.from('addons').insert({
    title: document.querySelector('#title').value,
    description: document.querySelector('#description').value,
    edition: document.querySelector('#edition').value,
    file_url: pub.publicUrl,
    image_url,
    user_id: session.user.id
  });
  if (r.error) return msg('uploadMsg',r.error.message);
  document.querySelector('#modal').close(); await loadAddons();
}

async function downloadAddon(id) {
  const a = addons.find(x => String(x.id) === String(id));
  if (!a?.file_url) return alert('رابط الملف غير متوفر.');
  window.open(a.file_url, '_blank', 'noopener');
  if (supabase) await supabase.rpc('increment_downloads', {addon_id:id}).catch(()=>{});
}

await refreshSession();
await loadAddons();
