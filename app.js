/* =====================================================================
   APP.JS v15 — SIM TATIB (localStorage) — UI v2 (design system modern)
   Perubahan v15 (tampilan, logika v14 tetap sama):
   - Ikon SVG konsisten di sidebar, judul halaman & tombol aksi
   - Sidebar berkelompok (Menu Utama / Referensi / Pengguna) + kartu user
   - Dialog konfirmasi custom (uiConfirm) pengganti confirm() bawaan
   - Login split-screen, topbar putih, tabel & form restyle
   Perubahan v14:
   1. No. HP/WA orang tua kini DISIMPAN LANGSUNG DI DATA SISWA (Kelola
      Data Siswa, field noHpOrtu). Form Input Pelanggaran membaca nomor
      LANGSUNG dari data siswa yang dipilih (fallback: akun ortu
      terhubung via NIS). Nomor tidak hilang lagi walau akun orang tua
      belum dibuat. Juga dipakai oleh tombol 💬 WA Ortu di BK.
   2. Form Input Pelanggaran punya dropdown SEMESTER (Ganjil/Genap) & 
      TAHUN PELAJARAN — otomatis mengikuti tanggal, bisa diubah manual.
   3. Notifikasi ORANG TUA & SISWA YANG MELANGGAR DIPISAH (flag
      untukOrtu / untukSiswa — masing-masing hanya melihat punyanya) dan 
      kini diberi label penerima pada kartu notifikasi.
   4. Status pemanggilan BK TANPA DROPDOWN (badge status):
      Menunggu BK → klik 💬 WA Ortu = Dipanggil
      → klik tombol centang ✅ di kolom Aksi = Selesai.
   ===================================================================== */

/* ---------- ERROR TRAP GLOBAL ---------- */
window.addEventListener("error", e => {
  try { toast("⚠️ Error: " + (e.message || "tidak diketahui"), "err"); } catch (_) { }
});
window.addEventListener("unhandledrejection", e => {
  try { toast("⚠️ Error: " + ((e.reason && e.reason.message) || e.reason || "tidak diketahui"), "err"); } catch (_) { }
});

/* ---------- 1. DATABASE LOKAL ---------- */
const DB_PREFIX = "simtatib_";
const dbRead = key => {
  try { return JSON.parse(localStorage.getItem(DB_PREFIX + key)) || []; }
  catch (e) { return []; }
};
const dbWrite = (key, val) => localStorage.setItem(DB_PREFIX + key, JSON.stringify(val));
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const getUsers       = () => dbRead("users");
const getJenis       = () => dbRead("jenis");
const getJurusan     = () => dbRead("jurusan");
const getKelas       = () => dbRead("kelas");
const getPelanggaran = () => dbRead("pelanggaran");
const getPanggilan   = () => dbRead("panggilan");
const getNotifikasi  = () => dbRead("notifikasi");
const saveUsers       = v => dbWrite("users", v);
const saveJenis       = v => dbWrite("jenis", v);
const saveJurusan     = v => dbWrite("jurusan", v);
const saveKelas       = v => dbWrite("kelas", v);
const savePelanggaran = v => dbWrite("pelanggaran", v);
const savePanggilan   = v => dbWrite("panggilan", v);
const saveNotifikasi  = v => dbWrite("notifikasi", v);

/* ---------- 2. KONFIGURASI ---------- */
const FOTO_LOGO = "";
const LOGO_KANDIDAT = ["logo.png", "logo.jpg", "logo.jpeg", "tutwuri.png", "tutwuri.jpg"];

const BATAS_PANGGILAN = 5;
const ROLE_LABEL = { admin: "Admin", tatib: "Tim Tatib", bk: "Guru BK",
                     walikelas: "Wali Kelas", siswa: "Siswa", ortu: "Orang Tua" };
const JENIS_DEFAULT = [
  "Terlambat",
  "Seragam tidak sesuai ketentuan",
  "Memakai make up tebal",
  "Membawa make up",
  "Memakai aksesoris saat sekolah",
  "Membawa rokok dan miras",
  "Pulang tidak sesuai dengan jadwal",
];
const JURUSAN_DEFAULT = ["RPL", "TKJ", "AKL", "DKV"];
const TINGKAT_OPSI    = ["X", "XI", "XII"];

let currentUser = null;

/* ---------- 3. UTIL ---------- */
const $ = id => document.getElementById(id);
const show = el => el.classList.remove("hidden");
const hide = el => el.classList.add("hidden");
const esc = s => String(s ?? "").replace(/[&<>"']/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtTanggal = t => {
  if (!t) return "-";
  const d = new Date(t + "T00:00:00");
  return isNaN(d) ? t : d.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};
const fmtWaktu = ts => {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("id-ID",
    { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};
function semesterDariTanggal(t) {
  if (!t) return "-";
  const d = new Date(t + "T00:00:00");
  if (isNaN(d)) return "-";
  const y = d.getFullYear(), m = d.getMonth() + 1;
  return m >= 7 ? `Ganjil ${y}/${y + 1}` : `Genap ${y - 1}/${y}`;
}
function toast(msg, type = "ok") {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.className = "toast show " + type;
  setTimeout(() => t.className = "toast", 4500);
}
function setKoneksi(html, ok) {
  const el = $("koneksiStatus");
  if (!el) return;
  el.innerHTML = html;
  el.className = ok ? "status-online" : "status-offline";
}

/* ---------- 3b. IKON SVG (gaya lucide, stroke currentColor) ---------- */
const ICON_PATHS = {
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  clipboard: '<rect width="8" height="4" x="8" y="2" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6"/><path d="M9 16h6"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  landmark: '<path d="M3 22h18"/><path d="M6 18v-7"/><path d="M10 18v-7"/><path d="M14 18v-7"/><path d="M18 18v-7"/><path d="m12 2 9 5H3z"/>',
  layers: '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  cap: '<path d="M21.42 10.92a1 1 0 0 0-.02-1.84L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.83l8.57 3.91a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1 1 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  calendar: '<path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
  menu: '<line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeoff: '<path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icn ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;

/* ---------- 4. LOGO ---------- */
function setupLogo() {
  const img = $("loginLogo"), twh = $("logoTwh");
  const brandImg = $("brandLogoFoto"), brandSvg = $("brandLogoSvg");
  if (!img || !twh || !brandImg || !brandSvg) return;

  function pakaiFoto(src) {
    img.src = src;
    show(img); hide(twh);
    brandImg.src = src;
    hide(brandSvg); show(brandImg);
  }
  function pakaiSvg() {
    hide(img); show(twh);
    hide(brandImg); show(brandSvg);
  }

  img.onerror = pakaiSvg;

  if (FOTO_LOGO) { pakaiFoto(FOTO_LOGO); return; }

  (function coba(i) {
    if (i >= LOGO_KANDIDAT.length) { pakaiSvg(); return; }
    const test = new Image();
    test.onload = () => pakaiFoto(LOGO_KANDIDAT[i]);
    test.onerror = () => coba(i + 1);
    test.src = LOGO_KANDIDAT[i];
  })(0);
}

/* ---------- 5. SEED DATA AWAL ---------- */
function buatKelasDefault() {
  const arr = [];
  JURUSAN_DEFAULT.forEach(j => {
    TINGKAT_OPSI.forEach(t => {
      arr.push({ id: genId(), nama: `${t} ${j} A`, tingkat: t, jurusan: j, rombel: "A" });
    });
  });
  return arr;
}

function seedIfEmpty() {
  if (!getUsers().length) {
    const wk1 = { id: genId(), username: "wk1", password: "wk123",
                  nama: "Bu Sari (Wali X RPL A)", role: "walikelas" };
    saveUsers([
      { id: genId(), username: "admin",     password: "admin123", nama: "Administrator", role: "admin" },
      { id: genId(), username: "tatib1",    password: "tatib123", nama: "Pak Tatib",     role: "tatib" },
      wk1,
      { id: genId(), username: "bk1",       password: "bk123",    nama: "Bu Rina (BK)",  role: "bk" },
      { id: genId(), username: "budi",      password: "siswa123", nama: "Budi Santoso",  role: "siswa", nis: "SIS001", jurusan: "RPL", kelas: "X RPL A", alamat: "Jl. Merdeka No. 10", noHpOrtu: "6281234567890", walikelasId: wk1.id },
      { id: genId(), username: "ortu_budi", password: "ortu123",  nama: "Bapak Santoso", role: "ortu",  anakNis: "SIS001", noHp: "6281234567890" },
    ]);
    setKoneksi("🟢 Database lokal aktif — akun demo baru saja dibuat.", true);
  } else {
    setKoneksi("🟢 Database lokal aktif — siap login.", true);
  }
  if (!getJenis().length) {
    saveJenis(JENIS_DEFAULT.map((nama, i) => ({
      id: genId(), kode: "P" + String(i + 1).padStart(2, "0"), nama,
    })));
  }
  if (!getJurusan().length) {
    saveJurusan(JURUSAN_DEFAULT.map(nama => ({ id: genId(), nama })));
  }
  if (!getKelas().length) {
    saveKelas(buatKelasDefault());
  }
}

function nextKode() {
  let max = 0;
  getJenis().forEach(j => {
    const m = /^P(\d+)$/.exec(j.kode || "");
    if (m) max = Math.max(max, parseInt(m[1], 10));
  });
  return "P" + String(max + 1).padStart(2, "0");
}

/* ---------- 6. LOGIN / LOGOUT ---------- */
function doLogin() {
  const username = $("loginUser").value.trim();
  const password = $("loginPass").value;
  const err = $("loginError");
  hide(err);
  if (!username || !password) { err.textContent = "Username & password wajib diisi."; show(err); return; }

  const user = getUsers().find(u => u.username === username);
  if (!user) { err.textContent = "Username tidak ditemukan."; show(err); return; }
  if (user.password !== password) { err.textContent = "Password salah."; show(err); return; }

  currentUser = user;
  localStorage.setItem("simtatib_session", user.id);
  hide(err);
  masukApp();
}

function restoreSession() {
  const uid = localStorage.getItem("simtatib_session");
  if (!uid) return;
  const user = getUsers().find(u => u.id === uid);
  if (user) { currentUser = user; masukApp(); }
  else localStorage.removeItem("simtatib_session");
}

function doLogout() {
  localStorage.removeItem("simtatib_session");
  currentUser = null;
  hide($("appPage")); show($("loginPage"));
  $("loginPass").value = "";
}

/* ---------- 7. NAVIGASI ---------- */
/* Menu per role, dikelompokkan: [ [JudulBagian, [ [idPage, ikon, label], ... ] ] ] */
const MENU = {
  admin: [
    ["Menu Utama", [
      ["dashboard", "grid", "Dashboard"],
      ["input", "plus", "Input Pelanggaran"],
      ["pelanggaran", "clipboard", "Data Pelanggaran"],
    ]],
    ["Referensi", [
      ["jenis", "book", "Bentuk Pelanggaran"],
      ["jurusan", "landmark", "Kelola Jurusan"],
      ["kelas", "layers", "Kelola Kelas"],
    ]],
    ["Pengguna", [
      ["siswa", "cap", "Data Siswa"],
      ["tatib", "shield", "Tim Tatib"],
      ["wkrole", "users", "Wali Kelas"],
      ["bkrole", "phone", "Guru BK"],
      ["ortu", "heart", "Orang Tua"],
    ]],
  ],
  tatib: [
    ["Menu Utama", [
      ["dashboard", "grid", "Dashboard"],
      ["input", "plus", "Input Pelanggaran"],
      ["jenis", "book", "Bentuk Pelanggaran"],
      ["pelanggaran", "clipboard", "Data Pelanggaran"],
    ]],
  ],
  bk: [
    ["Bimbingan Konseling", [
      ["bkdash", "phone", "Pemanggilan BK"],
      ["pelanggaran", "clipboard", "Data Pelanggaran"],
      ["notifikasi", "bell", "Notifikasi"],
    ]],
  ],
  walikelas: [
    ["Wali Kelas", [
      ["wkdash", "home", "Kelas Saya"],
      ["pelanggaran", "clipboard", "Data Pelanggaran"],
      ["notifikasi", "bell", "Notifikasi"],
    ]],
  ],
  siswa: [
    ["Akun Saya", [
      ["riwayat", "history", "Pelanggaran Saya"],
      ["notifikasi", "bell", "Notifikasi"],
    ]],
  ],
  ortu: [
    ["Akun Saya", [
      ["riwayat", "history", "Pelanggaran Anak"],
      ["notifikasi", "bell", "Notifikasi"],
    ]],
  ],
};

const menuList = role => MENU[role].flatMap(([, items]) => items);
const firstPage = role => menuList(role)[0][0];

/* Notifikasi dipisah per penerima:
   - ortu  : hanya notif ber-flag untukOrtu (via NIS anak)
   - siswa : hanya notif ber-flag untukSiswa (via NIS sendiri)
   - bk    : hanya notif ber-flag untukBk
   - walikelas: hanya notif ber-flag untukWk (cocok wkId) */
function notifUntukSaya() {
  if (!currentUser) return [];
  if (currentUser.role === "siswa")
    return getNotifikasi().filter(n => n.untukSiswa && n.nis === currentUser.nis);
  if (currentUser.role === "ortu")
    return getNotifikasi().filter(n => n.untukOrtu && n.nis === currentUser.anakNis);
  if (currentUser.role === "bk")
    return getNotifikasi().filter(n => n.untukBk);
  if (currentUser.role === "walikelas")
    return getNotifikasi().filter(n => n.untukWk && n.wkId === currentUser.id);
  return [];
}

function masukApp() {
  hide($("loginPage")); show($("appPage"));
  $("userName").textContent = currentUser.nama;
  $("userBadge").textContent = ROLE_LABEL[currentUser.role] || currentUser.role;
  $("userBadge").className = "badge-role role-" + currentUser.role;
  $("userAvatar").textContent = (currentUser.nama || "?").trim().split(/\s+/)
    .slice(0, 2).map(w => w[0] || "").join("").toUpperCase();
  buildSidebar();
  openPage(firstPage(currentUser.role));
  pushBrowserNotif();
}

function buildSidebar() {
  const sb = $("sidebar");
  const unread = notifUntukSaya().filter(n => !n.dibaca).length;
  sb.innerHTML = MENU[currentUser.role].map(([judul, items]) => `
    <div class="nav-group">
      <div class="nav-group-label">${esc(judul)}</div>
      ${items.map(([id, icn, label]) => {
        const badge = (id === "notifikasi" && unread)
          ? ` <span class="notif-badge">${unread}</span>` : "";
        return `<button class="nav-item" data-page="${id}">${icon(icn)}<span>${label}</span>${badge}</button>`;
      }).join("")}
    </div>`).join("") + `
    <div class="nav-footer">
      <div class="nav-footer-card">
        <span class="avatar avatar-sm">${esc($("userAvatar").textContent)}</span>
        <div class="nav-footer-meta">
          <b>${esc(currentUser.nama)}</b>
          <small>${esc(ROLE_LABEL[currentUser.role] || currentUser.role)}</small>
        </div>
      </div>
    </div>`;
  sb.querySelectorAll(".nav-item").forEach(b =>
    b.addEventListener("click", () => { openPage(b.dataset.page); tutupSidebarMobile(); }));
}

function openPage(id) {
  document.querySelectorAll(".page").forEach(p => hide(p));
  document.querySelectorAll(".nav-item").forEach(b =>
    b.classList.toggle("active", b.dataset.page === id));
  const page = $("page-" + id);
  if (page) show(page);
  if (id === "dashboard")   loadDashboard();
  if (id === "bkdash")      loadBkDash();
  if (id === "wkdash")      loadWkDash();
  if (id === "input")       initInputPage();
  if (id === "jenis")       loadJenis();
  if (id === "pelanggaran") loadPelanggaran();
  if (id === "jurusan")     loadJurusan();
  if (id === "kelas")       loadKelas();
  if (id === "siswa")       loadSiswa();
  if (id === "tatib")       loadAkun("tatib");
  if (id === "wkrole")      loadAkun("walikelas");
  if (id === "bkrole")      loadAkun("bk");
  if (id === "ortu")        loadAkun("ortu");
  if (id === "notifikasi")  loadNotifikasi();
  if (id === "riwayat")     loadRiwayat();
}

function muatUlangHalamanAktif() {
  const aktif = document.querySelector(".nav-item.active");
  if (aktif) openPage(aktif.dataset.page);
}

/* Sidebar mobile (off-canvas) */
function toggleSidebarMobile() { document.body.classList.toggle("sb-open"); }
function tutupSidebarMobile() { document.body.classList.remove("sb-open"); }

/* ---------- 8. DASHBOARD (admin & tatib) ---------- */
function loadDashboard() {
  $("dashNama").textContent = currentUser.nama;
  $("dashRole").textContent = ROLE_LABEL[currentUser.role] || currentUser.role;
  $("dashRole").className = "badge-role role-" + currentUser.role;
  $("adminToolsCard").classList.toggle("hidden", currentUser.role !== "admin");

  const pel  = getPelanggaran();
  const pang = getPanggilan();
  const terlibat = new Set(pel.map(p => p.siswaKey || p.nis)).size;
  const aktif = pang.filter(p => p.status !== "Selesai").length;

  $("dashRingkas").innerHTML =
    `Total pelanggaran tercatat: <b>${pel.length}</b> &nbsp;•&nbsp; ` +
    `Siswa terlibat: <b>${terlibat}</b> &nbsp;•&nbsp; Pemanggilan aktif: <b>${aktif}</b>`;

  renderPanggilan(
    [...pang].sort((a, b) => (b.ts || 0) - (a.ts || 0)),
    "panggilanWrap",
    { canWa: true, canSelesai: currentUser.role === "admin",
      canHapus: currentUser.role === "admin" }
  );
}

/* Status TANPA dropdown:
   - teks badge status (Menunggu BK / Dipanggil / Selesai)
   - 💬 WA Ortu  → status jadi "Dipanggil" (lihat kirimWa)
   - ✅ Selesai  → status jadi "Selesai" (lihat tandaiSelesai) */
function renderPanggilan(list, wrapId, opt) {
  const wrap = $(wrapId);
  if (!wrap) return;
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("check")}<p>Belum ada siswa yang mencapai ${BATAS_PANGGILAN}x pelanggaran dalam satu semester.</p></div>`;
    return;
  }
  const statusClass = {
    "Menunggu BK": "status-menunggu",
    "Dipanggil": "status-dipanggil",
    "Selesai": "status-selesai",
  };
  wrap.innerHTML = `
    <table><thead><tr><th>Nama Siswa</th><th>NIS</th><th>Kelas</th><th>Semester</th><th>Jumlah</th>
    <th>Status</th><th>Aksi</th></tr></thead><tbody>
    ${list.map(p => `<tr>
      <td>${esc(p.namaSiswa)}</td><td>${esc(p.nis || "-")}</td><td>${esc(p.kelas || "-")}</td>
      <td>${esc(p.semester || "-")}</td><td><b>${p.jumlah}x</b></td>
      <td><span class="bk-status ${statusClass[p.status] || ""}">${esc(p.status)}</span></td>
      <td>
        ${opt.canWa ? `<button class="btn btn-wa btn-sm" data-wa="${p.id}">${icon("chat")} WA Ortu</button>` : ""}
        ${opt.canSelesai && p.status !== "Selesai" ? `<button class="btn btn-sm btn-primary" data-done="${p.id}" title="Tandai pemanggilan selesai">${icon("check")} Selesai</button>` : ""}
        ${opt.canHapus ? `<button class="btn btn-danger btn-sm" data-del="${p.id}">Hapus</button>` : ""}
      </td>
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-wa]").forEach(b =>
    b.addEventListener("click", () => kirimWa(b.dataset.wa)));
  wrap.querySelectorAll("[data-done]").forEach(b =>
    b.addEventListener("click", () => tandaiSelesai(b.dataset.done)));
  wrap.querySelectorAll("[data-del]").forEach(b => b.addEventListener("click", async () => {
    const ok = await uiConfirm({
      title: "Hapus catatan panggilan ini?",
      html: `<p>Catatan pemanggilan akan dihapus dari daftar.</p>`,
      okText: "Hapus",
    });
    if (!ok) return;
    savePanggilan(getPanggilan().filter(p => p.id !== b.dataset.del));
    toast("Catatan panggilan dihapus.");
    muatUlangHalamanAktif();
  }));
}

/* ---------- 9. PEMANGGILAN OLEH BK ---------- */
function loadBkDash() {
  renderPanggilan(
    [...getPanggilan()].sort((a, b) => (b.ts || 0) - (a.ts || 0)),
    "bkdashWrap",
    { canWa: true, canSelesai: true, canHapus: false }
  );
}

/* Tombol ✅ Selesai → status "Selesai" */
function tandaiSelesai(id) {
  const panggilan = getPanggilan();
  const item = panggilan.find(p => p.id === id);
  if (!item) return;
  item.status = "Selesai";
  item.diubahOleh = currentUser.nama;
  item.selesaiPada = Date.now();
  savePanggilan(panggilan);
  toast(`✅ Pemanggilan ${item.namaSiswa} ditandai SELESAI.`);
  muatUlangHalamanAktif();
}

function kirimNotifPanggilan(p) {
  const notif = getNotifikasi();
  if (p.nis && p.nis !== "-") {
    // ===== NOTIFIKASI KHUSUS ORANG TUA =====
    getUsers().filter(u => u.role === "ortu" && u.anakNis === p.nis).forEach(o => {
      notif.push({
        id: genId(), ts: Date.now(), nis: p.nis, untukOrtu: true,
        judul: "⚠️ PEMANGGILAN ORANG TUA & SISWA",
        pesan: `Anak Anda ${p.namaSiswa} (${p.jurusan || "-"} ${p.kelas || "-"}) telah melakukan pelanggaran tata tertib sebanyak ${p.jumlah}x pada semester ${p.semester}. Anda dipanggil oleh ${p.dipanggilOleh || "Guru BK"} untuk hadir ke sekolah bersama anak Anda.`,
        dibaca: false,
      });
    });
    // ===== NOTIFIKASI KHUSUS SISWA YANG MELANGGAR =====
    const su = getUsers().find(u => u.role === "siswa" && u.nis === p.nis);
    if (su) {
      notif.push({
        id: genId(), ts: Date.now(), nis: p.nis, untukSiswa: true,
        judul: "⚠️ Kamu & Orang Tuamu Dipanggil",
        pesan: `Kamu telah melakukan pelanggaran sebanyak ${p.jumlah}x pada semester ${p.semester}. Guru BK akan memanggil orang tuamu. Segera perbaiki diri dan jaga tata tertib ya.`,
        dibaca: false,
      });
      // ===== NOTIFIKASI KHUSUS WALI KELAS =====
      if (su.walikelasId) {
        const wk = getUsers().find(u => u.id === su.walikelasId && u.role === "walikelas");
        if (wk) {
          notif.push({
            id: genId(), ts: Date.now(), untukWk: true, wkId: wk.id,
            judul: "📞 Siswa Bimbingan Dipanggil BK",
            pesan: `Siswa bimbingan Anda ${su.nama} (${su.jurusan || "-"} ${su.kelas || "-"}) telah ${p.jumlah}x melanggar pada semester ${p.semester} dan dipanggil oleh ${p.dipanggilOleh || "Guru BK"}. Mohon pendampingan.`,
            dibaca: false,
          });
        }
      }
    }
  }
  saveNotifikasi(notif);
}

/* ---------- 10. DASHBOARD WALI KELAS ---------- */
function siswaBimbinganSaya() {
  return getUsers().filter(u => u.role === "siswa" && u.walikelasId === currentUser.id);
}

function loadWkDash() {
  $("wkNama").textContent = currentUser.nama;
  const semNow = semesterDariTanggal(new Date().toISOString().slice(0, 10));
  const siswaKelas = siswaBimbinganSaya();
  $("wkInfo").innerHTML =
    `Semester berjalan: <b>${semNow}</b> &nbsp;•&nbsp; Jumlah siswa bimbingan: <b>${siswaKelas.length}</b>`;

  const wrap = $("wkSiswaWrap");
  if (!siswaKelas.length) {
    wrap.innerHTML = `<div class="empty">${icon("users")}<p>Belum ada siswa yang ditugaskan kepada Anda. Admin dapat menugaskan lewat menu Kelola Siswa (kolom Wali Kelas).</p></div>`;
    return;
  }

  const pel = getPelanggaran();
  const pang = getPanggilan();

  wrap.innerHTML = `<table><thead><tr>
    <th>NIS</th><th>Nama</th><th>Jurusan/Kelas</th><th>Pelanggaran (sem. ini)</th><th>Status</th>
    </tr></thead><tbody>
    ${siswaKelas.map(s => {
      const jml = pel.filter(p => p.siswaKey === s.nis &&
        (p.semester || semesterDariTanggal(p.tanggal)) === semNow).length;
      const st = pang.find(p => p.siswaKey === s.nis && p.semester === semNow && p.status !== "Selesai");
      let status, warna = "muted";
      if (st) { status = st.status; warna = ""; }
      else if (jml >= BATAS_PANGGILAN) { status = "Antrian BK"; warna = ""; }
      else if (jml >= 3) { status = "Peringatan"; warna = ""; }
      else { status = "Aman"; }
      return `<tr>
        <td>${esc(s.nis || "-")}</td><td>${esc(s.nama)}</td>
        <td>${esc(s.jurusan || "-")} / ${esc(s.kelas || "-")}</td>
        <td><b>${jml}</b> / ${BATAS_PANGGILAN}</td>
        <td class="${warna}"><b>${esc(status)}</b></td>
      </tr>`;
    }).join("")}
    </tbody></table>`;
}

/* ---------- 11. MASTER JURUSAN (admin) ---------- */
let editJurusanId = null;

function jumlahSiswaDengan(field, nama) {
  return getUsers().filter(u => u.role === "siswa" && u[field] === nama).length;
}

function loadJurusan() {
  const list = [...getJurusan()].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  const wrap = $("jurusanWrap");
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("landmark")}<p>Belum ada data Jurusan. Tambahkan di form atas.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Nama Jurusan</th><th>Dipakai oleh</th><th>Aksi</th>
    </tr></thead><tbody>
    ${list.map(x => `<tr>
      <td><b>${esc(x.nama)}</b></td><td>${jumlahSiswaDengan("jurusan", x.nama)} siswa</td>
      <td><button class="btn btn-sm" data-ejr="${x.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-djr="${x.id}">Hapus</button></td>
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-ejr]").forEach(b =>
    b.addEventListener("click", () => startEditJurusan(b.dataset.ejr)));
  wrap.querySelectorAll("[data-djr]").forEach(b =>
    b.addEventListener("click", () => deleteJurusan(b.dataset.djr)));
}

function submitJurusan(e) {
  e.preventDefault();
  const nama = $("jRNama").value.trim();
  if (!nama) { toast("Nama Jurusan wajib diisi.", "err"); return; }

  const list = getJurusan();
  if (list.some(x => (x.nama || "").toLowerCase() === nama.toLowerCase() && x.id !== editJurusanId)) {
    toast(`Jurusan "${nama}" sudah ada dalam daftar.`, "err"); return;
  }

  if (editJurusanId) {
    const item = list.find(x => x.id === editJurusanId);
    if (!item) { toast("Data tidak ditemukan.", "err"); return; }
    item.nama = nama;
    toast("Jurusan berhasil diperbarui.");
  } else {
    list.push({ id: genId(), nama });
    toast("Jurusan baru ditambahkan.");
  }
  saveJurusan(list);
  resetJurusanForm();
  loadJurusan();
}

function startEditJurusan(id) {
  const item = getJurusan().find(x => x.id === id);
  if (!item) return;
  editJurusanId = id;
  $("jRNama").value = item.nama;
  $("btnSubmitJurusan").textContent = "Simpan Perubahan";
  $("formJurusanTitle").textContent = "Edit Jurusan";
  show($("btnCancelJurusan"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetJurusanForm() {
  editJurusanId = null;
  $("formJurusan").reset();
  $("btnSubmitJurusan").textContent = "Tambah";
  $("formJurusanTitle").textContent = "Tambah Jurusan";
  hide($("btnCancelJurusan"));
}

async function deleteJurusan(id) {
  const list = getJurusan();
  const item = list.find(x => x.id === id);
  if (!item) return;
  const dipakaiSiswa = jumlahSiswaDengan("jurusan", item.nama);
  const dipakaiKelas = getKelas().filter(k => k.jurusan === item.nama).length;
  const catatan = [];
  if (dipakaiSiswa) catatan.push(`Dipakai <b>${dipakaiSiswa}</b> siswa (data mereka tetap menyimpan nilainya).`);
  if (dipakaiKelas) catatan.push(`Dipakai <b>${dipakaiKelas}</b> kelas (nama kelas tidak berubah).`);
  const ok = await uiConfirm({
    title: `Hapus Jurusan "${esc(item.nama)}"?`,
    html: catatan.length
      ? `<p>Yakin ingin menghapus jurusan ini?</p><ul class="modal-list">${catatan.map(c => `<li>${c}</li>`).join("")}</ul>`
      : `<p>Yakin ingin menghapus jurusan ini dari daftar?</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  saveJurusan(list.filter(x => x.id !== id));
  toast("Jurusan dihapus.");
  loadJurusan();
}

/* ---------- 12. MASTER KELAS (Tingkat + Jurusan + Rombongan) ---------- */
let editKelasId = null;

function isiDropdownKelasJurusan() {
  const cur = $("kJurusan").value;
  const list = [...getJurusan()].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  $("kJurusan").innerHTML = list.length
    ? list.map(x => `<option value="${esc(x.nama)}">${esc(x.nama)}</option>`).join("")
    : `<option value="">— daftar jurusan kosong, tambahkan di menu Kelola Jurusan —</option>`;
  $("kJurusan").value = cur;
  if ($("kJurusan").selectedIndex === -1) $("kJurusan").value = "";
}

function updateKelasPreview() {
  const t = $("kTingkat").value, j = $("kJurusan").value, r = $("kRombel").value;
  $("kPreview").textContent = (t && j && r)
    ? `Kelas akan tersimpan sebagai: ${t} ${j} ${r}` : "";
}

function loadKelas() {
  isiDropdownKelasJurusan();
  updateKelasPreview();

  const list = [...getKelas()].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  const wrap = $("kelasWrap");
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("layers")}<p>Belum ada data Kelas. Tambahkan di form atas.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Tingkat</th><th>Jurusan</th><th>Rombongan</th><th>Nama Kelas</th><th>Dipakai oleh</th><th>Aksi</th>
    </tr></thead><tbody>
    ${list.map(x => `<tr>
      <td>${esc(x.tingkat || "-")}</td><td>${esc(x.jurusan || "-")}</td><td>${esc(x.rombel || "-")}</td>
      <td><b>${esc(x.nama)}</b></td><td>${jumlahSiswaDengan("kelas", x.nama)} siswa</td>
      <td><button class="btn btn-sm" data-ek="${x.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-dk="${x.id}">Hapus</button></td>
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-ek]").forEach(b =>
    b.addEventListener("click", () => startEditKelas(b.dataset.ek)));
  wrap.querySelectorAll("[data-dk]").forEach(b =>
    b.addEventListener("click", () => deleteKelas(b.dataset.dk)));
}

function submitKelas(e) {
  e.preventDefault();
  const tingkat = $("kTingkat").value;
  const jurusan = $("kJurusan").value;
  const rombel  = $("kRombel").value;

  if (!jurusan) {
    toast("Pilih Jurusan. Jika daftar kosong, tambahkan dulu di menu Kelola Jurusan.", "err"); return;
  }
  const nama = `${tingkat} ${jurusan} ${rombel}`;

  const list = getKelas();
  if (list.some(x => (x.nama || "").toLowerCase() === nama.toLowerCase() && x.id !== editKelasId)) {
    toast(`Kelas "${nama}" sudah ada dalam daftar.`, "err"); return;
  }

  if (editKelasId) {
    const item = list.find(x => x.id === editKelasId);
    if (!item) { toast("Data tidak ditemukan.", "err"); return; }
    Object.assign(item, { nama, tingkat, jurusan, rombel });
    toast("Kelas berhasil diperbarui.");
  } else {
    list.push({ id: genId(), nama, tingkat, jurusan, rombel });
    toast(`Kelas "${nama}" ditambahkan.`);
  }
  saveKelas(list);
  resetKelasForm();
  loadKelas();
}

function startEditKelas(id) {
  const item = getKelas().find(x => x.id === id);
  if (!item) return;

  if (!(item.tingkat && item.jurusan && item.rombel)) {
    toast(`Kelas "${item.nama}" dibuat dengan format lama dan tidak dapat diedit di form baru. Hapus lalu tambah ulang dengan format baru (contoh: XI RPL A).`, "warn");
    return;
  }

  isiDropdownKelasJurusan();
  if (![...$("kJurusan").options].some(o => o.value === item.jurusan)) {
    const opt = document.createElement("option");
    opt.value = item.jurusan;
    opt.textContent = item.jurusan + " (jurusan sudah dihapus)";
    $("kJurusan").appendChild(opt);
  }

  editKelasId = id;
  $("kTingkat").value = item.tingkat;
  $("kJurusan").value = item.jurusan;
  $("kRombel").value = item.rombel;
  updateKelasPreview();
  $("btnSubmitKelas").textContent = "Simpan Perubahan";
  $("formKelasTitle").textContent = "Edit Kelas";
  show($("btnCancelKelas"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetKelasForm() {
  editKelasId = null;
  $("formKelas").reset();
  $("kTingkat").value = "X";
  $("kRombel").value = "A";
  isiDropdownKelasJurusan();
  updateKelasPreview();
  $("btnSubmitKelas").textContent = "Tambah";
  $("formKelasTitle").textContent = "Tambah Kelas";
  hide($("btnCancelKelas"));
}

async function deleteKelas(id) {
  const list = getKelas();
  const item = list.find(x => x.id === id);
  if (!item) return;
  const dipakai = jumlahSiswaDengan("kelas", item.nama);
  const ok = await uiConfirm({
    title: `Hapus Kelas "${esc(item.nama)}"?`,
    html: dipakai
      ? `<p>Saat ini dipakai <b>${dipakai}</b> siswa (data siswa tetap menyimpan nilainya).</p>`
      : `<p>Yakin ingin menghapus kelas ini dari daftar?</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  saveKelas(list.filter(x => x.id !== id));
  toast("Kelas dihapus.");
  loadKelas();
}

/* ---------- 13. DROPDOWN REFERENSI (jurusan & kelas, untuk form siswa) ---------- */
function isiSatuDropdown(id, list) {
  const el = $(id);
  if (!el) return;
  const sorted = [...list].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  el.innerHTML = `<option value="">— pilih —</option>` +
    sorted.map(x => `<option value="${esc(x.nama)}">${esc(x.nama)}</option>`).join("");
}

function isiDropdownKelasSiswa(kelasTerpilih = "") {
  const dropdownJurusan = $("sJurusan");
  const dropdownKelas = $("sKelas");
  if (!dropdownJurusan || !dropdownKelas) return;

  const jurusanDipilih = dropdownJurusan.value || "";
  const daftarKelas = jurusanDipilih
    ? getKelas().filter(k => (k.jurusan || "").trim().toLowerCase() === jurusanDipilih.trim().toLowerCase())
    : [];

  dropdownKelas.innerHTML = `<option value="">${jurusanDipilih ? "— pilih kelas —" : "— pilih jurusan terlebih dahulu —"}</option>` +
    [...daftarKelas].sort((a, b) => (a.nama || "").localeCompare(b.nama || ""))
      .map(k => `<option value="${esc(k.nama)}">${esc(k.nama)}</option>`).join("");
  dropdownKelas.disabled = !jurusanDipilih;

  if (kelasTerpilih && daftarKelas.some(k => k.nama === kelasTerpilih)) {
    dropdownKelas.value = kelasTerpilih;
  } else {
    dropdownKelas.value = "";
  }
}

function isiDropdownReferensi() {
  const jurusanSiswa = $("sJurusan")?.value || "";
  isiSatuDropdown("sJurusan", getJurusan());
  if (jurusanSiswa && [...$("sJurusan").options].some(o => o.value === jurusanSiswa)) {
    $("sJurusan").value = jurusanSiswa;
  }
  isiDropdownKelasSiswa($("sKelas")?.value || "");
}

function pastikanOpsi(selId, val) {
  if (!val) return;
  const el = $(selId);
  if (!el) return;
  if ([...el.options].some(o => o.value === val)) return;
  const opt = document.createElement("option");
  opt.value = val;
  opt.textContent = val + " (lama — tidak ada di daftar)";
  el.appendChild(opt);
}

/* ---------- 14. KELOLA BENTUK PELANGGARAN ---------- */
let editJenisId = null;

function loadJenis() {
  const list = [...getJenis()].sort((a, b) => (a.kode || "").localeCompare(b.kode || ""));
  const wrap = $("jenisWrap");
  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("book")}<p>Belum ada bentuk pelanggaran. Tambahkan di form atas.</p></div>`;
    return;
  }
  wrap.innerHTML = `<table><thead><tr>
    <th>Kode</th><th>Nama Bentuk Pelanggaran</th><th>Aksi</th>
    </tr></thead><tbody>
    ${list.map(j => `<tr>
      <td><b>${esc(j.kode)}</b></td><td>${esc(j.nama)}</td>
      <td><button class="btn btn-sm" data-ej="${j.id}">Edit</button>
          <button class="btn btn-danger btn-sm" data-dj="${j.id}">Hapus</button></td>
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-ej]").forEach(b =>
    b.addEventListener("click", () => startEditJenis(b.dataset.ej)));
  wrap.querySelectorAll("[data-dj]").forEach(b =>
    b.addEventListener("click", () => deleteJenis(b.dataset.dj)));
}

function submitJenis(e) {
  e.preventDefault();
  const nama = $("jNama").value.trim();
  if (!nama) { toast("Nama bentuk pelanggaran wajib diisi.", "err"); return; }

  const jenis = getJenis();
  const dup = jenis.find(j =>
    (j.nama || "").toLowerCase() === nama.toLowerCase() && j.id !== editJenisId);
  if (dup) { toast("Bentuk pelanggaran itu sudah ada dalam daftar.", "err"); return; }

  if (editJenisId) {
    const j = jenis.find(x => x.id === editJenisId);
    if (!j) { toast("Data tidak ditemukan.", "err"); return; }
    j.nama = nama;
    saveJenis(jenis);
    toast("Bentuk pelanggaran berhasil diperbarui.");
  } else {
    jenis.push({ id: genId(), kode: nextKode(), nama });
    saveJenis(jenis);
    toast("Bentuk pelanggaran baru ditambahkan.");
  }
  resetJenisForm();
  loadJenis();
}

function startEditJenis(id) {
  const j = getJenis().find(x => x.id === id);
  if (!j) return;
  editJenisId = id;
  $("jNama").value = j.nama;
  $("btnSubmitJenis").textContent = "Simpan Perubahan";
  $("formJenisTitle").textContent = "Edit Bentuk Pelanggaran";
  show($("btnCancelJenis"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetJenisForm() {
  editJenisId = null;
  $("formJenis").reset();
  $("btnSubmitJenis").textContent = "Tambah";
  $("formJenisTitle").textContent = "Tambah Bentuk Pelanggaran";
  hide($("btnCancelJenis"));
}

async function deleteJenis(id) {
  const j = getJenis().find(x => x.id === id);
  if (!j) return;
  const ok = await uiConfirm({
    title: `Hapus "${esc(j.nama)}"?`,
    html: `<p>Bentuk pelanggaran akan dihapus dari daftar. Catatan lama tetap menyimpan nama jenisnya.</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  saveJenis(getJenis().filter(x => x.id !== id));
  toast("Bentuk pelanggaran dihapus.");
  loadJenis();
}

/* ---------- 15. INPUT PELANGGARAN ---------- */
function isiDropdownSiswaPelanggaran(siswaTerpilih = "") {
  const dropdown = $("mSiswa");
  if (!dropdown) return;

  const siswa = getUsers()
    .filter(u => u.role === "siswa")
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));

  dropdown.innerHTML = `<option value="">— pilih siswa —</option>` +
    siswa.map(s => `<option value="${esc(s.id)}">${esc(s.nama)} — NIS: ${esc(s.nis || "-")} (${esc(s.kelas || "-")})</option>`).join("");

  if (siswaTerpilih && siswa.some(s => s.id === siswaTerpilih)) {
    dropdown.value = siswaTerpilih;
  }
  dropdown.disabled = siswa.length === 0;
  if (!siswa.length) {
    dropdown.innerHTML = `<option value="">— belum ada data siswa di Kelola Data Siswa —</option>`;
  }
  isiDataSiswaPelanggaran();
}

/* ===== NO. HP ORANG TUA LANGSUNG DARI DATA SISWA =====
   Nomor disimpan langsung pada record siswa (field noHpOrtu) yang
   dikelola di menu Kelola Data Siswa, sehingga tetap tersedia walau
   akun orang tua belum dibuat. Fallback: akun orang tua terhubung NIS. */
function getNoHpOrtuSiswa(siswa) {
  if (!siswa) return "";
  const ortu = siswa.nis
    ? getUsers().find(u => u.role === "ortu" && u.anakNis === siswa.nis)
    : null;
  return String(siswa.noHpOrtu || ortu?.noHp || siswa.noHp || "").trim();
}

/* No. HP READONLY — diambil LANGSUNG dari data siswa (Kelola Data Siswa) */
function isiDataSiswaPelanggaran() {
  const id = $("mSiswa")?.value || "";
  const siswa = getUsers().find(u => u.id === id && u.role === "siswa");
  const info = $("noHpInfo");

  if (!siswa) {
    $("mNoHp").value = "";
    if (info) info.textContent = "Pilih siswa — nomor HP orang tua terisi otomatis dari data siswa di menu Kelola Data Siswa.";
    return;
  }

  const noHp = getNoHpOrtuSiswa(siswa);
  $("mNoHp").value = noHp;
  if (info) {
    info.textContent = noHp
      ? `Nomor diambil langsung dari data siswa: ${siswa.nama} (${siswa.kelas || "-"}) — menu Kelola Data Siswa.`
      : `⚠️ Data siswa ${siswa.nama} belum punya No. HP orang tua. Isi kolom "No. HP/WA Orang Tua" di menu Kelola Data Siswa.`;
  }
}

/* Dropdown Tahun Pelajaran: rentang tahun sekarang -2 s/d +1 */
function isiDropdownTahunPelajaran() {
  const now = new Date().getFullYear();
  const opts = [];
  for (let y = now - 2; y <= now + 1; y++) opts.push(`${y}/${y + 1}`);
  $("inTahun").innerHTML = opts.map(t => `<option value="${t}">${t}</option>`).join("");
}

/* Semester & tahun pelajaran otomatis mengikuti tanggal (dapat dioverride manual) */
function sinkronSemesterDariTanggal() {
  const t = $("inTanggal").value;
  if (!t) return;
  const d = new Date(t + "T00:00:00");
  if (isNaN(d)) return;
  const y = d.getFullYear(), m = d.getMonth() + 1;
  const sem = (m >= 7) ? "Ganjil" : "Genap";
  const thn = (m >= 7) ? `${y}/${y + 1}` : `${y - 1}/${y}`;
  isiDropdownTahunPelajaran();               // pastikan daftar tahun tersedia
  $("inSemester").value = sem;
  $("inTahun").value = thn;
  if ($("inTahun").selectedIndex === -1) {   // tanggal di luar rentang daftar
    pastikanOpsi("inTahun", thn);
    $("inTahun").value = thn;
  }
  updateSemInfo();
}

function updateSemInfo() {
  const sem = $("inSemester").value;
  const thn = $("inTahun").value;
  $("semInfo").textContent = (sem && thn)
    ? `Semester terpilih: ${sem} — Tahun Pelajaran ${thn}`
    : "";
}

function initInputPage() {
  isiDropdownSiswaPelanggaran();

  const jenisList = [...getJenis()].sort((a, b) => (a.kode || "").localeCompare(b.kode || ""));
  $("inJenis").innerHTML = jenisList.length
    ? jenisList.map(j => `<option value="${j.id}">${esc(j.kode)} — ${esc(j.nama)}</option>`).join("")
    : `<option value="">— Belum ada daftar, tambahkan di menu Bentuk Pelanggaran —</option>`;

  $("inTanggal").value = new Date().toISOString().slice(0, 10);
  isiDropdownTahunPelajaran();
  sinkronSemesterDariTanggal();
}

function submitPelanggaran(e) {
  e.preventDefault();

  const siswaId = $("mSiswa").value;
  const siswaTerpilih = getUsers().find(u => u.id === siswaId && u.role === "siswa");
  const noHp = $("mNoHp").value.trim();

  if (!siswaTerpilih) {
    toast("Pilih siswa yang sudah terdaftar di menu Kelola Data Siswa.", "err");
    return;
  }

  const nama = siswaTerpilih.nama;
  const jurusanNama = siswaTerpilih.jurusan || "";
  const kelasNama = siswaTerpilih.kelas || "";
  const dataKelasDipilih = getKelas().find(k => k.nama === kelasNama);

  if (!nama || !siswaTerpilih.nis || !jurusanNama || !kelasNama) {
    toast("Data siswa belum lengkap. Periksa NIS, jurusan, dan kelas di menu Kelola Data Siswa.", "err");
    return;
  }

  if (dataKelasDipilih &&
     (dataKelasDipilih.jurusan || "").trim().toLowerCase() !== jurusanNama.trim().toLowerCase()) {
    toast("Jurusan dan kelas pada data siswa tidak sesuai. Perbaiki melalui menu Kelola Data Siswa.", "err");
    return;
  }

  const jenis = getJenis().find(x => x.id === $("inJenis").value);
  if (!jenis) {
    toast("Pilih bentuk pelanggaran. Jika daftar kosong, tambahkan dulu di menu Bentuk Pelanggaran.", "err");
    return;
  }

  const tanggal = $("inTanggal").value;
  if (!tanggal) { toast("Lengkapi tanggal.", "err"); return; }

  // Semester & tahun pelajaran dari dropdown (bisa dioverride manual)
  const semesterPilihan = $("inSemester").value;
  const tahunPelajaran = $("inTahun").value;
  if (!semesterPilihan || !tahunPelajaran) {
    toast("Lengkapi semester dan tahun pelajaran.", "err"); return;
  }
  const semesterFinal = `${semesterPilihan} ${tahunPelajaran}`;

  const s = {
    key: siswaTerpilih.nis,
    nis: siswaTerpilih.nis,
    nama: siswaTerpilih.nama,
    jurusan: jurusanNama,
    kelas: kelasNama,
    waNumber: noHp || null
  };

  const pel = getPelanggaran();
  pel.push({
    id: genId(), ts: Date.now(),
    siswaKey: s.key, nis: s.nis, namaSiswa: s.nama,
    jurusan: s.jurusan, kelas: s.kelas,
    jenisId: jenis.id, jenisKode: jenis.kode, jenisNama: jenis.nama,
    semester: semesterFinal,
    tanggal, keterangan: $("inKet").value.trim(),
    dicatatOleh: currentUser.nama,
  });
  savePelanggaran(pel);

  toast("Pelanggaran tersimpan.");
  $("formPelanggaran").reset();
  isiDropdownSiswaPelanggaran();
  $("inTanggal").value = new Date().toISOString().slice(0, 10);
  isiDropdownTahunPelajaran();
  sinkronSemesterDariTanggal();
  cekBatasPanggilan(s, tanggal, semesterFinal);
}

/* ---------- 16. ATURAN 5x PER SEMESTER → ANTRIAN BK ---------- */
function cekBatasPanggilan(s, tanggal, semester) {
  const sem = semester || semesterDariTanggal(tanggal);
  const jumlah = getPelanggaran().filter(p => p.siswaKey === s.key && p.semester === sem).length;

  if (jumlah < BATAS_PANGGILAN) {
    toast(`Total pelanggaran ${s.nama} (semester ${sem}): ${jumlah}/${BATAS_PANGGILAN}`);
    return;
  }

  const panggilan = getPanggilan();
  const sudahAdaAktif = panggilan.some(p =>
    p.siswaKey === s.key && p.semester === sem && p.status !== "Selesai");

  if (!sudahAdaAktif) {
    panggilan.push({
      id: genId(), ts: Date.now(),
      siswaKey: s.key, nis: s.nis, namaSiswa: s.nama,
      jurusan: s.jurusan, kelas: s.kelas, semester: sem,
      jumlah, status: "Menunggu BK", waNumber: s.waNumber,
      keterangan: `Siswa ${jumlah}x melanggar pada semester ${sem} — menunggu penanganan Guru BK.`,
    });

    const notif = getNotifikasi();
    getUsers().filter(u => u.role === "bk").forEach(bk => {
      notif.push({
        id: genId(), ts: Date.now(), untukBk: true,
        judul: "📋 Tugas Pemanggilan Baru",
        pesan: `${s.nama} (${s.jurusan || "-"} ${s.kelas || "-"}) telah ${jumlah}x melanggar pada semester ${sem}. Silakan proses pemanggilan orang tua & siswa di menu Pemanggilan BK.`,
        dibaca: false,
      });
    });

    const su = getUsers().find(u => u.role === "siswa" && u.nis === s.nis);
    if (su && su.walikelasId) {
      const wk = getUsers().find(u => u.id === su.walikelasId && u.role === "walikelas");
      if (wk) {
        notif.push({
          id: genId(), ts: Date.now(), untukWk: true, wkId: wk.id,
          judul: "📚 Siswa Bimbingan Mencapai Batas",
          pesan: `Siswa bimbingan Anda ${su.nama} (${su.jurusan || "-"} ${su.kelas || "-"}) telah ${jumlah}x melanggar pada semester ${sem}. Siswa masuk antrian pemanggilan Guru BK.`,
          dibaca: false,
        });
      }
    }
    saveNotifikasi(notif);
    savePanggilan(panggilan);

    toast(`⚠️ ${s.nama} mencapai ${jumlah}x pada semester ${sem}! Masuk antrian pemanggilan GURU BK (wali kelas ikut diberi tahu).`, "warn");
  } else {
    toast(`Total pelanggaran ${s.nama} (${sem}): ${jumlah}x (sudah dalam antrian BK).`, "warn");
  }
}

/* ---------- 17. KIRIM WHATSAPP (LANGSUNG KE WA) ---------- */
/* DUA MODE PENGIRIMAN:
   mode "link" (default) : WA terbuka dengan pesan SUDAH TERISI, tinggal tekan Kirim.
   mode "api"  (opsional): kirim OTOMATIS lewat WhatsApp Cloud API (butuh token Meta).
   Token di file ini = client-side, hanya aman untuk pemakaian internal/lokal sekolah. */
const WA_CONFIG = {
  mode: "link",          // "link" = buka WA dengan pesan terisi | "api" = kirim otomatis
  apiToken: "",          // contoh: "EAAG...xxxx" (Meta Developer > WhatsApp > API Setup)
  phoneNumberId: "",     // contoh: "123456789012345" (Phone Number ID)
  apiUrl: "https://graph.facebook.com/v19.0",
};

const NAMA_SEKOLAH_WA = "SMK Negeri 2 Trenggalek";

/* Rapikan nomor ke format internasional tanpa tanda: 08xx / 8xx → 62xxxxxxxxxx */
function normalisasiNoWa(no) {
  let n = String(no || "").replace(/\D/g, "");
  if (n.startsWith("62")) return n;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return n;
}

/* Susun isi pesan pemanggilan lengkap dengan daftar pelanggarannya */
function buatPesanPanggilanWa(p) {
  const ortuP = (p.nis && p.nis !== "-")
    ? getUsers().find(u => u.role === "ortu" && u.anakNis === p.nis) : null;
  const sapaan = ortuP?.nama ? `Kepada Yth. ${ortuP.nama}` : `Kepada Yth. Bapak/Ibu Orang Tua/Wali`;

  const daftar = getPelanggaran()
    .filter(x => x.siswaKey === p.siswaKey && x.semester === p.semester)
    .sort((a, b) => (a.tanggal || "").localeCompare(b.tanggal || ""));
  const baris = daftar.length
    ? daftar.map((x, i) =>
        `${i + 1}. ${fmtTanggal(x.tanggal)} — ${x.jenisNama || "-"}` +
        (x.keterangan ? ` (${x.keterangan})` : "")).join("\n")
    : `-`;

  return [
    `*PEMANGGILAN ORANG TUA & SISWA*`,
    `${NAMA_SEKOLAH_WA}`,
    ``,
    `${sapaan} dari:`,
    `• Nama  : ${p.namaSiswa}`,
    `• NIS   : ${p.nis || "-"}`,
    `• Kelas : ${p.kelas || "-"}`,
    ``,
    `Anak Anda tercatat melakukan *${p.jumlah}x pelanggaran* tata tertib pada semester *${p.semester}*:`,
    ``,
    baris,
    ``,
    `Mohon kehadiran Bapak/Ibu bersama putra/putri Anda ke sekolah untuk pertemuan bersama Guru BK.`,
    ``,
    `— Pesan otomatis dari sistem *E-TATIB* oleh ${currentUser?.nama || "Tim Tatib"}. Terima kasih. 🙏`,
  ].join("\n");
}

/* MODE link: buka WhatsApp (aplikasi di HP / WhatsApp Web di laptop) */
function bukaWaLink(noHp, pesan) {
  const teks = encodeURIComponent(pesan);
  const mobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  const url = mobile
    ? `https://api.whatsapp.com/send?phone=${noHp}&text=${teks}`
    : `https://web.whatsapp.com/send?phone=${noHp}&text=${teks}`;
  const a = document.createElement("a");
  a.href = url; a.target = "_blank"; a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/* MODE api: kirim langsung lewat WhatsApp Cloud API (tanpa buka aplikasi) */
async function kirimWaApi(noHp, pesan) {
  const res = await fetch(`${WA_CONFIG.apiUrl}/${WA_CONFIG.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WA_CONFIG.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: noHp,
      type: "text",
      text: { preview_url: false, body: pesan },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} — ${detail.slice(0, 180)}`);
  }
}

/* Tombol 💬 WA Ortu = status otomatis jadi "Dipanggil"
   (hanya jika status masih "Menunggu BK") + pesan langsung dikirim ke WA. */
async function kirimWa(panggilanId) {
  const panggilan = getPanggilan();
  const p = panggilan.find(x => x.id === panggilanId);
  if (!p) { toast("Data panggilan tidak ditemukan.", "err"); return; }

  /* Nomor dibaca LANGSUNG dari data siswa (Kelola Data Siswa),
     fallback ke akun orang tua lalu ke nomor saat panggilan dibuat. */
  const siswaP = (p.nis && p.nis !== "-")
    ? getUsers().find(u => u.role === "siswa" && u.nis === p.nis)
    : null;
  const noHpRaw = getNoHpOrtuSiswa(siswaP) || p.waNumber;
  const noHp = normalisasiNoWa(noHpRaw);

  if (!noHp || noHp.length < 10 || noHp.length > 15) {
    toast("Nomor HP orang tua belum valid (format 62…). Isi di Kelola Siswa atau Kelola Orang Tua.", "err");
    return;
  }

  if (p.status === "Menunggu BK") {
    p.status = "Dipanggil";
    p.dipanggilOleh = currentUser.nama;
    p.dipanggilPada = Date.now();
    const jumlahKini = getPelanggaran()
      .filter(x => x.siswaKey === p.siswaKey && x.semester === p.semester).length;
    if (jumlahKini > 0) p.jumlah = jumlahKini;
    savePanggilan(panggilan);
    kirimNotifPanggilan(p);
  }

  const pesan = buatPesanPanggilanWa(p);

  /* MODE api — benar-benar terkirim otomatis */
  if (WA_CONFIG.mode === "api" && WA_CONFIG.apiToken && WA_CONFIG.phoneNumberId) {
    try {
      await kirimWaApi(noHp, pesan);
      toast(`✅ Pesan WhatsApp langsung terkirim ke ${noHp}.`, "ok");
      muatUlangHalamanAktif();
      return;
    } catch (e) {
      const buka = await uiConfirm({
        title: "Kirim via API gagal",
        html: `<p>Pesan tidak terkirim lewat WhatsApp Cloud API.</p>
               <p><code>${esc(e.message)}</code></p>
               <p>Buka WhatsApp manual dengan pesan yang sudah terisi?</p>`,
        okText: "Buka WhatsApp",
      });
      if (buka) bukaWaLink(noHp, pesan);
      muatUlangHalamanAktif();
      return;
    }
  }

  /* MODE link (default) — WA terbuka dengan pesan sudah terisi, tinggal tekan Kirim */
  bukaWaLink(noHp, pesan);
  toast(`💬 WhatsApp terbuka — pesan untuk orang tua ${p.namaSiswa} sudah terisi, tinggal tekan Kirim.`, "ok");
  muatUlangHalamanAktif();
}

/* ---------- 18. DATA PELANGGARAN ---------- */
function loadPelanggaran() {
  const wrap = $("pelanggaranWrap");
  if (!wrap) return;

  const kw = ($("cariPelanggaran")?.value || "").trim().toLowerCase();
  let list = [...getPelanggaran()].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  // Wali kelas hanya melihat siswa bimbingannya
  if (currentUser.role === "walikelas") {
    const nisBimbingan = new Set(siswaBimbinganSaya().map(s => s.nis));
    list = list.filter(p => nisBimbingan.has(p.siswaKey));
  }

  if (kw) {
    list = list.filter(p =>
      (p.namaSiswa || "").toLowerCase().includes(kw) ||
      (p.nis || "").toLowerCase().includes(kw) ||
      (p.jenisNama || "").toLowerCase().includes(kw) ||
      (p.kelas || "").toLowerCase().includes(kw));
  }

  if (!list.length) {
    wrap.innerHTML = kw
      ? `<div class="empty">${icon("search")}<p>Tidak ada data yang cocok dengan pencarian "<b>${esc(kw)}</b>".</p></div>`
      : `<div class="empty">${icon("clipboard")}<p>Belum ada data pelanggaran. Catat lewat menu Input Pelanggaran.</p></div>`;
    return;
  }

  const canHapus = currentUser.role === "admin" || currentUser.role === "tatib";
  wrap.innerHTML = `
    <table><thead><tr>
      <th>Tanggal</th><th>Nama Siswa</th><th>NIS</th><th>Kelas</th>
      <th>Pelanggaran</th><th>Semester</th><th>Dicatat Oleh</th>${canHapus ? "<th>Aksi</th>" : ""}
    </tr></thead><tbody>
    ${list.map(p => `<tr>
      <td>${fmtTanggal(p.tanggal)}</td>
      <td><b>${esc(p.namaSiswa)}</b></td>
      <td>${esc(p.nis || "-")}</td>
      <td>${esc(p.kelas || "-")}</td>
      <td><b>${esc(p.jenisKode || "")}</b> ${esc(p.jenisNama || "-")}${p.keterangan ? `<br><small class="muted">${esc(p.keterangan)}</small>` : ""}</td>
      <td>${esc(p.semester || "-")}</td>
      <td>${esc(p.dicatatOleh || "-")}</td>
      ${canHapus ? `<td><button class="btn btn-danger btn-sm" data-delpel="${p.id}">${icon("trash")} Hapus</button></td>` : ""}
    </tr>`).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-delpel]").forEach(b =>
    b.addEventListener("click", async () => {
      const ok = await uiConfirm({
        title: "Hapus catatan pelanggaran ini?",
        html: `<p>Catatan pelanggaran akan dihapus permanen dari data.</p>`,
        okText: "Hapus",
      });
      if (!ok) return;
      savePelanggaran(getPelanggaran().filter(x => x.id !== b.dataset.delpel));
      toast("Catatan pelanggaran dihapus.");
      muatUlangHalamanAktif();
    }));
}

/* ---------- 19. NOTIFIKASI ---------- */
/* ID wadah dicari fleksibel: notifWrap / notifikasiWrap (sesuaikan bila perlu) */
function notifTargetLabel(n) {
  if (n.untukOrtu) return `<span class="notif-target target-ortu">Untuk Orang Tua</span>`;
  if (n.untukSiswa) return `<span class="notif-target target-siswa">Untuk Siswa</span>`;
  if (n.untukBk) return `<span class="notif-target target-bk">Untuk Guru BK</span>`;
  if (n.untukWk) return `<span class="notif-target target-wk">Untuk Wali Kelas</span>`;
  return "";
}

function loadNotifikasi() {
  const wrap = $("notifWrap") || $("notifikasiWrap");
  if (!wrap) return;
  const list = [...notifUntukSaya()].sort((a, b) => (b.ts || 0) - (a.ts || 0));

  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("bell")}<p>Belum ada notifikasi untukmu.</p></div>`;
    return;
  }

  const unread = list.filter(n => !n.dibaca).length;
  wrap.innerHTML = `
    <div class="btn-row" style="margin-bottom:14px">
      <button class="btn btn-sm" id="btnTandaiSemua" ${unread ? "" : "disabled"}>${icon("check")} Tandai semua dibaca${unread ? ` (${unread})` : ""}</button>
    </div>
    ${list.map(n => `
      <div class="card notif-card ${n.dibaca ? "is-read" : ""}" style="margin-bottom:12px">
        <h3>${esc(n.judul)} ${notifTargetLabel(n)}${n.dibaca ? "" : ` <span class="notif-badge">Baru</span>`}</h3>
        <p class="notif-time muted">${fmtWaktu(n.ts)}</p>
        <p>${esc(n.pesan)}</p>
        ${n.dibaca ? "" : `<button class="btn btn-sm" data-read="${n.id}">${icon("check")} Tandai dibaca</button>`}
      </div>`).join("")}`;

  const btnAll = $("btnTandaiSemua");
  if (btnAll) btnAll.addEventListener("click", () => {
    const notif = getNotifikasi();
    const idSaya = new Set(notifUntukSaya().map(n => n.id));
    notif.forEach(n => { if (idSaya.has(n.id)) n.dibaca = true; });
    saveNotifikasi(notif);
    buildSidebar();
    loadNotifikasi();
    toast("Semua notifikasi ditandai dibaca.");
  });
  wrap.querySelectorAll("[data-read]").forEach(b =>
    b.addEventListener("click", () => {
      const notif = getNotifikasi();
      const n = notif.find(x => x.id === b.dataset.read);
      if (n) n.dibaca = true;
      saveNotifikasi(notif);
      buildSidebar();
      loadNotifikasi();
    }));
}

/* Notifikasi browser asli (jika diizinkan) untuk notif yang belum dibaca */
function pushBrowserNotif() {
  if (!("Notification" in window)) return;
  const tampilkan = () => {
    notifUntukSaya().filter(n => !n.dibaca).slice(0, 3).forEach(n => {
      try { new Notification("E-TATIB — " + n.judul, { body: String(n.pesan || "").slice(0, 140) }); } catch (_) { }
    });
  };
  if (Notification.permission === "granted") tampilkan();
  else if (Notification.permission !== "denied") {
    try {
      Notification.requestPermission().then(p => { if (p === "granted") tampilkan(); }).catch(() => { });
    } catch (_) { }
  }
}

/* ---------- 20. RIWAYAT (akun siswa & orang tua) ---------- */
function loadRiwayat() {
  const wrap = $("riwayatWrap") || $("riwayatSiswaWrap");
  if (!wrap) return;

  const nis = currentUser.role === "ortu" ? currentUser.anakNis
            : currentUser.role === "siswa" ? currentUser.nis : null;

  if (!nis) {
    wrap.innerHTML = `<div class="empty">${icon("user")}<p>Akun ini belum terhubung dengan data siswa (NIS).</p></div>`;
    return;
  }

  const semNow = semesterDariTanggal(new Date().toISOString().slice(0, 10));
  const pel = getPelanggaran().filter(p => p.siswaKey === nis).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const jmlSemIni = pel.filter(p => p.semester === semNow).length;
  const pang = getPanggilan().find(p => p.siswaKey === nis && p.status !== "Selesai");

  wrap.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><span class="stat-num">${pel.length}</span><span class="stat-label">Total pelanggaran tercatat</span></div>
      <div class="stat-card"><span class="stat-num">${jmlSemIni}</span><span class="stat-label">Pelanggaran semester ini (${esc(semNow)})</span></div>
      <div class="stat-card ${jmlSemIni >= BATAS_PANGGILAN ? "ok" : ""}"><span class="stat-num">${jmlSemIni}/${BATAS_PANGGILAN}</span><span class="stat-label">Batas pemanggilan BK</span></div>
    </div>
    ${pang ? `<div class="alert">${icon("phone")}<span><b>Status pemanggilan: ${esc(pang.status)}</b> — ${esc(pang.keterangan || "")}</span></div>` : ""}
    <h3 style="margin-top:6px">Daftar Pelanggaran</h3>
    <div class="table-wrap">
    ${pel.length ? `<table><thead><tr><th>Tanggal</th><th>Pelanggaran</th><th>Semester</th><th>Keterangan</th></tr></thead><tbody>
      ${pel.map(p => `<tr>
        <td>${fmtTanggal(p.tanggal)}</td>
        <td><b>${esc(p.jenisKode || "")}</b> ${esc(p.jenisNama || "-")}</td>
        <td>${esc(p.semester || "-")}</td>
        <td>${esc(p.keterangan || "-")}</td>
      </tr>`).join("")}
    </tbody></table>` : `<div class="empty">${icon("check")}<p>Belum ada catatan pelanggaran. Pertahankan! 🎉</p></div>`}
    </div>`;
}

/* ---------- 21. KELOLA AKUN (Tim Tatib / Wali Kelas / Guru BK / Orang Tua) ---------- */
let editAkunId = null;
let editAkunRole = null;

const AKUN_CONFIG = {
  tatib: {
    role: "tatib", label: "Tim Tatib",
    form: "formTatib", title: "formTatibTitle",
    btnSubmit: "btnSubmitTatib", btnCancel: "btnCancelTatib", wrap: "tatibWrap",
    titleTambah: "Tambah Anggota Tatib", titleEdit: "Edit Anggota Tatib",
    icon: "shield",
  },
  walikelas: {
    role: "walikelas", label: "Wali Kelas",
    form: "formWk", title: "formWkTitle",
    btnSubmit: "btnSubmitWk", btnCancel: "btnCancelWk", wrap: "wkWrap",
    titleTambah: "Tambah Wali Kelas", titleEdit: "Edit Wali Kelas",
    icon: "users",
  },
  bk: {
    role: "bk", label: "Guru BK",
    form: "formBk", title: "formBkTitle",
    btnSubmit: "btnSubmitBk", btnCancel: "btnCancelBk", wrap: "bkWrap",
    titleTambah: "Tambah Guru BK", titleEdit: "Edit Guru BK",
    icon: "phone",
  },
  ortu: {
    role: "ortu", label: "Orang Tua",
    form: "formOrtu", title: "formOrtuTitle",
    btnSubmit: "btnSubmitOrtu", btnCancel: "btnCancelOrtu", wrap: "ortuWrap",
    titleTambah: "Tambah Akun Orang Tua", titleEdit: "Edit Akun Orang Tua",
    icon: "heart",
  },
};

/* ID input tiap role (berbeda di HTML) */
const AKUN_FIELDS = {
  tatib:     { user: "tUser", pass: "tPass", nama: "tNama" },
  walikelas: { user: "wUser", pass: "wPass", nama: "wNama" },
  bk:        { user: "bUser", pass: "bPass", nama: "bNama" },
  ortu:      { user: "oUser", pass: "oPass", nama: "oNama", anakNis: "oAnakNis", noHp: "oNoHp" },
};

function loadAkun(role) {
  const cfg = AKUN_CONFIG[role];
  const wrap = $(cfg.wrap);
  if (!wrap) return;

  if (role === "walikelas") isiDropdownWk();

  const users = getUsers();
  const list = users.filter(u => u.role === role)
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));

  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon(cfg.icon)}<p>Belum ada akun ${cfg.label}. Tambahkan di form atas.</p></div>`;
    return;
  }

  wrap.innerHTML = `<table><thead><tr>
      <th>Username</th><th>Nama Lengkap</th>
      ${role === "ortu" ? "<th>NIS Anak</th><th>Nama Anak</th><th>No. HP/WA</th>" : ""}
      ${role === "walikelas" ? "<th>Siswa Bimbingan</th>" : ""}
      <th>Aksi</th>
    </tr></thead><tbody>
    ${list.map(u => {
      const anak = role === "ortu" ? users.find(s => s.role === "siswa" && s.nis === u.anakNis) : null;
      return `<tr>
        <td><b>${esc(u.username)}</b></td>
        <td>${esc(u.nama || "-")}</td>
        ${role === "ortu" ? `<td>${esc(u.anakNis || "-")}</td><td>${esc(anak?.nama || "-")}</td><td>${esc(u.noHp || "-")}</td>` : ""}
        ${role === "walikelas" ? `<td>${users.filter(s => s.role === "siswa" && s.walikelasId === u.id).length} siswa</td>` : ""}
        <td>
          <button class="btn btn-sm" data-eak="${u.id}" data-arole="${role}">${icon("edit")} Edit</button>
          <button class="btn btn-danger btn-sm" data-dak="${u.id}" data-arole="${role}">${icon("trash")} Hapus</button>
        </td>
      </tr>`;
    }).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-eak]").forEach(b =>
    b.addEventListener("click", () => startEditAkun(b.dataset.eak, b.dataset.arole)));
  wrap.querySelectorAll("[data-dak]").forEach(b =>
    b.addEventListener("click", () => deleteAkun(b.dataset.dak, b.dataset.arole)));
}

function submitAkun(e, role) {
  e.preventDefault();
  const cfg = AKUN_CONFIG[role];
  const fld = AKUN_FIELDS[role];

  const username = $(fld.user).value.trim();
  const password = $(fld.pass).value.trim();
  const nama = $(fld.nama).value.trim();

  if (!username || !nama) { toast("Username dan Nama Lengkap wajib diisi.", "err"); return; }
  if (!editAkunId && !password) { toast("Password wajib diisi untuk akun baru.", "err"); return; }

  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== editAkunId)) {
    toast(`Username "${username}" sudah dipakai akun lain.`, "err"); return;
  }

  if (role === "ortu") {
    const anakNis = $(fld.anakNis).value.trim();
    const noHp = $(fld.noHp).value.trim();
    if (!editAkunId && !anakNis) { toast("NIS Anak wajib diisi untuk akun orang tua baru.", "err"); return; }
    if (anakNis && !users.some(u => u.role === "siswa" && u.nis === anakNis)) {
      toast(`Peringatan: NIS "${anakNis}" belum ada di data siswa — notifikasi tidak akan sampai sebelum NIS cocok.`, "warn");
    }
    if (editAkunId) {
      const u = users.find(x => x.id === editAkunId && x.role === "ortu");
      if (!u) { toast("Data tidak ditemukan.", "err"); return; }
      Object.assign(u, { username, nama, anakNis, noHp });
      if (password) u.password = password;
      toast("Akun orang tua diperbarui.");
    } else {
      users.push({ id: genId(), username, password, nama, role: "ortu", anakNis, noHp });
      toast("Akun orang tua baru ditambahkan.");
    }
    saveUsers(users);
    resetAkunForm(role);
    loadAkun(role);
    return;
  }

  if (editAkunId) {
    const u = users.find(x => x.id === editAkunId && x.role === role);
    if (!u) { toast("Data tidak ditemukan.", "err"); return; }
    Object.assign(u, { username, nama });
    if (password) u.password = password;
    toast(`Akun ${cfg.label} diperbarui.`);
  } else {
    users.push({ id: genId(), username, password, nama, role });
    toast(`Akun ${cfg.label} baru ditambahkan.`);
  }
  saveUsers(users);
  resetAkunForm(role);
  loadAkun(role);
}

function startEditAkun(id, role) {
  const cfg = AKUN_CONFIG[role];
  const fld = AKUN_FIELDS[role];
  const u = getUsers().find(x => x.id === id && x.role === role);
  if (!u) return;
  editAkunId = id;
  editAkunRole = role;
  $(fld.user).value = u.username || "";
  $(fld.pass).value = "";
  $(fld.nama).value = u.nama || "";
  if (role === "ortu") {
    $(fld.anakNis).value = u.anakNis || "";
    $(fld.noHp).value = u.noHp || "";
  }
  $(cfg.btnSubmit).textContent = "Simpan Perubahan";
  $(cfg.title).textContent = cfg.titleEdit;
  show($(cfg.btnCancel));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetAkunForm(role) {
  const cfg = AKUN_CONFIG[role];
  editAkunId = null;
  editAkunRole = null;
  $(cfg.form).reset();
  $(cfg.btnSubmit).textContent = "Tambah";
  $(cfg.title).textContent = cfg.titleTambah;
  hide($(cfg.btnCancel));
}

async function deleteAkun(id, role) {
  const cfg = AKUN_CONFIG[role];
  const users = getUsers();
  const u = users.find(x => x.id === id && x.role === role);
  if (!u) return;

  const catatan = [];
  if (role === "walikelas") {
    const n = users.filter(s => s.role === "siswa" && s.walikelasId === id).length;
    if (n) catatan.push(`<b>${n}</b> siswa yang membimbing akan kehilangan penugasan wali kelas (data siswa tidak dihapus).`);
  }
  if (role === "ortu") {
    catatan.push(`Notifikasi untuk NIS <b>${esc(u.anakNis || "-")}</b> tidak akan sampai lewat akun ini lagi.`);
    catatan.push(`No. HP yang tersimpan di data siswa <b>tidak terhapus</b> (tetap dipakai tombol WA).`);
  }
  const ok = await uiConfirm({
    title: `Hapus akun "${esc(u.username)}"?`,
    html: catatan.length
      ? `<p>Yakin ingin menghapus akun ini?</p><ul class="modal-list">${catatan.map(c => `<li>${c}</li>`).join("")}</ul>`
      : `<p>Yakin ingin menghapus akun ini?</p>`,
    okText: "Hapus",
  });
  if (!ok) return;
  if (role === "walikelas") {
    users.forEach(s => { if (s.role === "siswa" && s.walikelasId === id) s.walikelasId = ""; });
  }
  saveUsers(users.filter(x => x.id !== id));
  if (editAkunId === id) resetAkunForm(role);
  toast(`Akun ${cfg.label} dihapus.`);
  loadAkun(role);
}

/* ---------- 22. KELOLA SISWA ---------- */
let editSiswaId = null;

function isiDropdownWk() {
  const el = $("sWk");
  if (!el) return;
  const list = getUsers().filter(u => u.role === "walikelas")
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || ""));
  el.innerHTML = `<option value="">— tanpa wali kelas —</option>` +
    list.map(w => `<option value="${esc(w.id)}">${esc(w.nama)} (${esc(w.username)})</option>`).join("");
}

function loadSiswa() {
  isiDropdownReferensi();
  isiDropdownWk();

  const wrap = $("siswaWrap");
  if (!wrap) return;
  const users = getUsers();
  const list = users.filter(u => u.role === "siswa")
    .sort((a, b) => (a.nama || "").localeCompare(b.nama || "", "id"));

  if (!list.length) {
    wrap.innerHTML = `<div class="empty">${icon("cap")}<p>Belum ada data siswa. Tambahkan di form atas atau import dari Excel.</p></div>`;
    return;
  }

  wrap.innerHTML = `<table><thead><tr>
      <th>NIS</th><th>Nama</th><th>Jurusan</th><th>Kelas</th><th>Wali Kelas</th><th>No. HP Ortu</th><th>Akun Ortu</th><th>Aksi</th>
    </tr></thead><tbody>
    ${list.map(s => {
      const wk = s.walikelasId ? users.find(u => u.id === s.walikelasId && u.role === "walikelas") : null;
      const ortu = s.nis ? users.find(u => u.role === "ortu" && u.anakNis === s.nis) : null;
      return `<tr>
        <td><b>${esc(s.nis || "-")}</b></td><td>${esc(s.nama || "-")}</td>
        <td>${esc(s.jurusan || "-")}</td><td>${esc(s.kelas || "-")}</td>
        <td>${esc(wk ? wk.nama : "-")}</td>
        <td>${esc(s.noHpOrtu || ortu?.noHp || "-")}</td>
        <td>${ortu ? esc(ortu.username) : '<span class="muted">belum ada</span>'}</td>
        <td>
          <button class="btn btn-sm" data-es="${s.id}">${icon("edit")} Edit</button>
          <button class="btn btn-danger btn-sm" data-ds="${s.id}">${icon("trash")} Hapus</button>
        </td>
      </tr>`;
    }).join("")}
    </tbody></table>`;

  wrap.querySelectorAll("[data-es]").forEach(b =>
    b.addEventListener("click", () => startEditSiswa(b.dataset.es)));
  wrap.querySelectorAll("[data-ds]").forEach(b =>
    b.addEventListener("click", () => deleteSiswa(b.dataset.ds)));
}

/* Buat/perbarui akun orang tua terhubung NIS (jika data ortu diisi di form) */
function sinkronAkunOrtuSiswa(nis, ortuNama, ortuHp, ortuUser, ortuPass, siswa) {
  if (!ortuNama && !ortuHp && !ortuUser) return; // tidak diisi → lewati

  const users = getUsers();
  const ortu = users.find(u => u.role === "ortu" && u.anakNis === nis);

  if (!ortu) {
    if (!ortuUser) {
      toast("Catatan: isi Username Akun Orang Tua bila ingin akun ortu dibuat otomatis (nomor HP tetap tersimpan di data siswa).", "warn");
      return;
    }
    if (users.some(u => u.username.toLowerCase() === ortuUser.toLowerCase())) {
      toast(`Username ortu "${ortuUser}" sudah dipakai akun lain — akun ortu tidak dibuat.`, "err");
      return;
    }
    users.push({
      id: genId(), username: ortuUser,
      password: ortuPass || "ortu123",
      nama: ortuNama || `Orang Tua ${siswa.nama}`,
      role: "ortu", anakNis: nis, noHp: ortuHp,
    });
    saveUsers(users);
    toast("Akun orang tua baru dibuat & terhubung ke NIS siswa.");
  } else {
    if (ortuNama) ortu.nama = ortuNama;
    if (ortuHp) ortu.noHp = ortuHp;
    if (ortuPass) ortu.password = ortuPass;
    saveUsers(users);
  }
}

function submitSiswa(e) {
  e.preventDefault();

  const username  = $("sUser").value.trim();
  const password  = $("sPass").value.trim();
  const nis       = $("sNis").value.trim();
  const nama      = $("sNama").value.trim();
  const jurusan   = $("sJurusan").value;
  const kelas     = $("sKelas").value;
  const alamat    = $("sAlamat").value.trim();
  const walikelasId = $("sWk").value;
  const ortuNama  = $("sOrtuNama").value.trim();
  const ortuHp    = $("sOrtuHp").value.trim();
  const ortuUser  = $("sOrtuUser").value.trim();
  const ortuPass  = $("sOrtuPass").value.trim();

  if (!username || !nis || !nama || !jurusan || !kelas) {
    toast("Username, NIS, nama, jurusan, dan kelas wajib diisi.", "err"); return;
  }
  if (!editSiswaId && !password) {
    toast("Password wajib diisi untuk siswa baru.", "err"); return;
  }

  const users = getUsers();
  if (users.some(u => u.username.toLowerCase() === username.toLowerCase() && u.id !== editSiswaId)) {
    toast(`Username "${username}" sudah dipakai akun lain.`, "err"); return;
  }
  if (users.some(u => u.role === "siswa" && u.nis === nis && u.id !== editSiswaId)) {
    toast(`NIS "${nis}" sudah dipakai siswa lain.`, "err"); return;
  }

  if (editSiswaId) {
    const s = users.find(u => u.id === editSiswaId && u.role === "siswa");
    if (!s) { toast("Data tidak ditemukan.", "err"); return; }
    Object.assign(s, { username, nis, nama, jurusan, kelas, alamat, walikelasId, noHpOrtu: ortuHp });
    if (password) s.password = password;
    saveUsers(users);
    sinkronAkunOrtuSiswa(nis, ortuNama, ortuHp, ortuUser, ortuPass, s);
    toast("Data siswa berhasil diperbarui.");
  } else {
    const s = { id: genId(), username, password, nama, role: "siswa",
                nis, jurusan, kelas, alamat, walikelasId, noHpOrtu: ortuHp };
    users.push(s);
    saveUsers(users);
    sinkronAkunOrtuSiswa(nis, ortuNama, ortuHp, ortuUser, ortuPass, s);
    toast("Siswa baru ditambahkan.");
  }

  resetSiswaForm();
  loadSiswa();
}

function startEditSiswa(id) {
  const s = getUsers().find(u => u.id === id && u.role === "siswa");
  if (!s) return;

  isiDropdownReferensi();
  isiDropdownWk();
  pastikanOpsi("sJurusan", s.jurusan);
  $("sJurusan").value = s.jurusan || "";
  isiDropdownKelasSiswa(s.kelas || "");
  pastikanOpsi("sKelas", s.kelas);
  $("sKelas").value = s.kelas || "";
  if (s.walikelasId) pastikanOpsi("sWk", s.walikelasId);
  $("sWk").value = s.walikelasId || "";

  const ortu = s.nis ? getUsers().find(u => u.role === "ortu" && u.anakNis === s.nis) : null;

  editSiswaId = id;
  $("sUser").value = s.username || "";
  $("sPass").value = "";
  $("sNis").value = s.nis || "";
  $("sNama").value = s.nama || "";
  $("sAlamat").value = s.alamat || "";
  $("sOrtuNama").value = ortu?.nama || "";
  $("sOrtuHp").value = s.noHpOrtu || ortu?.noHp || "";
  $("sOrtuUser").value = ortu?.username || "";
  $("sOrtuPass").value = "";

  $("btnSubmitSiswa").textContent = "Simpan Perubahan";
  $("formSiswaTitle").textContent = "Edit Data Siswa";
  show($("btnCancelSiswa"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetSiswaForm() {
  editSiswaId = null;
  $("formSiswa").reset();
  isiDropdownReferensi();
  isiDropdownWk();
  $("btnSubmitSiswa").textContent = "Tambah Siswa";
  $("formSiswaTitle").textContent = "Tambah Siswa Baru";
  hide($("btnCancelSiswa"));
}

async function deleteSiswa(id) {
  const users = getUsers();
  const s = users.find(u => u.id === id && u.role === "siswa");
  if (!s) return;
  const nJml = getPelanggaran().filter(p => p.siswaKey === s.nis).length;
  const ortuTerkait = s.nis ? users.filter(u => u.role === "ortu" && u.anakNis === s.nis) : [];
  const ok = await uiConfirm({
    title: `Hapus siswa "${esc(s.nama)}"?`,
    html: `<p>Akun login siswa akan dihapus.</p>
      <ul class="modal-list">
        <li>${nJml} catatan pelanggaran lama <b>tetap tersimpan</b> di Data Pelanggaran.</li>
        ${ortuTerkait.length ? `<li>${ortuTerkait.length} akun orang tua terhubung ikut dihapus.</li>` : ""}
        <li>Catatan pemanggilan BK untuk NIS ini tidak terhapus otomatis.</li>
      </ul>`,
    okText: "Hapus",
  });
  if (!ok) return;
  const sisa = users.filter(u =>
    u.id !== id && !(u.role === "ortu" && s.nis && u.anakNis === s.nis));
  saveUsers(sisa);
  if (editSiswaId === id) resetSiswaForm();
  toast("Data siswa dihapus.");
  loadSiswa();
}

/* ---------- 23. IMPORT SISWA DARI EXCEL ---------- */
const KOLOM_TEMPLATE = [
  "Username", "Password", "NIS", "Nama", "Jurusan", "Kelas", "Alamat",
  "Wali Kelas", "Nama Orang Tua", "No HP Orang Tua", "Username Orang Tua", "Password Orang Tua",
];

function unduhTemplateSiswa() {
  const contoh = [
    ["budi02", "siswa123", "SIS002", "Andi Pratama", "RPL", "X RPL A",
     "Jl. Merdeka No. 10, Trenggalek", "Bu Sari (Wali X RPL A)",
     "Bapak Hendra", "6281234567891", "ortu_andi", "ortu123"],
  ];

  if (typeof XLSX !== "undefined") {
    const ws = XLSX.utils.aoa_to_sheet([KOLOM_TEMPLATE, ...contoh]);
    ws["!cols"] = KOLOM_TEMPLATE.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Siswa");
    XLSX.writeFile(wb, "template-import-siswa.xlsx");
    toast("Template Excel (.xlsx) berhasil diunduh.");
    return;
  }

  // Fallback tanpa library: file CSV (tetap bisa dibuka & diedit di Excel)
  const csv = [KOLOM_TEMPLATE, ...contoh]
    .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "template-import-siswa.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  toast("Template CSV diunduh (bisa dibuka di Excel). Untuk .xlsx asli, tambahkan library SheetJS di index.html.", "warn");
}

function prosesImportSiswa(file) {
  if (!file) return;
  if (typeof XLSX === "undefined") {
    toast("Library SheetJS (xlsx) belum dimuat. Tambahkan di index.html sebelum </body>: script cdn.sheetjs.com xlsx.full.min.js.", "err");
    return;
  }

  const reader = new FileReader();
  reader.onerror = () => toast("Gagal membaca file.", "err");
  reader.onload = ev => {
    try {
      const wb = XLSX.read(new Uint8Array(ev.target.result), { type: "array" });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      if (!rows.length) { toast("File tidak berisi baris data.", "err"); return; }

      const users = getUsers();
      const daftarKelas = getKelas();
      const res = { tambah: 0, perbarui: 0, gagal: [], catatan: [] };

      /* Ambil kolom dengan pencocokan longgar (abaikan titik/spasi/huruf besar) */
      const ambil = (row, ...kandidat) => {
        const keys = Object.keys(row);
        const norm = x => x.toLowerCase().replace(/[.\s]+/g, " ").trim();
        for (const k of kandidat) {
          const ketemu = keys.find(x => norm(x) === norm(k));
          if (ketemu !== undefined) return String(row[ketemu]).trim();
        }
        return "";
      };

      rows.forEach((row, i) => {
        const brs = `Baris ${i + 2}`;
        const username  = ambil(row, "Username");
        const password  = ambil(row, "Password");
        const nis       = ambil(row, "NIS");
        const nama      = ambil(row, "Nama", "Nama Siswa");
        const kelasNm   = ambil(row, "Kelas");
        const alamat    = ambil(row, "Alamat");
        const waliNama  = ambil(row, "Wali Kelas");
        const ortuNama  = ambil(row, "Nama Orang Tua");
        const ortuHp    = ambil(row, "No HP Orang Tua", "No HP/WA Orang Tua", "HP Orang Tua", "No Orang Tua");
        const ortuUser  = ambil(row, "Username Orang Tua");
        const ortuPass  = ambil(row, "Password Orang Tua");

        if (!username || !nis || !nama || !kelasNm) {
          res.gagal.push(`${brs}: Username / NIS / Nama / Kelas kosong.`);
          return;
        }

        const existing = users.find(u => u.role === "siswa" &&
          (u.nis === nis || u.username.toLowerCase() === username.toLowerCase()));

        if (existing && existing.nis !== nis) {
          res.gagal.push(`${brs}: username "${username}" sudah dipakai siswa lain (NIS ${existing.nis}).`);
          return;
        }
        if (!existing && users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
          res.gagal.push(`${brs}: username "${username}" sudah dipakai akun lain.`);
          return;
        }

        /* Kelas WAJIB sama dengan menu Kelola Kelas; jurusan diambil otomatis dari kelas */
        const kelasObj = daftarKelas.find(k => (k.nama || "").toLowerCase() === kelasNm.toLowerCase());
        if (!kelasObj) {
          res.gagal.push(`${brs}: kelas "${kelasNm}" belum ada di menu Kelola Kelas.`);
          return;
        }
        const jurusanFinal = kelasObj.jurusan || "";

        let walikelasId = "";
        if (waliNama) {
          const wk = users.find(u => u.role === "walikelas" &&
            (u.nama || "").toLowerCase() === waliNama.toLowerCase());
          if (wk) walikelasId = wk.id;
          else res.catatan.push(`${brs}: wali kelas "${waliNama}" tidak ditemukan — dikosongkan.`);
        }

        if (existing) {
          Object.assign(existing, {
            username, nama, jurusan: jurusanFinal, kelas: kelasObj.nama,
            alamat, walikelasId, noHpOrtu: ortuHp,
          });
          if (password) existing.password = password;
          res.perbarui++;
        } else {
          users.push({
            id: genId(), username,
            password: password || "siswa123",
            nama, role: "siswa", nis,
            jurusan: jurusanFinal, kelas: kelasObj.nama,
            alamat, walikelasId, noHpOrtu: ortuHp,
          });
          res.tambah++;
        }

        /* Akun orang tua opsional (terhubung via NIS) */
        if (ortuUser || ortuNama || ortuHp) {
          const ortu = users.find(u => u.role === "ortu" && u.anakNis === nis);
          if (!ortu) {
            if (ortuUser) {
              if (users.some(u => u.username.toLowerCase() === ortuUser.toLowerCase())) {
                res.catatan.push(`${brs}: username ortu "${ortuUser}" bentrok — akun ortu tidak dibuat.`);
              } else {
                users.push({
                  id: genId(), username: ortuUser,
                  password: ortuPass || "ortu123",
                  nama: ortuNama || `Orang Tua ${nama}`,
                  role: "ortu", anakNis: nis, noHp: ortuHp,
                });
              }
            } else {
              res.catatan.push(`${brs}: akun ortu tidak dibuat (Username Orang Tua kosong) — nomor HP tetap tersimpan di data siswa.`);
            }
          } else {
            if (ortuNama) ortu.nama = ortuNama;
            if (ortuHp) ortu.noHp = ortuHp;
            if (ortuPass) ortu.password = ortuPass;
          }
        }
      });

      saveUsers(users);

      const box = $("hasilImportSiswa");
      if (box) {
        box.innerHTML = `
          <div class="notice">
            ${icon("info")}
            <span>
              Import selesai — <b>${res.tambah}</b> siswa baru, <b>${res.perbarui}</b> diperbarui,
              <b>${res.gagal.length}</b> baris gagal.
              ${res.gagal.length ? `<br>${res.gagal.map(g => `• ${esc(g)}`).join("<br>")}` : ""}
              ${res.catatan.length ? `<br><b>Catatan:</b><br>${res.catatan.map(c => `• ${esc(c)}`).join("<br>")}` : ""}
            </span>
          </div>`;
      }

      if (res.gagal.length) toast(`Import selesai dengan ${res.gagal.length} baris gagal. Periksa rinciannya di atas form.`, "warn");
      else toast(`Import sukses: ${res.tambah} siswa baru, ${res.perbarui} diperbarui.`);

      muatUlangHalamanAktif();
    } catch (err) {
      toast("Gagal memproses file: " + err.message, "err");
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ---------- 24. EKSPOR / IMPOR / RESET DATA (admin) ---------- */
function eksporData() {
  const data = {};
  ["users", "jenis", "jurusan", "kelas", "pelanggaran", "panggilan", "notifikasi"].forEach(k => {
    data[k] = dbRead(k);
  });
  data._meta = { app: "E-TATIB", versi: 15, diekspor: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `backup-etatib-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  toast("Backup data berhasil diunduh.");
}

function prosesImporData(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onerror = () => toast("Gagal membaca file backup.", "err");
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      let n = 0;
      ["users", "jenis", "jurusan", "kelas", "pelanggaran", "panggilan", "notifikasi"].forEach(k => {
        if (Array.isArray(data[k])) { dbWrite(k, data[k]); n++; }
      });
      if (!n) { toast("File backup tidak dikenali.", "err"); return; }
      toast("Data berhasil diimpor. Memuat ulang…");
      setTimeout(() => location.reload(), 900);
    } catch (e) {
      toast("File backup rusak / bukan JSON valid.", "err");
    }
  };
  reader.readAsText(file);
}

async function resetDataDemo() {
  const ok = await uiConfirm({
    title: "Reset semua data?",
    html: `<p>Seluruh data (akun, pelanggaran, pemanggilan, notifikasi) di browser ini akan <b>dihapus</b> dan diganti data demo awal.</p>`,
    okText: "Ya, Reset",
  });
  if (!ok) return;
  Object.keys(localStorage)
    .filter(k => k.startsWith(DB_PREFIX) || k === "simtatib_session")
    .forEach(k => localStorage.removeItem(k));
  seedIfEmpty();
  toast("Data direset ke kondisi awal. Memuat ulang…");
  setTimeout(() => location.reload(), 900);
}

/* ---------- 25. MODAL KONFIRMASI CUSTOM (uiConfirm) ---------- */
function uiConfirm({ title, html, okText = "OK", cancelText = "Batal", danger = true }) {
  return new Promise(resolve => {
    const lama = $("uiConfirmBox");
    if (lama) lama.remove();

    const box = document.createElement("div");
    box.id = "uiConfirmBox";
    box.innerHTML = `
      <div class="modal-backdrop"></div>
      <div class="modal">
        <div class="modal-icon ${danger ? "danger" : "primary"}">${icon(danger ? "alert" : "info")}</div>
        <h3>${title}</h3>
        <div class="modal-body">${html}</div>
        <div class="modal-actions">
          <button class="btn" data-act="cancel">${esc(cancelText)}</button>
          <button class="btn ${danger ? "btn-danger-solid" : "btn-primary"}" data-act="ok">${esc(okText)}</button>
        </div>
      </div>`;
    document.body.appendChild(box);

    const selesai = val => { box.remove(); resolve(val); };
    box.querySelector('[data-act="ok"]').addEventListener("click", () => selesai(true));
    box.querySelector('[data-act="cancel"]').addEventListener("click", () => selesai(false));
    box.querySelector(".modal-backdrop").addEventListener("click", () => selesai(false));
    document.addEventListener("keydown", function escKey(e) {
      if (e.key === "Escape") {
        document.removeEventListener("keydown", escKey);
        if (document.getElementById("uiConfirmBox")) selesai(false);
      }
    });
  });
}

/* ---------- 26. EVENT BINDING & INISIALISASI ---------- */
function bindEvents() {
  // Login / logout
  $("btnLogin").addEventListener("click", doLogin);
  $("loginUser").addEventListener("keydown", e => { if (e.key === "Enter") $("loginPass").focus(); });
  $("loginPass").addEventListener("keydown", e => { if (e.key === "Enter") doLogin(); });
  $("btnLihatPass").addEventListener("click", () => {
    const inp = $("loginPass");
    inp.type = inp.type === "password" ? "text" : "password";
  });
  $("btnLogout").addEventListener("click", doLogout);

  // Sidebar mobile
  $("btnMenu").addEventListener("click", toggleSidebarMobile);
  $("sbBackdrop").addEventListener("click", tutupSidebarMobile);

  // Master: bentuk pelanggaran
  $("formJenis").addEventListener("submit", submitJenis);
  $("btnCancelJenis").addEventListener("click", resetJenisForm);

  // Master: jurusan
  $("formJurusan").addEventListener("submit", submitJurusan);
  $("btnCancelJurusan").addEventListener("click", resetJurusanForm);

  // Master: kelas
  $("formKelas").addEventListener("submit", submitKelas);
  $("btnCancelKelas").addEventListener("click", resetKelasForm);
  $("kTingkat").addEventListener("change", updateKelasPreview);
  $("kJurusan").addEventListener("change", updateKelasPreview);
  $("kRombel").addEventListener("change", updateKelasPreview);

  // Kelola siswa & import Excel
  $("formSiswa").addEventListener("submit", submitSiswa);
  $("btnCancelSiswa").addEventListener("click", resetSiswaForm);
  $("sJurusan").addEventListener("change", () => isiDropdownKelasSiswa());
  $("btnTemplateSiswa").addEventListener("click", unduhTemplateSiswa);
  $("btnImportSiswa").addEventListener("click", () => $("fileImportSiswa").click());
  $("fileImportSiswa").addEventListener("change", e => {
    prosesImportSiswa(e.target.files[0]);
    e.target.value = "";
  });

  // Akun: tatib / wali kelas / bk / ortu
  $("formTatib").addEventListener("submit", e => submitAkun(e, "tatib"));
  $("btnCancelTatib").addEventListener("click", () => resetAkunForm("tatib"));
  $("formWk").addEventListener("submit", e => submitAkun(e, "walikelas"));
  $("btnCancelWk").addEventListener("click", () => resetAkunForm("walikelas"));
  $("formBk").addEventListener("submit", e => submitAkun(e, "bk"));
  $("btnCancelBk").addEventListener("click", () => resetAkunForm("bk"));
  $("formOrtu").addEventListener("submit", e => submitAkun(e, "ortu"));
  $("btnCancelOrtu").addEventListener("click", () => resetAkunForm("ortu"));

  // Input pelanggaran
  $("formPelanggaran").addEventListener("submit", submitPelanggaran);
  $("mSiswa").addEventListener("change", isiDataSiswaPelanggaran);
  $("inTanggal").addEventListener("change", sinkronSemesterDariTanggal);
  $("inSemester").addEventListener("change", updateSemInfo);
  $("inTahun").addEventListener("change", updateSemInfo);

  // Pencarian data pelanggaran
  $("cariPelanggaran").addEventListener("input", loadPelanggaran);

  // Alat admin (ekspor / impor / reset)
  $("btnExport").addEventListener("click", eksporData);
  $("btnImport").addEventListener("click", () => $("fileImport").click());
  $("fileImport").addEventListener("change", e => {
    prosesImporData(e.target.files[0]);
    e.target.value = "";
  });
  $("btnResetData").addEventListener("click", resetDataDemo);
}

document.addEventListener("DOMContentLoaded", () => {
  seedIfEmpty();
  setupLogo();
  bindEvents();
  restoreSession();
});