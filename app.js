/* =============================================
   app.js – EduToken Course Website Logic
   ============================================= */

// =================== CONSTANTS ===================
const DB_KEY = 'edutoken_db';
const SESSION_KEY = 'edutoken_session';
const ADMIN_CREDS = { username: 'admin', password: 'admin8888' };

// =================== THEME SYSTEM ===================
const THEMES = ['dark', 'light', 'ocean', 'sunset'];
let currentThemeIndex = 0;

function initTheme() {
  const savedTheme = localStorage.getItem('edutoken_theme') || 'dark';
  currentThemeIndex = THEMES.indexOf(savedTheme);
  if (currentThemeIndex === -1) currentThemeIndex = 0;
  applyTheme(THEMES[currentThemeIndex]);
}

function cycleTheme() {
  currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
  const newTheme = THEMES[currentThemeIndex];
  applyTheme(newTheme);
  localStorage.setItem('edutoken_theme', newTheme);
  if(typeof showToast === 'function') {
    showToast(`เปลี่ยนเป็นธีม ${getThemeName(newTheme)}`, 'success');
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function getThemeName(theme) {
  const names = { dark: 'ดาร์กโหมด', light: 'โหมดสว่าง', ocean: 'มหาสมุทร', sunset: 'แสงเย็น' };
  return names[theme] || theme;
}

// เริ่มต้นธีมทันทีที่โหลดสคริปต์
initTheme();

// =================== FIREBASE CONFIG ===================
const USE_FIREBASE = true; // เปลี่ยนเป็น false เพื่อกลับไปใช้โหมดออฟไลน์
const firebaseConfig = {
  apiKey: "AIzaSyB79xjXQbTeY0_AMCBm7ggYh8n0tDOlUQI",
  authDomain: "matching123-e838e.firebaseapp.com",
  databaseURL: "https://matching123-e838e-default-rtdb.firebaseio.com",
  projectId: "matching123-e838e",
  storageBucket: "matching123-e838e.firebasestorage.app",
  messagingSenderId: "701350491646",
  appId: "1:701350491646:web:b34587f7eeb7bfdacebcaf",
  measurementId: "G-X0FM71WWMW"
};
const isFirebaseConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";
try {
  if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) firebase.initializeApp(firebaseConfig);
} catch (e) { console.error("Firebase init err", e); }

// =================== DATA STORE ===================
let LOCAL_DB = { students: [] };
try { LOCAL_DB = JSON.parse(localStorage.getItem(DB_KEY)) || { students: [] }; } catch (e) { }
let currentDB = LOCAL_DB;

function loadDB() { return JSON.parse(JSON.stringify(currentDB)); }

function saveDB(db, targetId = null) {
  currentDB = JSON.parse(JSON.stringify(db));
  localStorage.setItem(DB_KEY, JSON.stringify(currentDB));

  if (!USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) return;

  if (targetId && targetId !== '__admin__') {
    const s = db.students.find(x => x.id === targetId);
    if (s) firebase.database().ref('students/' + targetId).set(s);
  } else {
    const updates = {};
    db.students.forEach(s => updates[s.id] = s);
    firebase.database().ref('students').set(updates);
  }
}

function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)) || null; }
  catch { return null; }
}

function saveSession(s) { localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }

// ── Sync with Firebase ──
function initFirebaseSync(callback) {
  if (!USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) {
    seedDemoData();
    if (callback) callback();
    return;
  }
  const ref = firebase.database().ref('students');
  let firstLoad = true;
  ref.on('value', snapshot => {
    const val = snapshot.val();
    if (!val) {
      if (LOCAL_DB.students && LOCAL_DB.students.length > 0) {
        // Firebase ว่างเปล่า แต่ออฟไลน์มีข้อมูล -> ดันข้อมูลขึ้น Firebase ทันที
        const updates = {};
        LOCAL_DB.students.forEach(s => updates[s.id] = s);
        ref.set(updates);
      } else {
        seedDemoData(); // seeds and saves to Firebase
      }
    } else {
      currentDB = { students: Object.values(val) };
      localStorage.setItem(DB_KEY, JSON.stringify(currentDB));
      refreshAllUI();
    }
    if (firstLoad) { firstLoad = false; if (callback) callback(); }
  });
}

function refreshAllUI() {
  const me = getCurrentStudent();
  if (me && !me.isAdmin) updateNavUser(me);
  if (document.getElementById('section-dashboard').classList.contains('active')) renderDashboard();
  if (document.getElementById('section-leaderboard').classList.contains('active')) renderFullLeaderboard();
  if (document.getElementById('section-profile').classList.contains('active')) renderProfile();
  if (document.getElementById('section-adminbackend').classList.contains('active')) renderAdminPage();
}

// ── Seed demo data
function seedDemoData() {
  const db = loadDB();
  if (db.students.length > 0) return;
  const names = [
    { fn: 'สมชาย', ln: 'ใจดี', nick: 'เอ็ม', phone: '0812345601', room: 'ปวช.2/8', tokens: 520 },
    { fn: 'นภา', ln: 'สุขใส', nick: 'นุ้ย', phone: '0812345602', room: 'ปวช.2/9', tokens: 450 },
    { fn: 'อาทิตย์', ln: 'แสงทอง', nick: 'เอ', phone: '0812345603', room: 'ปวช.2/10', tokens: 310 },
    { fn: 'ปวีณา', ln: 'มีชัย', nick: 'แป้น', phone: '0812345604', room: 'ปวช.2/8', tokens: 280 },
    { fn: 'กิตติ', ln: 'พรชัย', nick: 'เก่ง', phone: '0812345605', room: 'ปวช.2/9', tokens: 210 },
    { fn: 'วิภา', ln: 'ทองดี', nick: 'วิ', phone: '0812345606', room: 'ปวช.2/10', tokens: 180 },
    { fn: 'ณัฐพล', ln: 'เจริญ', nick: 'นัท', phone: '0812345607', room: 'ปวช.2/8', tokens: 145 },
    { fn: 'มินตรา', ln: 'สาระ', nick: 'มิน', phone: '0812345608', room: 'ปวช.2/9', tokens: 120 },
    { fn: 'ชาญชัย', ln: 'กล้าหาญ', nick: 'ชาญ', phone: '0812345609', room: 'ปวช.2/10', tokens: 80 },
    { fn: 'ศิริรัตน์', ln: 'สวัสดี', nick: 'แนน', phone: '0812345610', room: 'ปวช.2/8', tokens: 45 },
    { fn: 'ธนากร', ln: 'พิมพ์ดี', nick: 'โฟม', phone: '0812345611', room: 'ปวช.2/9', tokens: 30 },
    { fn: 'อรทัย', ln: 'มงคล', nick: 'อ้อม', phone: '0812345612', room: 'ปวช.2/10', tokens: 10 },
    { fn: 'ภัทรพล', ln: 'ดีงาม', nick: 'ปอ', phone: '0812345613', room: 'ปวช.2/8', tokens: 5 },
    { fn: 'ลดาวัลย์', ln: 'ดอกไม้', nick: 'ลดา', phone: '0812345614', room: 'ปวช.2/9', tokens: 0 },
  ];
  names.forEach((s, i) => {
    // Avoid re-seeding if we already have users
  });
  // No longer seed demo users immediately if Firebase is empty, wait for real users
}

// =================== HELPERS ===================
function getGrade(tokens) {
  if (tokens >= 500) return { label: '💎 Diamond', cls: 'diamond', color: '#B9F2FF' };
  if (tokens >= 300) return { label: '🥇 Platinum', cls: 'platinum', color: '#E5E4E2' };
  if (tokens >= 150) return { label: '🟡 Gold', cls: 'gold', color: '#FFD700' };
  if (tokens >= 50) return { label: '⚪ Silver', cls: 'silver', color: '#C0C0C0' };
  if (tokens >= 1) return { label: '🟤 Bronze', cls: 'bronze', color: '#CD7F32' };
  return { label: '⚫ Unranked', cls: 'none', color: '#757575' };
}
function getAvatarChar(n) { return n ? n[0].toUpperCase() : '?'; }
function getAvatarBg(i) {
  const bgs = [
    'linear-gradient(135deg,#6C63FF,#3EC6E0)',
    'linear-gradient(135deg,#FF6B9D,#C44DFF)',
    'linear-gradient(135deg,#FF8E53,#FE3752)',
    'linear-gradient(135deg,#00C9FF,#92FE9D)',
    'linear-gradient(135deg,#f7971e,#FFD200)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
  ];
  return bgs[i % bgs.length];
}
function sortedStudents(filterRoom) {
  const db = loadDB();
  let list = db.students.slice();
  if (filterRoom) list = list.filter(s => s.room === filterRoom);
  list.sort((a, b) => b.tokens - a.tokens);
  return list;
}
function getMyRank(myId, filterRoom) {
  const sorted = sortedStudents(filterRoom || '');
  const idx = sorted.findIndex(s => s.id === myId);
  return idx === -1 ? null : idx + 1;
}

// =================== PARTICLES ===================
function initParticles() {
  const container = document.getElementById('particles-container');
  if (!container) return;
  const colors = ['#6C63FF', '#3EC6E0', '#FF6B9D', '#FFD740', '#00E676'];
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 6 + 3;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;`
      + `background:${colors[Math.floor(Math.random() * colors.length)]};`
      + `animation-duration:${Math.random() * 15 + 10}s;animation-delay:${Math.random() * 15}s;`;
    container.appendChild(p);
  }
}

// =================== UI SOUND MANAGER ===================
const UISound = {
  ctx: null,
  enabled: true,
  init() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
  },
  play(type) {
    if (!this.enabled || !window.AudioContext) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    const now = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
    osc.connect(gain); gain.connect(this.ctx.destination);
    
    if (type === 'click' || !type) {
      osc.type = 'sine'; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.05, now + 0.01); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'action') {
      osc.type = 'triangle'; osc.frequency.setValueAtTime(400, now); osc.frequency.setValueAtTime(600, now + 0.05);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.08, now + 0.02); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'error') {
      osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(120, now + 0.15);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.08, now + 0.02); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'success') {
      osc.type = 'sine'; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(0.1, now + 0.05); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
    }
  }
};

document.addEventListener('click', (e) => {
  const btn = e.target.closest('button, .nav-link, .tab-btn, .dashboard-card, .reward-card, .menu-item, .crb-name');
  if (!btn) return;
  // Exclude buttons that have specific sound rules in card game
  if(btn.closest('#cardgame-root') && !btn.id?.includes('cm-sound-btn') && !btn.textContent.includes('เริ่มใหม่')) return;
  
  if (btn.classList.contains('btn-primary') || btn.classList.contains('redeem-btn-confirm') || btn.classList.contains('admin-add-item-btn') || btn.classList.contains('btn-google')) {
    UISound.play('action');
  } else {
    UISound.play('click');
  }
});

// =================== UI HELPERS ===================
function showToast(msg, icon = '✅', duration = 2800) {
  if (icon === '❌' || icon === '⚠️' || icon === '🚫') {
    UISound.play('error');
  } else if (icon === '✅' || icon === '🎉' || icon === '🎊' || icon === '🎁' || icon === '🥇') {
    UISound.play('success');
  } else {
    UISound.play('click');
  }
  const t = document.getElementById('toast');
  document.getElementById('toast-msg').textContent = msg;
  document.getElementById('toast-icon').textContent = icon;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}
function showLoading(state) {
  document.getElementById('loading-overlay').classList.toggle('hidden', !state);
}

// ── Tab switcher
function switchTab(tab) {
  const lf = document.getElementById('form-login');
  const rf = document.getElementById('form-register');
  const tl = document.getElementById('tab-login');
  const tr = document.getElementById('tab-register');
  const ind = document.getElementById('tab-indicator');
  document.getElementById('login-error').textContent = '';
  document.getElementById('register-error').textContent = '';
  if (tab === 'login') {
    lf.classList.add('active'); rf.classList.remove('active');
    tl.classList.add('active'); tr.classList.remove('active');
    ind.style.transform = 'translateX(0)';
  } else {
    lf.classList.remove('active'); rf.classList.add('active');
    tl.classList.remove('active'); tr.classList.add('active');
    ind.style.transform = 'translateX(100%)';
  }
}

// ── Section navigation
function showSection(name) {
  document.querySelectorAll('.section').forEach(s => { s.classList.remove('active'); s.classList.add('hidden'); });
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
  const sec = document.getElementById('section-' + name);
  if (sec) { sec.classList.add('active'); sec.classList.remove('hidden'); }
  document.querySelectorAll('.nav-link').forEach(l => {
    if (l.getAttribute('onclick') && l.getAttribute('onclick').includes("'" + name + "'"))
      l.classList.add('active');
  });
  if (name === 'leaderboard') renderFullLeaderboard();
  if (name === 'profile') renderProfile();
  if (name === 'dashboard') renderDashboard();
  if (name === 'adminbackend') {
    renderAdminPage();
    if (typeof renderAdminAssignmentTable === 'function') renderAdminAssignmentTable();
  }
  if (name === 'shop') renderShop();
  if (name === 'quiz') { renderQuizHome(); }
  if (name === 'assignment') { if (typeof renderStudentAssignment === 'function') renderStudentAssignment(); }
  if (name === 'chat') initChat();
  else destroyChatListeners();
  const hp = document.getElementById('shop-history-panel');
  if (hp && name !== 'shop') hp.classList.add('hidden');
}

function toggleUserMenu() {
  document.getElementById('user-menu').classList.toggle('hidden');
}
document.addEventListener('click', e => {
  const menu = document.getElementById('user-menu');
  const av = document.getElementById('nav-avatar');
  if (menu && !menu.contains(e.target) && e.target !== av) menu.classList.add('hidden');
});
function toggleMobileMenu() {
  document.getElementById('mobile-menu').classList.toggle('hidden');
}

// =================== ADMIN MODAL ===================
function showAdminLoginModal() {
  document.getElementById('admin-modal-overlay').classList.remove('hidden');
  document.getElementById('admin-username').value = '';
  document.getElementById('admin-password').value = '';
  document.getElementById('admin-modal-error').textContent = '';
  setTimeout(() => document.getElementById('admin-username').focus(), 100);
}
function closeAdminModal(e) {
  if (!e || e.target === document.getElementById('admin-modal-overlay')) {
    document.getElementById('admin-modal-overlay').classList.add('hidden');
  }
}
function adminLogin() {
  const user = document.getElementById('admin-username').value.trim();
  const pass = document.getElementById('admin-password').value.trim();
  const errEl = document.getElementById('admin-modal-error');
  if (!user || !pass) {
    errEl.textContent = '⚠️ กรุณากรอก Username และ Password';
    return;
  }
  if (user.toLowerCase() !== ADMIN_CREDS.username.toLowerCase() || pass !== ADMIN_CREDS.password) {
    errEl.textContent = '❌ Username หรือ Password ไม่ถูกต้อง';
    if(typeof showToast === 'function') showToast('❌ Username หรือ Password ไม่ถูกต้อง', '❌', 3000);
    document.getElementById('admin-password').value = '';
    return;
  }
  showLoading(true);
  setTimeout(() => {
    const adminSession = {
      id: '__admin__',
      firstName: 'ผู้ดูแล', lastName: 'ระบบ',
      nickname: 'Admin', phone: '-', room: '-',
      tokens: 0, isAdmin: true, registeredAt: Date.now()
    };
    saveSession(adminSession);
    showLoading(false);
    document.getElementById('admin-modal-overlay').classList.add('hidden');
    showToast('ยินดีต้อนรับ Admin! 🔐', '🔐');
    enterDashboard(adminSession);
  }, 500);
}

// =================== AUTH (Student) ===================
function handleRegister() {
  const firstName = document.getElementById('reg-firstname').value.trim();
  const lastName = document.getElementById('reg-lastname').value.trim();
  const nickname = document.getElementById('reg-nickname').value.trim();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const room = document.getElementById('reg-room').value;
  const errEl = document.getElementById('register-error');
  if (!firstName) { errEl.textContent = '⚠️ กรุณากรอกชื่อจริง'; return; }
  if (!lastName) { errEl.textContent = '⚠️ กรุณากรอกนามสกุล'; return; }
  if (!nickname) { errEl.textContent = '⚠️ กรุณากรอกชื่อเล่น'; return; }
  if (!username) { errEl.textContent = '⚠️ กรุณากรอก Username'; return; }
  if (!password || password.length < 8) { errEl.textContent = '⚠️ Password ต้องอย่างน้อย 8 ตัวอักษร'; return; }
  if (!email || !email.includes('@')) { errEl.textContent = '⚠️ รูปแบบอีเมลไม่ถูกต้อง'; return; }
  if (!phone || phone.length < 9) { errEl.textContent = '⚠️ เบอร์โทรไม่ถูกต้อง'; return; }
  if (!room) { errEl.textContent = '⚠️ กรุณาเลือกห้องเรียน'; return; }
  const db = loadDB();
  if (db.students.find(s => s.username === username || (s.username === undefined && s.nickname === username) || s.phone === phone || s.email === email)) {
    errEl.textContent = '⚠️ Username, เบอร์โทร หรืออีเมลนี้มีผู้ใช้แล้ว'; return;
  }
  showLoading(true);
  setTimeout(() => {
    const student = {
      id: 'std_' + Date.now(), firstName, lastName, nickname, username, password, email, phone, room,
      tokens: 0, isAdmin: false, registeredAt: Date.now()
    };
    db.students.push(student);
    saveDB(db, student.id); // Pass student.id for Firebase sync
    showLoading(false);
    showToast('สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ 🎉', '🎉');
    enterDashboard(student);
  }, 600);
}

function handleLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errEl = document.getElementById('login-error');
  if (!username) { errEl.textContent = '⚠️ กรุณาใส่ Username'; return; }
  if (!password) { errEl.textContent = '⚠️ กรุณาใส่ Password'; return; }

  // Check if admin is logging in via the normal student form
  if (username.toLowerCase() === ADMIN_CREDS.username.toLowerCase() && password === ADMIN_CREDS.password) {
    showLoading(true);
    setTimeout(() => {
      const adminSession = {
        id: '__admin__',
        firstName: 'ผู้ดูแล', lastName: 'ระบบ',
        nickname: 'Admin', phone: '-', room: '-',
        tokens: 0, isAdmin: true, registeredAt: Date.now()
      };
      saveSession(adminSession);
      showLoading(false);
      showToast('ยินดีต้อนรับ Admin! 🔐', '🔐');
      enterDashboard(adminSession);
    }, 500);
    return;
  }

  // Normal Student Login
  const db = loadDB();
  const student = db.students.find(s => {
    const sUser = s.username || s.nickname;
    const sPass = s.password || s.phone;
    return sUser === username && sPass === password;
  });
  if (!student) { errEl.textContent = '❌ Username หรือ Password ไม่ถูกต้อง'; if(typeof showToast === 'function') showToast('❌ Username หรือ Password ไม่ถูกต้อง', '❌', 3000); return; }
  showLoading(true);
  setTimeout(() => {
    saveSession(student);
    showLoading(false);
    showToast(`ยินดีต้อนรับกลับ ${student.nickname}! 👋`, '👋');
    enterDashboard(student);
  }, 500);
}

function signInWithGoogle() {
  if (typeof firebase === 'undefined' || !firebase.auth) {
    showToast('ไม่พบระบบ Firebase Authentication (กรุณารีเฟรช)', '⚠️', 4000);
    return;
  }

  if (window.location.protocol === 'file:') {
    showToast('Google Sign-In จะถูกบล็อกเมื่อเปิดผ่านฟล์ (file://) ในเครื่อง ต้องนำเว็บไปฝากบนเซิร์ฟเวอร์โดเมนจริงแบบออนไลน์ก่อนครับ (เช่น Firebase Hosting) 🚨', '🚫', 8000);
    // return; (หากอยากให้มันฝืนเด้ง popup ก็เอา return ออกเพื่อให้ผู้ใช้เห็น error ไปเลย)
  }

  showLoading(true);
  const provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider)
    .then((result) => {
      const user = result.user;
      const db = loadDB();
      // เช็คว่ามีอีเมลนี้หรือ uid นี้ในระบบหรือยัง
      let student = db.students.find(s => s.email === user.email || s.id === user.uid);

      if (!student) {
        // สร้างบัญชีใหม่ให้ถอดชื่อ-สกุลจาก Google
        const names = (user.displayName || 'Google User').split(' ');
        student = {
          id: user.uid,
          firstName: names[0],
          lastName: names.slice(1).join(' ') || '',
          nickname: names[0], // นิชเนมใช้เป็นชื่อบนไปก่อน
          phone: '-', // Google อาจจะไม่มีเบอร์
          room: 'สมัครผ่าน Google', // ยังไม่ได้เลือกห้อง
          email: user.email,
          tokens: 0,
          isAdmin: false,
          registeredAt: Date.now()
        };
        db.students.push(student);
        saveDB(db, student.id);
      }

      saveSession(student);
      showLoading(false);
      showToast(`เข้าสู่ระบบ Google สำเร็จ! ยินดีต้อนรับคุณ ${student.firstName}`, '🟢', 4000);
      enterDashboard(student);
    })
    .catch((error) => {
      showLoading(false);
      console.error(error);
      // โชว์แจ้งเตือนให้ผู้ใช้ทราบว่าถูกบล็อคจาก Google
      if (error.code && (error.code.includes('auth/unauthorized-domain') || error.code.includes('fail'))) {
        showToast('Google บล็อกการลงชื่อเข้าใช้! ต้องอัปโหลดเว็บขึ้นเซิร์ฟเวอร์ออนไลน์จริงก่อนจึงจะใช้ได้ครับ (Domain Unathorized) ❌', '❌', 6000);
      } else {
        showToast('Login Failed: ' + error.message, '⚠️', 5000);
      }
    });
}

function handleLogout() {
  localStorage.removeItem(SESSION_KEY);
  document.getElementById('dashboard-wrapper').classList.add('hidden');
  document.getElementById('auth-wrapper').classList.remove('hidden');
  // Hide admin nav
  document.getElementById('nav-admin-link').classList.add('hidden');
  document.getElementById('mobile-admin-link').classList.add('hidden');
  switchTab('login');
  document.getElementById('login-nickname').value = '';
  document.getElementById('login-phone').value = '';
  showToast('ออกจากระบบเรียบร้อย', '👋');
}

// =================== DASHBOARD ===================
function enterDashboard(student) {
  document.getElementById('auth-wrapper').classList.add('hidden');
  document.getElementById('dashboard-wrapper').classList.remove('hidden');
  updateNavUser(student);
  // Show admin nav link if admin
  if (student.isAdmin) {
    document.getElementById('nav-admin-link').classList.remove('hidden');
    document.getElementById('mobile-admin-link').classList.remove('hidden');
  }
  renderDashboard();
  showSection(student.isAdmin ? 'adminbackend' : 'dashboard');
}

function updateNavUser(student) {
  if (!student) return;
  const db = loadDB();
  const fresh = student.isAdmin ? student : (db.students.find(s => s.id === student.id) || student);
  // Avatar in navbar
  const navAvatar = document.getElementById('nav-avatar');
  const navAvatarText = document.getElementById('nav-avatar-text');
  const avatarUrl = getStudentAvatarUrl(student.id);
  if (avatarUrl && !student.isAdmin) {
    navAvatarText.textContent = '';
    navAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    navAvatar.style.backgroundSize = 'cover';
    navAvatar.style.backgroundPosition = 'center';
  } else {
    navAvatarText.textContent = getAvatarChar(student.nickname);
    navAvatar.style.backgroundImage = '';
    navAvatar.style.backgroundSize = '';
    navAvatar.style.backgroundPosition = '';
  }
  document.getElementById('nav-token-count').textContent = fresh.tokens.toLocaleString();
  document.getElementById('menu-name').textContent = `${student.nickname}`;
  document.getElementById('menu-room').textContent = student.isAdmin ? '⚙️ ผู้ดูแลระบบ' : student.room;
}

function getCurrentStudent() {
  const session = loadSession();
  if (!session) return null;
  if (session.id === '__admin__') return session;
  const db = loadDB();
  return db.students.find(s => s.id === session.id) || null;
}

function renderDashboard() {
  const me = getCurrentStudent();
  if (!me) return;
  // If admin is on dashboard, show minimal info
  const isAdmin = me.isAdmin;

  const hour = new Date().getHours();
  let greet = '🌙 ราตรีสวัสดิ์';
  if (hour >= 6 && hour < 12) greet = '🌅 อรุณสวัสดิ์';
  else if (hour >= 12 && hour < 18) greet = '☀️ สวัสดีตอนบ่าย';
  else if (hour >= 18 && hour < 21) greet = '🌆 สวัสดีตอนเย็น';

  document.getElementById('welcome-greeting').textContent = greet;
  document.getElementById('welcome-name').textContent = isAdmin ? 'Admin ⚙️' : me.nickname + ' ' + me.firstName;
  document.getElementById('welcome-room-text').textContent = isAdmin ? '🔐 ผู้ดูแลระบบ' : '📚 ' + me.room;
  animateCounter('my-token-value', isAdmin ? 0 : me.tokens);

  const all = sortedStudents('');
  const myRank = isAdmin ? '-' : (getMyRank(me.id, '') || '-');
  document.getElementById('my-rank-display').textContent = isAdmin ? '👑' : `#${myRank}`;
  document.getElementById('max-token-display').textContent = all[0] ? all[0].tokens.toLocaleString() : '0';
  document.getElementById('total-students-display').textContent = all.length;
  document.getElementById('my-grade-display').textContent = isAdmin ? '⚙️ Admin' : getGrade(me.tokens).label;
  document.getElementById('nav-token-count').textContent = isAdmin ? '∞' : me.tokens.toLocaleString();

  renderPodium();
  renderLeaderboard();
}

function animateCounter(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const step = Math.max(1, Math.floor(target / 40));
  let curr = 0;
  const timer = setInterval(() => {
    curr = Math.min(curr + step, target);
    el.textContent = curr.toLocaleString();
    if (curr >= target) clearInterval(timer);
  }, 25);
}

function renderPodium() {
  const container = document.getElementById('podium-container');
  if (!container) return;
  const top3 = sortedStudents('').slice(0, 3);
  while (top3.length < 3) top3.push(null);
  const positions = [
    { rank: 1, crown: '👑', order: 2 },
    { rank: 2, crown: '🥈', order: 1 },
    { rank: 3, crown: '🥉', order: 3 },
  ];
  container.innerHTML = '';
  positions.forEach(pos => {
    const s = top3[pos.rank - 1];
    const card = document.createElement('div');
    card.className = `podium-card rank-${pos.rank}`;
    card.style.order = pos.order;
    if (!s) {
      card.innerHTML = `<div class="podium-crown">${pos.crown}</div><div class="podium-name" style="color:var(--text-muted)">ว่าง</div>`;
    } else {
      const grade = getGrade(s.tokens);
      const avUrl = getStudentAvatarUrl(s.id);
      const avHtml = avUrl
        ? `<div class="podium-avatar" style="background:${getAvatarBg(pos.rank)};padding:0;overflow:hidden"><img src="${avUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"/></div>`
        : `<div class="podium-avatar" style="background:${getAvatarBg(pos.rank)}">${getAvatarChar(s.nickname)}</div>`;
      card.innerHTML = `
        <div class="podium-crown">${pos.crown}</div>
        ${avHtml}
        <div class="podium-name">${s.nickname}</div>
        <div class="podium-room">${s.room}</div>
        <div class="podium-tokens" style="color:${grade.color}">🪙 ${s.tokens.toLocaleString()}</div>
        <div class="podium-token-label">Token</div>
        <span class="podium-rank-badge">${grade.label}</span>`;
    }
    container.appendChild(card);
  });
}

function renderLeaderboard() {
  const me = getCurrentStudent();
  const container = document.getElementById('main-leaderboard');
  if (!container) return;
  const filterRoom = document.getElementById('room-filter')?.value || '';
  const all = sortedStudents(filterRoom);
  if (all.length === 0) {
    container.innerHTML = '<div class="empty-state"><span>📭</span>ยังไม่มีข้อมูลในห้องนี้</div>';
    return;
  }
  container.innerHTML = '';
  all.forEach((s, idx) => {
    const grade = getGrade(s.tokens);
    const isMe = me && !me.isAdmin && s.id === me.id;
    const avUrl = getStudentAvatarUrl(s.id);
    const avHtml = avUrl
      ? `<div class="lb-avatar" style="background:${getAvatarBg(idx)};padding:0;overflow:hidden"><img src="${avUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"/></div>`
      : `<div class="lb-avatar" style="background:${getAvatarBg(idx)}">${getAvatarChar(s.nickname)}</div>`;
    const row = document.createElement('div');
    row.className = `lb-row grade-${grade.cls}${isMe ? ' is-me' : ''}`;
    row.innerHTML = `
      <div class="lb-rank-num">${getRankEmoji(idx + 1)}</div>
      ${avHtml}
      <div class="lb-info">
        <div class="lb-name">${s.nickname} ${s.firstName}${isMe ? ' <span style="font-size:0.72rem;color:var(--primary-light)">(ฉัน)</span>' : ''}</div>
        <div class="lb-meta">${s.room}</div>
      </div>
      <div class="lb-tokens" style="color:${grade.color}">🪙 ${s.tokens.toLocaleString()}</div>
      <div class="lb-grade-badge">${grade.label}</div>`;
    container.appendChild(row);
  });
}

function renderFullLeaderboard() {
  const me = getCurrentStudent();
  const container = document.getElementById('full-leaderboard');
  if (!container) return;
  const filterRoom = document.getElementById('lb-room-filter')?.value || '';
  const search = (document.getElementById('lb-search')?.value || '').toLowerCase();
  let all = sortedStudents(filterRoom);
  if (search) all = all.filter(s =>
    s.nickname.toLowerCase().includes(search) ||
    s.firstName.toLowerCase().includes(search) ||
    s.lastName.toLowerCase().includes(search)
  );
  if (all.length === 0) {
    container.innerHTML = '<div class="empty-state"><span>🔍</span>ไม่พบนักเรียนที่ค้นหา</div>';
    return;
  }
  container.innerHTML = '';
  all.forEach((s, idx) => {
    const grade = getGrade(s.tokens);
    const isMe = me && !me.isAdmin && s.id === me.id;
    const avUrl = getStudentAvatarUrl(s.id);
    const avHtml = avUrl
      ? `<div class="lb-avatar" style="background:${getAvatarBg(idx)};padding:0;overflow:hidden"><img src="${avUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;"/></div>`
      : `<div class="lb-avatar" style="background:${getAvatarBg(idx)}">${getAvatarChar(s.nickname)}</div>`;
    const row = document.createElement('div');
    row.className = `lb-row grade-${grade.cls}${isMe ? ' is-me' : ''}`;
    row.innerHTML = `
      <div class="lb-rank-num">${getRankEmoji(idx + 1)}</div>
      ${avHtml}
      <div class="lb-info">
        <div class="lb-name">${s.nickname} ${s.firstName} ${s.lastName}${isMe ? ' <span style="font-size:0.72rem;color:var(--primary-light)">(ฉัน)</span>' : ''}</div>
        <div class="lb-meta">${s.room} · สมัคร ${new Date(s.registeredAt).toLocaleDateString('th-TH')}</div>
      </div>
      <div class="lb-tokens" style="color:${grade.color}">🪙 ${s.tokens.toLocaleString()}</div>
      <div class="lb-grade-badge">${grade.label}</div>`;
    container.appendChild(row);
  });
}

function getRankEmoji(rank) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

// =================== AVATAR SYSTEM ===================
const AVATAR_KEY = 'edutoken_avatars';

function getAvatarStore() {
  try { return JSON.parse(localStorage.getItem(AVATAR_KEY)) || {}; } catch (e) { return {}; }
}
function saveAvatarStore(store) {
  try { localStorage.setItem(AVATAR_KEY, JSON.stringify(store)); } catch (e) { }
}
function getStudentAvatarUrl(studentId) {
  if (!studentId) return null;
  return getAvatarStore()[studentId] || null;
}

// ── Save avatar to Firebase + localStorage
function saveAvatarToFirebase(studentId, dataUrl) {
  // 1. บันทึกลง localStorage ก่อน (เร็ว, ไม่ต้องรอ Firebase)
  const store = getAvatarStore();
  store[studentId] = dataUrl;
  saveAvatarStore(store);

  // 2. บันทึกลง Firebase (sync ข้ามเครื่อง)
  if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
    firebase.database().ref('avatars/' + studentId).set(dataUrl)
      .then(() => console.log('Avatar saved to Firebase ✅'))
      .catch(err => console.warn('Avatar Firebase save failed:', err));
  }
}

// ── Delete avatar from Firebase + localStorage
function deleteAvatarFromFirebase(studentId) {
  const store = getAvatarStore();
  delete store[studentId];
  saveAvatarStore(store);

  if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
    firebase.database().ref('avatars/' + studentId).remove()
      .catch(err => console.warn('Avatar Firebase delete failed:', err));
  }
}

// ── Sync all avatars from Firebase to localStorage (real-time listener)
function syncAvatarsFromFirebase(callback) {
  if (!USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) {
    if (callback) callback();
    return;
  }
  let firstLoad = true;
  firebase.database().ref('avatars').on('value', snapshot => {
    const val = snapshot.val();
    if (val && typeof val === 'object') {
      // รวม Firebase avatars เข้ากับ localStorage (Firebase เป็นหลัก)
      const store = getAvatarStore();
      Object.assign(store, val);
      saveAvatarStore(store);
    }
    if (firstLoad) {
      firstLoad = false;
      if (callback) callback();
    } else {
      // real-time update: re-render ทุกหน้าที่แสดง avatar
      refreshAllUI();
      // re-render chat messages ถ้ากำลังอยู่ที่หน้า chat
      updateChatAvatarMini();
      var chatMsgs = document.getElementById('chat-messages');
      if (chatMsgs && chatMsgs.innerHTML && !chatMsgs.querySelector('.chat-empty') && !chatMsgs.querySelector('.chat-loading')) {
        // force Firebase listener to re-fetch latest messages
        if (typeof switchChatRoom === 'function' && currentChatRoom) {
          // re-render โดยใช้ข้อมูลที่มีอยู่แล้วใน DOM (parse จาก message wrap)
          var me = getCurrentStudent();
          if (me && chatListener) {
            firebase.database().ref('chat/' + currentChatRoom).orderByChild('timestamp').limitToLast(100).once('value', function (snap) {
              var messages = [];
              snap.forEach(function (child) { messages.push(Object.assign({ _key: child.key }, child.val())); });
              renderChatMessages(messages, me);
            });
          }
        }
      }
    }
  }, function () { if (firstLoad) { firstLoad = false; if (callback) callback(); } });
}

function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', '⚠️'); return; }
  if (file.size > 6 * 1024 * 1024) { showToast('ไฟล์ขนาดใหญ่เกินไป (สูงสุด 6MB)', '⚠️'); return; }
  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // ลด MAX ลงเหลือ 240px เพื่อให้ Base64 เล็กลง เหมาะกับ Firebase RTDB
      const MAX = 240;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
      else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.75); // quality 0.75 ลดขนาดอีก
      const me = getCurrentStudent();
      if (!me) return;
      showLoading(true);
      saveAvatarToFirebase(me.id, dataUrl);
      const wrap = document.getElementById('avatar-upload-wrap');
      if (wrap) { wrap.classList.add('shimmer'); setTimeout(() => wrap.classList.remove('shimmer'), 800); }
      showLoading(false);
      showToast('เปลี่ยนรูปโปรไฟล์สำเร็จ! 🎉 (ซิงค์ข้ามเครื่องแล้ว)', '📷');
      renderProfile(); updateNavUser(me); renderPodium(); renderLeaderboard();
      updateChatAvatarMini(); // อัพเดท avatar ใน chat ด้วย
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}
function removeAvatar() {
  const me = getCurrentStudent();
  if (!me) return;
  if (!confirm('ลบรูปโปรไฟล์แล้วใช้ตัวอักษรแทน?')) return;
  deleteAvatarFromFirebase(me.id);
  showToast('ลบรูปโปรไฟล์แล้ว', '🗑️');
  renderProfile(); updateNavUser(me); renderPodium(); renderLeaderboard();
  updateChatAvatarMini(); // อัพเดท avatar ใน chat ด้วย
}

function applyAvatarToElement(el, avatarUrl, letter, bg) {
  if (avatarUrl) {
    el.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`;
  } else {
    el.textContent = letter;
    if (bg) el.style.background = bg;
  }
}

// =================== PROFILE ===================
function renderProfile() {
  const me = getCurrentStudent();
  if (!me) return;
  // Avatar
  const avatarEl = document.getElementById('profile-avatar-big');
  const avatarWrap = document.getElementById('avatar-upload-wrap');
  const avatarUrl = getStudentAvatarUrl(me.id);
  if (avatarUrl && !me.isAdmin) {
    avatarEl.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />`;
    if (avatarWrap) avatarWrap.classList.add('avatar-has-photo');
  } else {
    avatarEl.textContent = getAvatarChar(me.nickname);
    avatarEl.style.background = '';
    if (avatarWrap) avatarWrap.classList.remove('avatar-has-photo');
  }
  // Hide upload controls for admin
  const overlay = document.getElementById('avatar-upload-overlay');
  const removeBtn = document.getElementById('avatar-remove-btn');
  if (overlay) overlay.style.display = me.isAdmin ? 'none' : '';
  if (removeBtn) removeBtn.style.display = me.isAdmin ? 'none' : '';

  document.getElementById('profile-nickname').textContent = me.nickname;
  document.getElementById('profile-fullname').textContent = me.isAdmin ? 'Admin System' : `${me.firstName} ${me.lastName}`;
  document.getElementById('profile-room-badge').textContent = me.isAdmin ? '🔐 Admin' : '🏫 ' + me.room;
  const grade = getGrade(me.isAdmin ? 9999 : me.tokens);
  const gradeBadge = document.getElementById('profile-grade-badge');
  gradeBadge.textContent = me.isAdmin ? '⚙️ Administrator' : grade.label;
  gradeBadge.style.cssText = `background:${grade.color}22;color:${grade.color};border:1px solid ${grade.color}55;display:inline-block;border-radius:20px;padding:4px 16px;font-size:0.82rem;font-weight:700;margin-top:8px;`;
  animateCounter('ps-token', me.isAdmin ? 0 : me.tokens);
  const rank = me.isAdmin ? null : getMyRank(me.id, '');
  document.getElementById('ps-rank').textContent = me.isAdmin ? '👑 Admin' : (rank ? `#${rank}` : '#-');
  document.getElementById('ps-phone').textContent = me.phone || '-';
  document.getElementById('ps-email').textContent = me.email || '-';
  document.getElementById('ps-room').textContent = me.room || '-';
  // Progress bar
  const thresholds = [0, 50, 150, 300, 500, Infinity];
  const cur = me.isAdmin ? 500 : me.tokens;
  let next = thresholds.find(t => t > cur) || Infinity;
  let prev = 0;
  for (let i = thresholds.length - 1; i >= 0; i--) { if (cur >= thresholds[i]) { prev = thresholds[i]; break; } }
  const pct = next === Infinity ? 100 : Math.min(100, ((cur - prev) / (next - prev)) * 100);
  document.getElementById('progress-bar-inner').style.width = pct + '%';
  document.getElementById('progress-label').textContent = next === Infinity ? 'MAX LEVEL 🏆' : `${cur} / ${next}`;
  // Admin shortcut
  document.getElementById('admin-panel').classList.toggle('hidden', !me.isAdmin);
}

// =================== REWARD SETTINGS SYSTEM ===================
const REWARD_SETTINGS_KEY = 'edutoken_reward_settings';
const TOKEN_LOG_KEY = 'edutoken_token_log';

function getDefaultRewardSettings() {
  return {
    quiz: {
      defaultToken: 10,     // Default token per correct answer
      firstBonus: 5,        // Bonus for first-time play of any category
      retryPct: 0           // % of token earned when retrying (0 = no token on retry)
    },
    cardGame: {
      star1Token: 5,
      star2Token: 10,
      star3Token: 15,
      firstBonus: 0,
      thresh3: 18,          // moves <= thresh3 → 3 stars
      thresh2: 26           // moves <= thresh2 → 2 stars
    },
    pcGame: {
      enabled: true
    }
  };
}

function loadRewardSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(REWARD_SETTINGS_KEY));
    if (stored) {
      // Deep merge with defaults to handle missing keys
      const def = getDefaultRewardSettings();
      return {
        quiz: Object.assign({}, def.quiz, stored.quiz || {}),
        cardGame: Object.assign({}, def.cardGame, stored.cardGame || {}),
        pcGame: Object.assign({}, def.pcGame, stored.pcGame || {})
      };
    }
  } catch (e) { }
  return getDefaultRewardSettings();
}

function saveRewardSettingsToStorage(settings) {
  localStorage.setItem(REWARD_SETTINGS_KEY, JSON.stringify(settings));
  // Sync to Firebase if available
  if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
    firebase.database().ref('reward_settings').set(settings)
      .catch(err => console.warn('Reward settings Firebase sync failed:', err));
  }
}

// Load settings from Firebase (one-time on admin page)
function syncRewardSettingsFromFirebase() {
  if (!USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) return;
  firebase.database().ref('reward_settings').once('value').then(snap => {
    const val = snap.val();
    if (val) {
      const def = getDefaultRewardSettings();
      const merged = {
        quiz: Object.assign({}, def.quiz, val.quiz || {}),
        cardGame: Object.assign({}, def.cardGame, val.cardGame || {}),
        pcGame: Object.assign({}, def.pcGame, val.pcGame || {})
      };
      localStorage.setItem(REWARD_SETTINGS_KEY, JSON.stringify(merged));
      populateRewardSettingsUI(merged);
    }
  }).catch(() => { });
}

// Populate the UI fields with current settings
function populateRewardSettingsUI(settings) {
  if (!settings) settings = loadRewardSettings();
  // Quiz
  const qdt = document.getElementById('rs-quiz-default-token');
  const qfb = document.getElementById('rs-quiz-first-bonus');
  const qrp = document.getElementById('rs-quiz-retry-pct');
  if (qdt) qdt.value = settings.quiz.defaultToken;
  if (qfb) qfb.value = settings.quiz.firstBonus;
  if (qrp) qrp.value = settings.quiz.retryPct;
  // Card game
  const cs1 = document.getElementById('rs-card-star1');
  const cs2 = document.getElementById('rs-card-star2');
  const cs3 = document.getElementById('rs-card-star3');
  const cfb = document.getElementById('rs-card-first-bonus');
  const ct3 = document.getElementById('rs-card-thresh3');
  const ct2 = document.getElementById('rs-card-thresh2');
  if (cs1) cs1.value = settings.cardGame.star1Token;
  if (cs2) cs2.value = settings.cardGame.star2Token;
  if (cs3) cs3.value = settings.cardGame.star3Token;
  if (cfb) cfb.value = settings.cardGame.firstBonus;
  if (ct3) ct3.value = settings.cardGame.thresh3;
  if (ct2) ct2.value = settings.cardGame.thresh2;
  // PC game
  const pcToggle = document.getElementById('rs-pcgame-enabled');
  const pcStatus = document.getElementById('rs-pcgame-status');
  if (pcToggle) pcToggle.checked = settings.pcGame.enabled;
  if (pcStatus) pcStatus.textContent = settings.pcGame.enabled ? '✅ เปิดใช้งาน' : '❌ ปิดใช้งาน';
  if (pcStatus) pcStatus.style.color = settings.pcGame.enabled ? 'var(--success)' : 'var(--danger)';
}

// Save from UI to storage
function saveRewardSettings() {
  const settings = loadRewardSettings();
  // Quiz
  const qdt = parseInt(document.getElementById('rs-quiz-default-token')?.value) || 10;
  const qfb = parseInt(document.getElementById('rs-quiz-first-bonus')?.value) || 0;
  const qrp = parseInt(document.getElementById('rs-quiz-retry-pct')?.value) || 0;
  settings.quiz.defaultToken = Math.max(0, qdt);
  settings.quiz.firstBonus = Math.max(0, qfb);
  settings.quiz.retryPct = Math.max(0, Math.min(100, qrp));
  // Card game
  const cs1 = parseInt(document.getElementById('rs-card-star1')?.value) || 5;
  const cs2 = parseInt(document.getElementById('rs-card-star2')?.value) || 10;
  const cs3 = parseInt(document.getElementById('rs-card-star3')?.value) || 15;
  const cfb = parseInt(document.getElementById('rs-card-first-bonus')?.value) || 0;
  const ct3 = parseInt(document.getElementById('rs-card-thresh3')?.value) || 18;
  const ct2 = parseInt(document.getElementById('rs-card-thresh2')?.value) || 26;
  settings.cardGame.star1Token = Math.max(0, cs1);
  settings.cardGame.star2Token = Math.max(0, cs2);
  settings.cardGame.star3Token = Math.max(0, cs3);
  settings.cardGame.firstBonus = Math.max(0, cfb);
  settings.cardGame.thresh3 = Math.max(1, ct3);
  settings.cardGame.thresh2 = Math.max(ct3 + 1, ct2);
  saveRewardSettingsToStorage(settings);
  showToast('💾 บันทึกการตั้งค่ารางวัลเรียบร้อย!', '✅', 3000);
}

function savePCGameToggle(checkbox) {
  const settings = loadRewardSettings();
  settings.pcGame.enabled = checkbox.checked;
  saveRewardSettingsToStorage(settings);
  const status = document.getElementById('rs-pcgame-status');
  if (status) {
    status.textContent = checkbox.checked ? '✅ เปิดใช้งาน' : '❌ ปิดใช้งาน';
    status.style.color = checkbox.checked ? 'var(--success)' : 'var(--danger)';
  }
  showToast(checkbox.checked ? '✅ เปิดรับ Token จากเกมประกอบคอมแล้ว' : '❌ ปิดรับ Token จากเกมประกอบคอมแล้ว', checkbox.checked ? '✅' : '❌');
}

// Switch reward config sub-tabs
function switchAdminRewardTab(tab) {
  ['quiz', 'cardgame', 'pcgame'].forEach(t => {
    const panel = document.getElementById('admin-reward-tab-' + t);
    const btn = document.getElementById('art-btn-' + t);
    if (panel) panel.style.display = t === tab ? '' : 'none';
    if (btn) btn.classList.toggle('active', t === tab);
  });
  if (tab === 'pcgame') renderTokenLog();
}

// ── Token Activity Log ──
function logTokenActivity(studentId, studentName, amount, reason) {
  try {
    const log = JSON.parse(localStorage.getItem(TOKEN_LOG_KEY) || '[]');
    log.unshift({ studentId, studentName, amount, reason, ts: Date.now() });
    if (log.length > 50) log.length = 50; // keep last 50
    localStorage.setItem(TOKEN_LOG_KEY, JSON.stringify(log));
  } catch (e) { }
}

function renderTokenLog() {
  const container = document.getElementById('rs-token-log');
  if (!container) return;
  try {
    const log = JSON.parse(localStorage.getItem(TOKEN_LOG_KEY) || '[]');
    if (log.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:1rem;color:var(--text-muted)">📭 ยังไม่มีประวัติการได้รับ Token จากมินิเกม</div>';
      return;
    }
    container.innerHTML = log.slice(0, 10).map(entry => {
      const d = new Date(entry.ts);
      const time = d.toLocaleString('th-TH', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-radius:10px;background:rgba(255,255,255,0.04);margin-bottom:6px;gap:10px;">
        <div style="flex:1;min-width:0">
          <div style="color:var(--text-light);font-size:0.9rem;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${entry.studentName || entry.studentId || 'Unknown'}</div>
          <div style="color:var(--text-muted);font-size:0.77rem">${entry.reason || 'มินิเกม'} · ${time}</div>
        </div>
        <div style="color:#4ade80;font-weight:700;font-size:1rem;white-space:nowrap">+${entry.amount} 🪙</div>
      </div>`;
    }).join('');
  } catch (e) {
    container.innerHTML = '<div style="color:var(--text-muted);padding:1rem">ไม่สามารถโหลดประวัติได้</div>';
  }
}

// ── Admin: Reset Quiz Progress ──
function adminResetQuizProgress() {
  const sel = document.getElementById('rs-quiz-reset-student');
  const studentId = sel ? sel.value : '';
  const db = loadDB();

  if (studentId) {
    const s = db.students.find(x => x.id === studentId);
    if (!s) { showToast('ไม่พบนักเรียน', '⚠️'); return; }
    if (!confirm(`รีเซ็ตประวัติ Quiz ของ "${s.nickname}" ใช่ไหม?\nนักเรียนจะสามารถทำ Quiz ซ้ำแล้วได้รับ Token ใหม่ได้`)) return;
    const key = 'quizDone_' + studentId;
    localStorage.removeItem(key);
    // Also clear on Firebase if available
    if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
      firebase.database().ref('quiz_progress/' + studentId).remove();
    }
    showToast(`🔄 รีเซ็ตประวัติ Quiz ของ "${s.nickname}" เรียบร้อย!`, '✅', 3000);
  } else {
    if (!confirm('รีเซ็ตประวัติ Quiz ของนักเรียนทุกคนใช่ไหม?\nทุกคนจะสามารถทำ Quiz ซ้ำได้รับ Token ใหม่')) return;
    // Clear local storage for all students
    db.students.forEach(s => {
      localStorage.removeItem('quizDone_' + s.id);
    });
    // Also clear Firebase quiz_progress node
    if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
      firebase.database().ref('quiz_progress').remove();
    }
    showToast('🔄 รีเซ็ตประวัติ Quiz ของทุกคนเรียบร้อย!', '✅', 3000);
  }
}

// ── Populate the Reset Quiz student dropdown ──
function populateRewardQuizResetSelect() {
  const sel = document.getElementById('rs-quiz-reset-student');
  if (!sel) return;
  const prev = sel.value;
  const db = loadDB();
  sel.innerHTML = '<option value="">-- เลือกนักเรียน (ว่าง = ทุกคน) --</option>';
  db.students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.nickname} (${s.firstName} ${s.lastName}) – ${s.room}`;
    sel.appendChild(opt);
  });
  if (prev) sel.value = prev;
}

// =================== ADMIN BACKEND PAGE ===================
function renderAdminPage() {
  const db = loadDB();
  const all = db.students;
  const totalTokens = all.reduce((s, x) => s + x.tokens, 0);
  document.getElementById('ab-total').textContent = all.length;
  document.getElementById('ab-total-tokens').textContent = totalTokens.toLocaleString();
  populateQuickSelect();
  renderAdminTable();
  renderAdminShopStats();
  renderAdminRedeems();
  renderAdminItems();
  // Quiz management
  updateAdminQuizStats();
  populateQuizCatSelects();
  renderAdminQuizList();
  renderAdminQuizCatList();
  // Reward settings
  populateRewardSettingsUI();
  populateRewardQuizResetSelect();
  syncRewardSettingsFromFirebase();
}

function populateQuickSelect() {
  const sel = document.getElementById('aq-student');
  if (!sel) return;
  const db = loadDB();
  const prev = sel.value;
  sel.innerHTML = '<option value="">-- เลือกนักเรียน --</option>';
  db.students.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.nickname} (${s.firstName} ${s.lastName}) – ${s.room} – ${s.tokens} Token`;
    sel.appendChild(opt);
  });
  if (prev) sel.value = prev;
}

function adminFillCurrentToken() {
  const id = document.getElementById('aq-student').value;
  const infoEl = document.getElementById('aq-current-info');
  if (!id) { document.getElementById('aq-amount').value = ''; infoEl.textContent = ''; return; }
  const db = loadDB();
  const s = db.students.find(x => x.id === id);
  if (s) {
    document.getElementById('aq-amount').value = s.tokens;
    const grade = getGrade(s.tokens);
    infoEl.innerHTML = `ปัจจุบัน: <strong style="color:${grade.color}">${s.tokens} Token (${grade.label})</strong> · ${s.firstName} ${s.lastName} · ${s.room}`;
  }
}

function adminQuickSet() {
  const id = document.getElementById('aq-student').value;
  const amount = parseInt(document.getElementById('aq-amount').value);
  if (!id) { showToast('กรุณาเลือกนักเรียน', '⚠️'); return; }
  if (isNaN(amount) || amount < 0) { showToast('จำนวนโทเค้นไม่ถูกต้อง', '⚠️'); return; }
  const db = loadDB();
  const s = db.students.find(x => x.id === id);
  if (s) { s.tokens = amount; saveDB(db, s.id); refreshAdmin(s, `ตั้งค่า Token = ${amount}`); }
}
function adminQuickAdd() {
  const id = document.getElementById('aq-student').value;
  const amount = parseInt(document.getElementById('aq-amount').value);
  if (!id) { showToast('กรุณาเลือกนักเรียน', '⚠️'); return; }
  if (isNaN(amount)) { showToast('จำนวนโทเค้นไม่ถูกต้อง', '⚠️'); return; }
  const db = loadDB();
  const s = db.students.find(x => x.id === id);
  if (s) { s.tokens = Math.max(0, s.tokens + amount); saveDB(db, s.id); refreshAdmin(s, `เพิ่ม +${amount} Token`); }
}
function adminQuickSub() {
  const id = document.getElementById('aq-student').value;
  const amount = parseInt(document.getElementById('aq-amount').value);
  if (!id) { showToast('กรุณาเลือกนักเรียน', '⚠️'); return; }
  if (isNaN(amount)) { showToast('จำนวนโทเค้นไม่ถูกต้อง', '⚠️'); return; }
  const db = loadDB();
  const s = db.students.find(x => x.id === id);
  if (s) { s.tokens = Math.max(0, s.tokens - amount); saveDB(db, s.id); refreshAdmin(s, `ลด -${amount} Token`); }
}
function adminQuickReset() {
  const id = document.getElementById('aq-student').value;
  if (!id) { showToast('กรุณาเลือกนักเรียน', '⚠️'); return; }
  if (!confirm('รีเซ็ต Token ของนักเรียนคนนี้เป็น 0 ใช่ไหม?')) return;
  const db = loadDB();
  const s = db.students.find(x => x.id === id);
  if (s) { s.tokens = 0; saveDB(db, s.id); refreshAdmin(s, 'รีเซ็ต Token = 0'); }
}

// Inline table actions
function adminInlineSet(id) {
  const val = parseInt(document.getElementById('inline-input-' + id).value);
  if (isNaN(val) || val < 0) { showToast('ค่าไม่ถูกต้อง', '⚠️'); return; }
  const db = loadDB();
  const s = db.students.find(x => x.id === id);
  if (s) { s.tokens = val; saveDB(db, s.id); refreshAdmin(s, `✅ ตั้งค่า Token = ${val}`); }
}
function adminInlineAdd(id) {
  const val = parseInt(document.getElementById('inline-input-' + id).value);
  if (isNaN(val)) { showToast('ค่าไม่ถูกต้อง', '⚠️'); return; }
  const db = loadDB();
  const s = db.students.find(x => x.id === id);
  if (s) { s.tokens = Math.max(0, s.tokens + val); saveDB(db, s.id); refreshAdmin(s, `➕ เพิ่ม +${val} → ${s.tokens}`); }
}
function adminInlineSub(id) {
  const val = parseInt(document.getElementById('inline-input-' + id).value);
  if (isNaN(val)) { showToast('ค่าไม่ถูกต้อง', '⚠️'); return; }
  const db = loadDB();
  const s = db.students.find(x => x.id === id);
  if (s) { s.tokens = Math.max(0, s.tokens - val); saveDB(db, s.id); refreshAdmin(s, `➖ ลด -${val} → ${s.tokens}`); }
}
function adminInlineReset(id) {
  const db = loadDB();
  const s = db.students.find(x => x.id === id);
  if (s && confirm(`รีเซ็ต Token ${s.nickname} เป็น 0?`)) {
    s.tokens = 0; saveDB(db, s.id); refreshAdmin(s, `🔄 รีเซ็ต ${s.nickname} = 0`);
  }
}
function adminDeleteStudent(id) {
  const db = loadDB();
  const index = db.students.findIndex(x => x.id === id);
  if (index !== -1) {
    const s = db.students[index];
    if (!confirm(`⚠️ ยืนยันการลบนักเรียน "${s.nickname} (${s.firstName} ${s.lastName})" ออกจากระบบ?\n\n(ข้อมูลจะไม่สามารถกู้คืนได้)`)) return;
    
    // ลบจาก array
    db.students.splice(index, 1);
    
    // Save แบบออฟไลน์
    currentDB = JSON.parse(JSON.stringify(db));
    localStorage.setItem(DB_KEY, JSON.stringify(currentDB));

    // ลบจาก Firebase ถาวร
    if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
      firebase.database().ref('students/' + id).remove().catch(()=>{});
      firebase.database().ref('avatars/' + id).remove().catch(()=>{});
      firebase.database().ref('redeems/' + id).remove().catch(()=>{});
      firebase.database().ref('quiz_progress/' + id).remove().catch(()=>{});
    }

    showToast(`🗑️ ลบข้อมูล ${s.nickname} สำเร็จ`, '✅', 3000);
    renderAdminPage();
    renderPodium();
    renderLeaderboard();
  }
}

function refreshAdmin(s, msg) {
  showToast(`${msg} · ${s ? s.nickname : ''}`, '✅');
  renderAdminPage();
  adminFillCurrentToken();
  // Update dashboard stats if visible
  renderPodium();
  renderLeaderboard();
  document.getElementById('nav-token-count').textContent = '∞';
}

// Bulk actions
function adminBulkAdd() {
  const room = document.getElementById('bulk-room').value;
  const amount = parseInt(document.getElementById('bulk-amount').value);
  if (isNaN(amount) || amount <= 0) { showToast('กรุณากรอกจำนวน Token ที่ถูกต้อง', '⚠️'); return; }
  const label = room || 'ทุกห้อง';
  if (!confirm(`เพิ่ม +${amount} Token ให้ทุกคนใน${label}?`)) return;
  const db = loadDB();
  let count = 0;
  db.students.forEach(s => {
    if (!room || s.room === room) { s.tokens += amount; count++; }
  });
  saveDB(db); // Bulk update, no specific ID
  showToast(`➕ เพิ่ม ${amount} Token ให้ ${count} คน (${label})`, '✅');
  renderAdminPage(); renderPodium(); renderLeaderboard();
}
function adminBulkReset() {
  const room = document.getElementById('bulk-room').value;
  const label = room || 'ทุกห้อง';
  if (!confirm(`รีเซ็ต Token ทุกคนใน${label} เป็น 0?`)) return;
  const db = loadDB();
  let count = 0;
  db.students.forEach(s => { if (!room || s.room === room) { s.tokens = 0; count++; } });
  saveDB(db); // Bulk update, no specific ID
  showToast(`🔄 รีเซ็ต Token ${count} คน (${label})`, '✅');
  renderAdminPage(); renderPodium(); renderLeaderboard();
}
function adminResetAllTokens() {
  if (!confirm('⚠️ รีเซ็ต Token ทุกคนทั้งหมดเป็น 0 ?\nการกระทำนี้ไม่สามารถย้อนกลับได้!')) return;
  if (!confirm('ยืนยันอีกครั้ง: รีเซ็ต Token ทุกคนจริงหรือ?')) return;
  const db = loadDB();
  db.students.forEach(s => { s.tokens = 0; });
  saveDB(db); // Bulk update, no specific ID
  showToast('💣 รีเซ็ต Token ทุกคนเรียบร้อยแล้ว', '✅');
  renderAdminPage(); renderPodium(); renderLeaderboard();
}

function adminDeleteAllDemo() {
  if (!confirm('⚠️ ยืนยันการลบ User DEMO (ระบบจำลอง) ทั้งหมดออกจากระบบ?\nข้อมูลนักเรียนจำลองจะถูกลบถาวร!')) return;
  const db = loadDB();
  const beforeCount = db.students.length;
  // ลบเฉพาะ user ที่ id มีคำว่า demo_
  const demos = db.students.filter(s => s.id.startsWith('demo_'));
  db.students = db.students.filter(s => !s.id.startsWith('demo_'));
  
  if (demos.length === 0) {
    showToast('ไม่พบ User DEMO ในระบบ', '⚠️');
    return;
  }

  currentDB = JSON.parse(JSON.stringify(db));
  localStorage.setItem(DB_KEY, JSON.stringify(currentDB));

  if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
    demos.forEach(d => {
      firebase.database().ref('students/' + d.id).remove().catch(()=>{});
      firebase.database().ref('avatars/' + d.id).remove().catch(()=>{});
      firebase.database().ref('redeems/' + d.id).remove().catch(()=>{});
      firebase.database().ref('quiz_progress/' + d.id).remove().catch(()=>{});
    });
  }

  showToast(`🗑️ ลบ User DEMO จำนวน ${demos.length} คน เรียบร้อยแล้ว`, '✅', 3500);
  renderAdminPage(); renderPodium(); renderLeaderboard();
}
function adminExportCSV() {
  const db = loadDB();
  const sorted = db.students.slice().sort((a, b) => b.tokens - a.tokens);
  const header = 'อันดับ,ชื่อเล่น,ชื่อ,นามสกุล,ห้องเรียน,Token,เกรด,เบอร์โทร,อีเมล\n';
  const rows = sorted.map((s, i) =>
    `${i + 1},${s.nickname},${s.firstName},${s.lastName},${s.room},${s.tokens},${getGrade(s.tokens).label.replace(/[^ ]+/, '').trim()},${s.phone},${s.email || '-'}`
  ).join('\n');
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
  a.download = `edutoken_export_${new Date().toISOString().split('T')[0]}.csv`;
  a.click(); URL.revokeObjectURL(a.href);
  showToast('📥 Export CSV สำเร็จ', '✅');
}

function renderAdminTable() {
  const container = document.getElementById('admin-student-table');
  if (!container) return;
  const filterRoom = document.getElementById('ab-room-filter')?.value || '';
  const search = (document.getElementById('ab-search')?.value || '').toLowerCase();
  const sortBy = document.getElementById('ab-sort')?.value || 'tokens-desc';

  let all = loadDB().students.slice();
  if (filterRoom) all = all.filter(s => s.room === filterRoom);
  if (search) all = all.filter(s =>
    s.nickname.toLowerCase().includes(search) ||
    s.firstName.toLowerCase().includes(search) ||
    s.lastName.toLowerCase().includes(search)
  );
  if (sortBy === 'tokens-desc') all.sort((a, b) => b.tokens - a.tokens);
  else if (sortBy === 'tokens-asc') all.sort((a, b) => a.tokens - b.tokens);
  else if (sortBy === 'name') all.sort((a, b) => a.nickname.localeCompare(b.nickname, 'th'));
  else if (sortBy === 'room') all.sort((a, b) => a.room.localeCompare(b.room, 'th'));

  if (all.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:2rem"><span>📭</span>ไม่พบนักเรียน</div>';
    return;
  }

  // Header
  let html = `<div class="admin-tr-header">
    <div>#</div>
    <div>ชื่อ – ชื่อเล่น</div>
    <div>ห้อง</div>
    <div>Token (เกรด)</div>
    <div>Token</div>
    <div>จัดการ</div>
  </div>`;
  // Rows
  all.forEach((s, idx) => {
    const grade = getGrade(s.tokens);
    html += `<div class="admin-tr">
      <div class="admin-tr-rank">${getRankEmoji(idx + 1)}</div>
      <div class="admin-tr-name-cell">
        <div class="admin-tr-mini-avatar" style="background:${getAvatarBg(idx)}">${getAvatarChar(s.nickname)}</div>
        <div>
          <div class="admin-tr-name">${s.nickname}</div>
          <div class="admin-tr-nick">${s.firstName} ${s.lastName}</div>
        </div>
      </div>
      <div><span class="admin-tr-room">${s.room}</span></div>
      <div>
        <div class="admin-tr-tokens" style="color:${grade.color}">🪙 ${s.tokens}</div>
        <div class="admin-tr-grade" style="margin-top:3px">${grade.label}</div>
      </div>
      <div>
        <input type="number" id="inline-input-${s.id}" class="admin-inline-input" value="${s.tokens}" min="0" />
      </div>
      <div class="admin-tr-actions">
        <button class="aib-btn aib-set"   onclick="adminInlineSet('${s.id}')">✅</button>
        <button class="aib-btn aib-add"   onclick="adminInlineAdd('${s.id}')">➕</button>
        <button class="aib-btn aib-sub"   onclick="adminInlineSub('${s.id}')">➖</button>
        <button class="aib-btn aib-reset" onclick="adminInlineReset('${s.id}')">🔄</button>
        <button class="aib-btn" onclick="openEditStudentModal('${s.id}')" style="background:var(--primary)" title="แก้ไขห้อง/เบอร์">✏️</button>
        <button class="aib-btn" onclick="adminDeleteStudent('${s.id}')" style="background:var(--danger)" title="ลบผู้ใช้งาน">🗑️</button>
      </div>
    </div>`;
  });
  container.innerHTML = html;
}

// ── Admin: Edit Student Info Modal ──
function openEditStudentModal(studentId) {
  const db = loadDB();
  const s = db.students.find(x => x.id === studentId);
  if (!s) return;

  document.getElementById('edit-stu-id').value = studentId;
  document.getElementById('edit-stu-name').textContent = `${s.nickname} (${s.firstName} ${s.lastName})`;
  document.getElementById('edit-stu-room').value = s.room || '';
  document.getElementById('edit-stu-phone').value = s.phone || '';
  document.getElementById('edit-stu-email').value = s.email || '';
  document.getElementById('edit-stu-password').value = '';
  document.getElementById('edit-stu-modal-error').textContent = '';
  document.getElementById('edit-stu-modal-overlay').classList.remove('hidden');
}

function closeEditStudentModal() {
  document.getElementById('edit-stu-modal-overlay').classList.add('hidden');
}

function saveEditStudent() {
  const studentId = document.getElementById('edit-stu-id').value;
  const room = document.getElementById('edit-stu-room').value.trim();
  const phone = document.getElementById('edit-stu-phone').value.trim();
  const email = document.getElementById('edit-stu-email').value.trim();
  const password = document.getElementById('edit-stu-password').value.trim();
  const errEl = document.getElementById('edit-stu-modal-error');

  if (!room) { errEl.textContent = '⚠️ กรุณากรอกห้องเรียน'; return; }
  if (!phone) { errEl.textContent = '⚠️ กรุณากรอกเบอร์โทรศัพท์'; return; }
  if (password && password.length < 8) { errEl.textContent = '⚠️ รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร'; return; }

  const db = loadDB();
  const s = db.students.find(x => x.id === studentId);
  if (!s) { errEl.textContent = '❌ ไม่พบข้อมูลนักเรียน'; return; }

  s.room = room;
  s.phone = phone;
  s.email = email;
  if (password) s.password = password;
  saveDB(db, studentId);

  // Update session if this is the current logged-in student
  const session = loadSession();
  if (session && session.id === studentId) {
    session.room = room;
    session.phone = phone;
    session.email = email;
    if (password) session.password = password;
    saveSession(session);
  }

  closeEditStudentModal();
  renderAdminTable();
  populateQuickSelect();
  showToast(`แก้ไขข้อมูล ${s.nickname} เรียบร้อย`, '✅', 2500);
}

// =================== GAME INTEGRATION ===================
window.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'ADD_TOKEN') {
    const me = getCurrentStudent();
    if (me) {
      const db = loadDB();
      const s = db.students.find(x => x.id === me.id);
      if (s) {
        s.tokens += e.data.amount;
        saveDB(db, s.id);
        saveSession(s);
        const msg = e.data.reason ? `🎉 ยินดีด้วย! คุณได้รับ ${e.data.amount} Token พ้อยต์จาก ${e.data.reason}!` : `🎉 ยินดีด้วย! คุณได้รับ ${e.data.amount} Token พ้อยต์จากการเล่นมินิเกม!`;
        const icon = e.data.icon || '🎮';
        showToast(msg, icon, 4500);

        try { document.getElementById('nav-token-count').textContent = s.tokens.toLocaleString(); } catch (e) { }

        // Refresh visible sections
        try {
          renderPodium();
          renderLeaderboard();
          if (document.getElementById('section-profile').classList.contains('active')) renderProfile();
          if (document.getElementById('section-dashboard').classList.contains('active')) renderDashboard();
          if (document.getElementById('section-adminbackend').classList.contains('active')) renderAdminPage();
        } catch (e) { }
      }
    }
  }
});

// =================== INIT ===================
(function init() {
  initParticles();
  // ซิงค์ avatars จาก Firebase ก่อน แล้วค่อย initFirebaseSync
  syncAvatarsFromFirebase(() => {
    initFirebaseSync(() => {
      const session = loadSession();
      if (session) {
        const db = loadDB();
        const fresh = session.id === '__admin__' ? session : db.students.find(s => s.id === session.id);
        if (fresh) {
          document.getElementById('auth-wrapper').classList.add('hidden');
          document.getElementById('dashboard-wrapper').classList.remove('hidden');
          updateNavUser(fresh);
          if (fresh.isAdmin) {
            document.getElementById('nav-admin-link').classList.remove('hidden');
            document.getElementById('mobile-admin-link').classList.remove('hidden');
          }
          renderDashboard();
          showSection(fresh.isAdmin ? 'adminbackend' : 'dashboard');
          return;
        }
      }
      switchTab('login');
    });
  });
})();

// =================== BACKGROUND AUDIO ===================
let bgMusicIsPlaying = false;

document.addEventListener('DOMContentLoaded', () => {
  const audio = document.getElementById('bg-audio');
  const volumeSlider = document.getElementById('bg-music-volume');
  if (audio && volumeSlider) {
    audio.volume = 0.5; // เล่นที่ 50%
    volumeSlider.value = 0.5;

    // พยายามให้เล่นทันทีด้วย promise
    audio.play().then(() => {
      bgMusicIsPlaying = true;
      const icon = document.getElementById('bg-music-icon');
      if (icon) icon.textContent = '🔊';
    }).catch(err => {
      console.warn("Autoplay blocked by browser. User must interact first.", err);
      // เบราว์เซอร์ยุคใหม่จะบล็อก หากผู้ใช้งานยังไม่ได้คลิกอะไรเลยในเว็บ จึงให้เล่นตอนคลิกแทน
      window.addEventListener('click', function initAudio() {
        if (audio.paused && !bgMusicIsPlaying) {
          audio.play().then(() => {
            bgMusicIsPlaying = true;
            const icon = document.getElementById('bg-music-icon');
            if (icon && audio.volume > 0) icon.textContent = '🔊';
          }).catch(e => console.log('Autoplay still prevented'));
        }
        window.removeEventListener('click', initAudio);
      }, { once: true });
    });
  }
});

function toggleBgMusic() {
  const audio = document.getElementById('bg-audio');
  const icon = document.getElementById('bg-music-icon');
  if (!audio) return;

  if (audio.paused) {
    audio.play().then(() => {
      bgMusicIsPlaying = true;
      icon.textContent = '🔊';
    }).catch(err => {
      console.warn("Autoplay prevented or error:", err);
      showToast('ไม่สามารถเล่นเสียงได้ กรุณากดอีกครั้ง', '⚠️');
    });
  } else {
    audio.pause();
    bgMusicIsPlaying = false;
    icon.textContent = '🔇';
  }
}

function changeBgVolume(val) {
  const audio = document.getElementById('bg-audio');
  const icon = document.getElementById('bg-music-icon');
  if (audio) {
    audio.volume = val;
    if (val > 0 && audio.paused && !bgMusicIsPlaying) {
      // Opt-in background play when setting volume
    }
    if (val == 0) {
      icon.textContent = '🔇';
    } else {
      icon.textContent = audio.paused ? '🔇' : '🔊';
    }
  }
}

// =================== TOKEN SHOP ===================

const REDEEM_KEY = 'edutoken_redeems';

const SHOP_ITEMS = [
  { id: 'grade_point_1', icon: 'P', name: '1 คะแนน', desc: 'แลก Token เพื่อรับคะแนน 1 คะแนน ผ่านการลงทะเบียนของครู', cost: 1000, category: 'grade', color: '#6C63FF', colorBg: 'rgba(108,99,255,0.15)', badge: 'คะแนน', limited: false },
  { id: 'grade_point_5', icon: 'G', name: '5 คะแนน', desc: 'แลกแพคเกจคะแนน 5 คะแนน ประหยัดกว่าซื้อทีละครั้ง', cost: 4500, category: 'grade', color: '#3EC6E0', colorBg: 'rgba(62,198,224,0.15)', badge: 'คะแนน', limited: false },
  { id: 'cafe_drink_1', icon: 'C', name: 'คูปองน้ำคาเฟ่ 1 แก้ว', desc: 'คูปองแลกเครื่องดื่มจากโรงอาหารของโรงเรียน 1 แก้ว (ทุกเมนู)', cost: 10000, category: 'coupon', color: '#FF8E53', colorBg: 'rgba(255,142,83,0.15)', badge: 'คูปอง', limited: true },
  { id: 'extra_time', icon: 'T', name: 'เวลาส่งงานเพิ่ม 1 วัน', desc: 'ขยายเวลาส่งงาน 1 วัน สำหรับงานที่กำหนดในขั้นตอนถัดไป', cost: 3000, category: 'privilege', color: '#00E676', colorBg: 'rgba(0,230,118,0.12)', badge: 'สิทธิพิเศษ', limited: false },
  { id: 'skip_hw', icon: 'H', name: 'ยกเว้นการบ้าน 1 ครั้ง', desc: 'ยกเว้นส่งการบ้าน 1 ครั้ง โดยไม่โดนหักคะแนน', cost: 5000, category: 'privilege', color: '#FFD740', colorBg: 'rgba(255,215,64,0.12)', badge: 'สิทธิพิเศษ', limited: false },
  { id: 'cafe_drink_month', icon: 'M', name: 'คูปองน้ำคาเฟ่ 1 เดือน', desc: 'คูปองแลกเครื่องดื่มรายเดือน 1 เดือน (4 แก้ว/เดือน)', cost: 35000, category: 'coupon', color: '#FF6B9D', colorBg: 'rgba(255,107,157,0.15)', badge: 'คูปอง', limited: true },
];

// Fix icons after declaration (emoji safe)
SHOP_ITEMS[0].icon = '\uD83D\uDCDD';
SHOP_ITEMS[1].icon = '\uD83C\uDF93';
SHOP_ITEMS[2].icon = '\u2615';
SHOP_ITEMS[3].icon = '\u23F0';
SHOP_ITEMS[4].icon = '\uD83D\uDCD6';
SHOP_ITEMS[5].icon = '\uD83E\uDDBB';

let pendingRedeemId = null;

function getRedeemStore() {
  try { return JSON.parse(localStorage.getItem(REDEEM_KEY)) || {}; } catch (e) { return {}; }
}
function saveRedeemStore(store) {
  try { localStorage.setItem(REDEEM_KEY, JSON.stringify(store)); } catch (e) { }
}
function getMyRedeems() {
  var me = getCurrentStudent();
  if (!me) return [];
  return (getRedeemStore()[me.id] || []);
}

// =================== ADMIN SHOP MANAGEMENT ===================
var CUSTOM_ITEMS_KEY = 'edutoken_custom_items';
function getCustomItems() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_ITEMS_KEY)) || []; } catch (e) { return []; }
}
function saveCustomItems(items) {
  try { localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items)); } catch (e) { }
  if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
    firebase.database().ref('shop_items').set(items).catch(function () { });
  }
}
function getAllShopItems() {
  var custom = getCustomItems();
  var result = SHOP_ITEMS.slice();
  custom.forEach(function (ci) {
    var idx = result.findIndex(function (i) { return i.id === ci.id; });
    if (idx !== -1) result[idx] = ci;
    else result.push(ci);
  });
  return result;
}

function renderAdminShopStats() {
  var store = getRedeemStore();
  var pending = 0, used = 0;
  Object.values(store).forEach(function (arr) {
    arr.forEach(function (r) {
      if (r.status === 'pending') pending++;
      else if (r.status === 'used') used++;
    });
  });
  var pe = document.getElementById('ab-pending-count');
  var ue = document.getElementById('ab-used-count');
  if (pe) pe.textContent = pending;
  if (ue) ue.textContent = used;
}

function switchAdminShopTab(tab) {
  document.getElementById('admin-shop-tab-redeem').style.display = tab === 'redeem' ? '' : 'none';
  document.getElementById('admin-shop-tab-items').style.display = tab === 'items' ? '' : 'none';
  document.getElementById('ast-btn-redeem').classList.toggle('active', tab === 'redeem');
  document.getElementById('ast-btn-items').classList.toggle('active', tab === 'items');
  if (tab === 'items') renderAdminItems();
  if (tab === 'redeem') renderAdminRedeems();
}

function renderAdminRedeems() {
  var container = document.getElementById('admin-redeem-list');
  if (!container) return;
  var store = getRedeemStore();
  var db = loadDB();
  var statusFilter = (document.getElementById('ar-status-filter') || {}).value || '';
  var search = ((document.getElementById('ar-search') || {}).value || '').toLowerCase();
  var rows = [];
  Object.entries(store).forEach(function (entry) {
    var studentId = entry[0], redeems = entry[1];
    var student = db.students.find(function (s) { return s.id === studentId; });
    if (!student) return;
    redeems.forEach(function (r, idx) {
      rows.push(Object.assign({}, r, { studentId: studentId, student: student, idx: idx }));
    });
  });
  if (statusFilter) rows = rows.filter(function (r) { return r.status === statusFilter; });
  if (search) rows = rows.filter(function (r) {
    return r.student.nickname.toLowerCase().includes(search) ||
      r.student.firstName.toLowerCase().includes(search) ||
      (r.itemName || '').toLowerCase().includes(search);
  });
  rows.sort(function (a, b) { return b.date - a.date; });
  if (rows.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:2rem"><span>\uD83D\uDCED</span>ไม่มีคำขอแลก</div>';
    return;
  }
  container.innerHTML = rows.map(function (r) {
    var d = new Date(r.date);
    var dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' +
      d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    var statusColor = r.status === 'used' ? '#00E676' : r.status === 'rejected' ? '#FF5252' : '#FFD740';
    var statusLabel = r.status === 'used' ? 'อนุมัติแล้ว' : r.status === 'rejected' ? 'ปฏิเสธ' : 'รอยืนยัน';
    var actions = '';
    if (r.status === 'pending') {
      actions = '<button class="ar-btn ar-approve" onclick="adminApproveRedeem(\'' + r.studentId + '\',' + r.idx + ')">อนุมัติ</button>'
        + '<button class="ar-btn ar-reject" onclick="adminRejectRedeem(\'' + r.studentId + '\',' + r.idx + ')">ปฏิเสธ</button>';
    } else if (r.status === 'rejected') {
      actions = '<button class="ar-btn ar-approve" onclick="adminApproveRedeem(\'' + r.studentId + '\',' + r.idx + ')">อนุมัติใหม่</button>';
    } else {
      actions = '<button class="ar-btn ar-reject" onclick="adminRejectRedeem(\'' + r.studentId + '\',' + r.idx + ')">ยกเลิก</button>';
    }
    return '<div class="ar-row">'
      + '<span class="ar-item-icon">' + (r.itemIcon || 'P') + '</span>'
      + '<div class="ar-info">'
      + '<p class="ar-item-name">' + r.itemName + '</p>'
      + '<p class="ar-student-name">' + r.student.nickname + ' (' + r.student.firstName + ' ' + r.student.lastName + ') - ' + r.student.room + '</p>'
      + '<p class="ar-date">' + dateStr + ' - -' + r.cost.toLocaleString() + ' Token</p>'
      + '</div>'
      + '<div class="ar-actions"><span class="ar-status" style="color:' + statusColor + '">' + statusLabel + '</span>' + actions + '</div>'
      + '</div>';
  }).join('');
}

function adminApproveRedeem(studentId, idx) {
  var store = getRedeemStore();
  if (!store[studentId] || store[studentId][idx] === undefined) return;
  store[studentId][idx].status = 'used';
  saveRedeemStore(store);
  if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
    firebase.database().ref('redeems/' + studentId).set(store[studentId]);
  }
  showToast('อนุมัติคำขอแลกสำเร็จ', '', 2500);
  renderAdminRedeems();
  renderAdminShopStats();
}

function adminRejectRedeem(studentId, idx) {
  var store = getRedeemStore();
  if (!store[studentId] || store[studentId][idx] === undefined) return;
  var r = store[studentId][idx];
  if (r.status === 'pending') {
    if (!confirm('ปฏิเสธคำขอแลก "' + r.itemName + '" และคืน ' + r.cost.toLocaleString() + ' Token ให้นักเรียนใช่ไหม?')) return;
    store[studentId][idx].status = 'rejected';
    saveRedeemStore(store);
    var db = loadDB();
    var s = db.students.find(function (x) { return x.id === studentId; });
    if (s) { s.tokens += r.cost; saveDB(db, s.id); }
    if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
      firebase.database().ref('redeems/' + studentId).set(store[studentId]);
    }
    showToast('ปฏิเสธและคืน ' + r.cost.toLocaleString() + ' Token แล้ว', '', 2500);
  } else {
    if (!confirm('ยกเลิกการอนุมัติ "' + r.itemName + '" ใช่ไหม?')) return;
    store[studentId][idx].status = 'rejected';
    saveRedeemStore(store);
    if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
      firebase.database().ref('redeems/' + studentId).set(store[studentId]);
    }
    showToast('ยกเลิกการอนุมัติแล้ว', '', 2500);
  }
  renderAdminRedeems();
  renderAdminShopStats();
}

function renderAdminItems() {
  var container = document.getElementById('admin-items-list');
  if (!container) return;
  container.innerHTML = getAllShopItems().map(function (item) {
    var isCustom = item.id.startsWith('custom_');
    return '<div class="admin-item-row" style="border-left:4px solid ' + item.color + '">'
      + '<span class="admin-item-icon">' + item.icon + '</span>'
      + '<div class="admin-item-info">'
      + '<p class="admin-item-name">' + item.name + '</p>'
      + '<p class="admin-item-meta"><span style="color:' + item.color + '">' + item.cost.toLocaleString() + ' Token</span> - ' + item.badge
      + (item.limited ? ' - <span style="color:#FFD740">จำกัด</span>' : '')
      + (isCustom ? ' - <span style="color:#a5b4fc;font-size:0.7rem">Custom</span>' : '') + '</p>'
      + '<p class="admin-item-desc">' + item.desc + '</p>'
      + '</div>'
      + '<div class="admin-item-actions">'
      + '<button class="ar-btn" style="background:rgba(108,99,255,0.3)" onclick="openEditItemModal(\'' + item.id + '\')">แก้ไข</button>'
      + (isCustom ? '<button class="ar-btn ar-reject" onclick="deleteCustomItem(\'' + item.id + '\')">ลบ</button>' : '')
      + '</div></div>';
  }).join('');
}

var editingItemId = null;
function openAddItemModal() {
  editingItemId = null;
  document.getElementById('item-modal-title').textContent = 'เพิ่มสินค้าใหม่';
  document.getElementById('if-icon').value = '';
  document.getElementById('if-name').value = '';
  document.getElementById('if-desc').value = '';
  document.getElementById('if-cost').value = '';
  document.getElementById('if-category').value = 'other';
  document.getElementById('if-color').value = '#6C63FF';
  document.getElementById('if-limited').checked = false;
  document.getElementById('item-modal-error').textContent = '';
  document.getElementById('item-modal-overlay').classList.remove('hidden');
}
function openEditItemModal(itemId) {
  var allItems = getAllShopItems();
  var item = allItems.find(function (i) { return i.id === itemId; });
  if (!item) return;
  editingItemId = itemId;
  document.getElementById('item-modal-title').textContent = 'แก้ไขสินค้า';
  document.getElementById('if-icon').value = item.icon;
  document.getElementById('if-name').value = item.name;
  document.getElementById('if-desc').value = item.desc;
  document.getElementById('if-cost').value = item.cost;
  document.getElementById('if-category').value = item.category || 'other';
  document.getElementById('if-color').value = item.color || '#6C63FF';
  document.getElementById('if-limited').checked = !!item.limited;
  document.getElementById('item-modal-error').textContent = '';
  document.getElementById('item-modal-overlay').classList.remove('hidden');
}
function closeItemModal(e) {
  if (!e || e.target === document.getElementById('item-modal-overlay')) {
    document.getElementById('item-modal-overlay').classList.add('hidden');
    editingItemId = null;
  }
}
function saveItemModal() {
  var icon = document.getElementById('if-icon').value.trim();
  var name = document.getElementById('if-name').value.trim();
  var desc = document.getElementById('if-desc').value.trim();
  var cost = parseInt(document.getElementById('if-cost').value);
  var category = document.getElementById('if-category').value;
  var color = document.getElementById('if-color').value;
  var limited = document.getElementById('if-limited').checked;
  var errEl = document.getElementById('item-modal-error');
  if (!icon) { errEl.textContent = 'กรุณาใส่ไอคอน'; return; }
  if (!name) { errEl.textContent = 'กรุณาใส่ชื่อสินค้า'; return; }
  if (!desc) { errEl.textContent = 'กรุณาใส่คำอธิบาย'; return; }
  if (!cost || cost < 1) { errEl.textContent = 'ราคา Token ต้องมากกว่า 0'; return; }
  var categoryBadge = { grade: 'คะแนน', coupon: 'คูปอง', privilege: 'สิทธิพิเศษ', other: 'อื่นๆ' };
  var colorBg = color + '22';
  var customs = getCustomItems();
  if (editingItemId) {
    var isCustom = editingItemId.startsWith('custom_');
    if (isCustom) {
      var ci = customs.findIndex(function (i) { return i.id === editingItemId; });
      if (ci !== -1) customs[ci] = Object.assign(customs[ci], { icon: icon, name: name, desc: desc, cost: cost, category: category, color: color, colorBg: colorBg, badge: categoryBadge[category] || 'อื่นๆ', limited: limited });
    } else {
      var baseItem = SHOP_ITEMS.find(function (i) { return i.id === editingItemId; });
      var overrideItem = Object.assign({}, baseItem || {}, { icon: icon, name: name, desc: desc, cost: cost, category: category, color: color, colorBg: colorBg, badge: categoryBadge[category] || 'อื่นๆ', limited: limited });
      var oi = customs.findIndex(function (i) { return i.id === editingItemId; });
      if (oi !== -1) customs[oi] = overrideItem;
      else customs.push(overrideItem);
      var di = SHOP_ITEMS.findIndex(function (i) { return i.id === editingItemId; });
      if (di !== -1) Object.assign(SHOP_ITEMS[di], overrideItem);
    }
    saveCustomItems(customs);
    showToast('แก้ไขสินค้าสำเร็จ', '', 2000);
  } else {
    var newItem = { id: 'custom_' + Date.now(), icon: icon, name: name, desc: desc, cost: cost, category: category, color: color, colorBg: colorBg, badge: categoryBadge[category] || 'อื่นๆ', limited: limited };
    customs.push(newItem);
    saveCustomItems(customs);
    showToast('เพิ่มสินค้าใหม่สำเร็จ', '', 2000);
  }
  document.getElementById('item-modal-overlay').classList.add('hidden');
  editingItemId = null;
  renderAdminItems();
  if (document.getElementById('section-shop').classList.contains('active')) renderShop();
}
function deleteCustomItem(itemId) {
  if (!confirm('ลบสินค้านี้ออกจากร้านใช่ไหม?')) return;
  var customs = getCustomItems().filter(function (i) { return i.id !== itemId; });
  saveCustomItems(customs);
  showToast('ลบสินค้าแล้ว', '', 2000);
  renderAdminItems();
  if (document.getElementById('section-shop').classList.contains('active')) renderShop();
}

// =================== RENDER SHOP ===================
function renderShop() {
  var me = getCurrentStudent();
  var grid = document.getElementById('shop-grid');
  if (!me || me.isAdmin) {
    if (grid) grid.innerHTML = '<div class="empty-state"><span>P</span>Admin ไม่มีระบบแลกสิทธิ์</div>';
    return;
  }
  var db = loadDB();
  var fresh = db.students.find(function (s) { return s.id === me.id; }) || me;
  document.getElementById('shop-my-tokens').textContent = fresh.tokens.toLocaleString();
  var myRedeems = getMyRedeems();
  grid.innerHTML = getAllShopItems().map(function (item) {
    var canAfford = fresh.tokens >= item.cost;
    var timesRedeemed = myRedeems.filter(function (r) { return r.itemId === item.id; }).length;
    var colorBg = item.colorBg || (item.color + '22');
    return '<div class="shop-card' + (canAfford ? '' : ' shop-card-locked') + '">'
      + '<div class="shop-card-badge" style="background:' + colorBg + ';color:' + item.color + ';border:1px solid ' + item.color + '44">' + item.badge + '</div>'
      + (item.limited ? '<div class="shop-card-limited">จำกัด</div>' : '')
      + '<div class="shop-card-icon" style="background:' + colorBg + ';border:2px solid ' + item.color + '44">' + item.icon + '</div>'
      + '<h3 class="shop-card-name">' + item.name + '</h3>'
      + '<p class="shop-card-desc">' + item.desc + '</p>'
      + '<div class="shop-card-cost" style="color:' + item.color + '"><span>Token</span><span>' + item.cost.toLocaleString() + ' Token</span></div>'
      + (timesRedeemed > 0 ? '<div class="shop-card-redeemed-count">แลกไปแล้ว ' + timesRedeemed + ' ครั้ง</div>' : '')
      + '<button class="shop-card-btn' + (canAfford ? '' : ' shop-card-btn-locked') + '" onclick="openRedeemModal(\'' + item.id + '\')" ' + (canAfford ? '' : 'disabled') + '>'
      + (canAfford ? 'แลกเลย' : 'Token ไม่พอ')
      + '</button></div>';
  }).join('');
}

function openRedeemModal(itemId) {
  var me = getCurrentStudent();
  if (!me) return;
  var db = loadDB();
  var fresh = db.students.find(function (s) { return s.id === me.id; }) || me;
  var item = getAllShopItems().find(function (i) { return i.id === itemId; });
  if (!item) return;
  pendingRedeemId = itemId;
  document.getElementById('redeem-modal-icon').textContent = item.icon;
  document.getElementById('redeem-modal-title').textContent = 'ยืนยันแลก: ' + item.name;
  document.getElementById('redeem-modal-desc').textContent = item.desc;
  document.getElementById('redeem-modal-cost').textContent = item.cost.toLocaleString() + ' Token';
  var after = fresh.tokens - item.cost;
  document.getElementById('redeem-modal-after').textContent = after.toLocaleString() + ' Token';
  document.getElementById('redeem-modal-after').style.color = after < 0 ? 'var(--danger)' : 'var(--success)';
  document.getElementById('redeem-modal-error').textContent = '';
  document.getElementById('redeem-btn-confirm').disabled = fresh.tokens < item.cost;
  if (fresh.tokens < item.cost) {
    document.getElementById('redeem-modal-error').textContent = 'Token ไม่พอ! มี ' + fresh.tokens.toLocaleString() + ' Token';
  }
  document.getElementById('redeem-modal-overlay').classList.remove('hidden');
}

function closeRedeemModal(e) {
  if (!e || e.target === document.getElementById('redeem-modal-overlay')) {
    document.getElementById('redeem-modal-overlay').classList.add('hidden');
    pendingRedeemId = null;
  }
}

function confirmRedeem() {
  if (!pendingRedeemId) return;
  var me = getCurrentStudent();
  var item = getAllShopItems().find(function (i) { return i.id === pendingRedeemId; });
  if (!me || !item) return;
  var db = loadDB();
  var s = db.students.find(function (x) { return x.id === me.id; });
  if (!s) return;
  if (s.tokens < item.cost) { showToast('Token ไม่พอ!', '', 2500); return; }
  s.tokens -= item.cost;
  saveDB(db, s.id);
  saveSession(s);
  var store = getRedeemStore();
  if (!store[me.id]) store[me.id] = [];
  store[me.id].push({ itemId: item.id, itemName: item.name, itemIcon: item.icon, cost: item.cost, date: Date.now(), status: 'pending' });
  saveRedeemStore(store);
  if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
    firebase.database().ref('redeems/' + me.id).set(store[me.id]);
  }
  document.getElementById('redeem-modal-overlay').classList.add('hidden');
  pendingRedeemId = null;
  showToast('แลกของรางวัลสำเร็จ! ครูจะตรวจสอบและยืนยัน', '', 4500);
  document.getElementById('nav-token-count').textContent = s.tokens.toLocaleString();
  renderShop();
  if (document.getElementById('section-dashboard').classList.contains('active')) renderDashboard();
  if (document.getElementById('section-profile').classList.contains('active')) renderProfile();
}

function showRedeemHistory() {
  var panel = document.getElementById('shop-history-panel');
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  var list = document.getElementById('shop-history-list');
  var redeems = getMyRedeems();
  if (redeems.length === 0) {
    list.innerHTML = '<div class="shp-empty">ยังไม่เคยแลกของรางวัลเลย</div>';
    return;
  }
  var sorted = redeems.slice().sort(function (a, b) { return b.date - a.date; });
  list.innerHTML = sorted.map(function (r) {
    var d = new Date(r.date);
    var dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    var timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    var statusColor = r.status === 'used' ? '#00E676' : '#FFD740';
    var statusText = r.status === 'used' ? 'ใช้แล้ว' : 'รอการยืนยัน';
    return '<div class="shp-row">'
      + '<span class="shp-item-icon">' + r.itemIcon + '</span>'
      + '<div class="shp-item-info">'
      + '<p class="shp-item-name">' + r.itemName + '</p>'
      + '<p class="shp-item-date">' + dateStr + ' ' + timeStr + '</p>'
      + '</div>'
      + '<div class="shp-right">'
      + '<p class="shp-item-cost">-' + r.cost.toLocaleString() + ' Token</p>'
      + '<span class="shp-status" style="color:' + statusColor + '">' + statusText + '</span>'
      + '</div></div>';
  }).join('');
}

function hideRedeemHistory() {
  document.getElementById('shop-history-panel').classList.add('hidden');
}

// =================== COMMUNITY CHAT ===================

var CHAT_ROOMS = {
  general: { name: 'ทั่วไป', icon: '#', desc: 'ห้องสนทนาทั่วไป' },
  study: { name: 'การเรียน', icon: '\uD83D\uDCDA', desc: 'แลกเปลี่ยนเกี่ยวกับการเรียน' },
  token: { name: 'Token & Shop', icon: '\uD83E\uDE99', desc: 'พูดคุยเรื่อง Token และของรางวัล' },
  game: { name: 'เกม', icon: '\uD83C\uDFAE', desc: 'คุยเรื่องเกมและสนุกสนาน' }
};
var currentChatRoom = 'general';
var chatListener = null;
var onlineListener = null;
var typingTimeout = null;
var emojiRowVisible = false;
var chatInitialized = false;

function updateChatAvatarMini() {
  var me = getCurrentStudent();
  if (!me) return;
  var avatarMini = document.getElementById('chat-avatar-mini');
  if (!avatarMini) return;
  var myAvatarUrl = getStudentAvatarUrl(me.id) || me.avatar || null;
  if (myAvatarUrl) {
    // ใช้ innerHTML แทน backgroundImage เพื่อรองรับ base64 URL ได้ดีกว่า
    avatarMini.innerHTML = '<img src="' + myAvatarUrl + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" />';
    avatarMini.style.backgroundImage = '';
    avatarMini.style.background = '';
  } else {
    avatarMini.innerHTML = '';
    avatarMini.style.backgroundImage = '';
    avatarMini.style.background = 'var(--primary)';
    avatarMini.textContent = (me.nickname || me.firstName || '?')[0].toUpperCase();
  }
}

function initChat() {
  var me = getCurrentStudent();
  if (!me) return;

  // อัพเดท avatar mini ทุกครั้งที่เข้า chat
  updateChatAvatarMini();

  // Admin sees clear button
  var clearBtn = document.getElementById('chat-clear-btn');
  if (clearBtn) clearBtn.style.display = me.isAdmin ? '' : 'none';

  // Set online presence
  if (USE_FIREBASE && typeof firebase !== 'undefined' && isFirebaseConfigured) {
    setOnlinePresence(me);
    if (!chatInitialized) {
      switchChatRoom(currentChatRoom);
      listenOnlineUsers();
      chatInitialized = true;
    }
  } else {
    document.getElementById('chat-messages').innerHTML =
      '<div class="chat-empty"><p>\uD83D\uDCE1 ต้องการ Firebase เพื่อใช้งาน Chat แบบ Real-time</p></div>';
  }
}

function destroyChatListeners() {
  if (!USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) return;
  if (chatListener) {
    firebase.database().ref('chat/' + currentChatRoom).off('value', chatListener);
    chatListener = null;
  }
  if (onlineListener) {
    firebase.database().ref('chat_online').off('value', onlineListener);
    onlineListener = null;
  }
  // Remove presence
  var me = getCurrentStudent();
  if (me) {
    firebase.database().ref('chat_online/' + me.id).remove();
  }
}

function setOnlinePresence(me) {
  if (!USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) return;
  var presenceRef = firebase.database().ref('chat_online/' + me.id);
  presenceRef.set({
    id: me.id,
    name: me.nickname || me.firstName,
    room: me.room,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  });
  presenceRef.onDisconnect().remove();
}

function listenOnlineUsers() {
  if (!USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) return;
  var ref = firebase.database().ref('chat_online');
  onlineListener = ref.on('value', function (snapshot) {
    var users = [];
    var val = snapshot.val();
    if (val) users = Object.values(val);
    var count = document.getElementById('chat-online-count');
    if (count) count.textContent = users.length;
    var list = document.getElementById('chat-online-list');
    if (!list) return;
    list.innerHTML = users.map(function (u) {
      return '<div class="chat-online-user">'
        + '<span class="cou-dot"></span>'
        + '<span class="cou-name">' + u.name + '</span>'
        + '<span class="cou-room">' + u.room + '</span>'
        + '</div>';
    }).join('') || '<p class="chat-online-empty">ไม่มีผู้ใช้ออนไลน์</p>';
  });
}

function switchChatRoom(roomKey) {
  var me = getCurrentStudent();
  if (!me) return;
  // Unsubscribe old listener
  if (chatListener) {
    firebase.database().ref('chat/' + currentChatRoom).off('value', chatListener);
    chatListener = null;
  }
  currentChatRoom = roomKey;

  // Update UI
  Object.keys(CHAT_ROOMS).forEach(function (key) {
    var btn = document.getElementById('room-btn-' + key);
    if (btn) btn.classList.toggle('active', key === roomKey);
  });
  var roomInfo = CHAT_ROOMS[roomKey];
  var iconEl = document.getElementById('chat-current-icon');
  var nameEl = document.getElementById('chat-current-room');
  var descEl = document.getElementById('chat-current-desc');
  if (iconEl) iconEl.textContent = roomInfo.icon;
  if (nameEl) nameEl.textContent = roomInfo.name;
  if (descEl) descEl.textContent = roomInfo.desc;

  // Show loading
  var msgs = document.getElementById('chat-messages');
  if (msgs) msgs.innerHTML = '<div class="chat-loading"><div class="chat-spinner"></div><p>\uD83D\uDD04 กำลังโหลด...</p></div>';

  // Listen for messages
  var ref = firebase.database().ref('chat/' + roomKey).orderByChild('timestamp').limitToLast(100);
  chatListener = ref.on('value', function (snapshot) {
    var messages = [];
    snapshot.forEach(function (child) {
      messages.push(Object.assign({ _key: child.key }, child.val()));
    });
    renderChatMessages(messages, me);
  });
}

function renderChatMessages(messages, me) {
  var container = document.getElementById('chat-messages');
  if (!container) return;
  if (messages.length === 0) {
    container.innerHTML = '<div class="chat-empty"><p>\uD83D\uDCAC ยังไม่มีข้อความในห้องนี้<br>เป็นคนแรกที่พูดคุย!</p></div>';
    return;
  }
  var prevDate = '';
  var html = messages.map(function (msg) {
    var isMe = msg.senderId === me.id;
    var isAdmin = msg.senderIsAdmin;
    var d = new Date(msg.timestamp);
    var dateStr = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    var timeStr = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    var dateSep = '';
    if (dateStr !== prevDate) {
      prevDate = dateStr;
      dateSep = '<div class="chat-date-sep"><span>' + dateStr + '</span></div>';
    }
    var avatarHtml = '';
    var latestAvatar = getStudentAvatarUrl(msg.senderId) || msg.senderAvatar;
    if (latestAvatar) {
      // ใช้ img tag แทน background-image เพื่อรองรับ base64 URL ยาวๆ ได้ดีกว่า
      avatarHtml = '<div class="chat-msg-avatar" style="padding:0;overflow:hidden"><img src="' + latestAvatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;" /></div>';
    } else {
      var initial = (msg.senderName || '?')[0].toUpperCase();
      var color = stringToColor(msg.senderId || '');
      avatarHtml = '<div class="chat-msg-avatar" style="background:' + color + '">' + initial + '</div>';
    }
    var canDelete = isMe || me.isAdmin;
    return dateSep + '<div class="chat-msg-wrap' + (isMe ? ' chat-msg-mine' : '') + '" id="chatmsg-' + msg._key + '">'
      + (isMe ? '' : avatarHtml)
      + '<div class="chat-msg-content">'
      + (isMe ? '' : '<div class="chat-msg-meta">'
        + '<span class="chat-msg-name' + (isAdmin ? ' chat-msg-admin' : '') + '">' + msg.senderName + (isAdmin ? ' \u2605Admin' : '') + '</span>'
        + '<span class="chat-msg-room-tag">' + msg.senderRoom + '</span>'
        + '</div>')
      + '<div class="chat-bubble' + (isMe ? ' bubble-mine' : ' bubble-other') + (isAdmin && !isMe ? ' bubble-admin' : '') + '">'
      + escapeHtml(msg.text)
      + (canDelete ? '<button class="chat-del-btn" onclick="deleteMessage(\'' + msg._key + '\')" title="\u0e25\u0e1a">\u00d7</button>' : '')
      + '</div>'
      + '<span class="chat-msg-time">' + timeStr + '</span>'
      + '</div>'
      + (isMe ? avatarHtml : '')
      + '</div>';
  }).join('');
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stringToColor(str) {
  var colors = ['#6C63FF', '#FF6B9D', '#00E676', '#FF8E53', '#3EC6E0', '#FFD740', '#FF5252', '#64B5F6', '#A5D6A7', '#CE93D8'];
  var hash = 0;
  for (var i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function sendChatMessage() {
  var me = getCurrentStudent();
  if (!me) return;
  if (!USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) {
    showToast('ต้องการ Firebase เพื่อส่งข้อความ', '', 2500);
    return;
  }
  var input = document.getElementById('chat-input');
  var text = (input.value || '').trim();
  if (!text) return;
  if (text.length > 300) { showToast('ข้อความยาวเกินไป (สูงสุด 300 ตัวอักษร)', '', 2500); return; }

  var msg = {
    senderId: me.id,
    senderName: me.nickname || me.firstName,
    senderRoom: me.room || '',
    senderIsAdmin: !!me.isAdmin,
    senderAvatar: getStudentAvatarUrl(me.id) || me.avatar || null,
    text: text,
    timestamp: firebase.database.ServerValue.TIMESTAMP
  };
  firebase.database().ref('chat/' + currentChatRoom).push(msg);
  input.value = '';
  document.getElementById('chat-char-count').textContent = '0/300';
  clearTypingIndicator(me);
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

function handleChatTyping() {
  var input = document.getElementById('chat-input');
  var len = (input.value || '').length;
  var countEl = document.getElementById('chat-char-count');
  if (countEl) {
    countEl.textContent = len + '/300';
    countEl.style.color = len > 250 ? 'var(--danger)' : '';
  }
  var me = getCurrentStudent();
  if (!me || !USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) return;
  firebase.database().ref('chat_typing/' + currentChatRoom + '/' + me.id).set({
    name: me.nickname || me.firstName,
    timestamp: Date.now()
  });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(function () { clearTypingIndicator(me); }, 2500);
}

function clearTypingIndicator(me) {
  if (!me || !USE_FIREBASE || typeof firebase === 'undefined' || !isFirebaseConfigured) return;
  firebase.database().ref('chat_typing/' + currentChatRoom + '/' + me.id).remove();
}

function deleteMessage(key) {
  if (!confirm('ลบข้อความนี้ใช่ไหม?')) return;
  firebase.database().ref('chat/' + currentChatRoom + '/' + key).remove();
}

function confirmClearChat() {
  var me = getCurrentStudent();
  if (!me || !me.isAdmin) return;
  if (!confirm('ล้างข้อความทั้งหมดในห้องนี้ใช่ไหม?')) return;
  firebase.database().ref('chat/' + currentChatRoom).remove();
  showToast('ล้าง Chat เรียบร้อยแล้ว', '', 2500);
}

function insertEmoji(emoji) {
  var input = document.getElementById('chat-input');
  if (!input) return;
  var pos = input.selectionStart || input.value.length;
  input.value = input.value.slice(0, pos) + emoji + input.value.slice(pos);
  input.focus();
  input.selectionStart = input.selectionEnd = pos + emoji.length;
  handleChatTyping();
}

function toggleEmojiRow() {
  var row = document.getElementById('chat-emoji-row');
  if (row) row.classList.toggle('open');
}

/* ================================================================
   QUIZ SYSTEM
   ================================================================ */

var quizState = {
  categories: {},       // { catId: {name, icon, desc, color} }
  questions: {},        // { qId: {catId, question, choices, correctIdx, explanation, token, image} }
  currentCatId: null,
  currentQuestions: [], // shuffled list for current session
  currentIdx: 0,
  answers: [],          // { qId, chosen, correct }
  sessionTokens: 0,
  editingQId: null,
  editingCatId: null,
  quizImageData: null,  // base64 for current modal
  quizChoices: [],      // [{text, correct}] while editing
};

// ─── Firebase real-time sync ───────────────────────────────────────────────
function initQuizSync() {
  var db = firebase.database();
  db.ref('quiz_categories').on('value', snap => {
    quizState.categories = snap.val() || {};
    if (document.getElementById('section-quiz') && document.getElementById('section-quiz').classList.contains('active')) {
      renderQuizHome();
    }
    if (document.getElementById('admin-quiz-panel')) {
      populateQuizCatSelects();
      renderAdminQuizCatList();
      updateAdminQuizStats();
    }
  });
  db.ref('quiz_questions').on('value', snap => {
    quizState.questions = snap.val() || {};
    if (document.getElementById('section-quiz') && document.getElementById('section-quiz').classList.contains('active')) {
      renderQuizHome();
    }
    if (document.getElementById('admin-quiz-panel')) {
      renderAdminQuizList();
      updateAdminQuizStats();
    }
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getQuizDoneKey() {
  var me = getCurrentStudent();
  return me ? 'quizDone_' + me.id : null;
}
function getQuizDoneData() {
  var key = getQuizDoneKey();
  if (!key) return {};
  try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
}
function saveQuizDone(qId, tokenEarned) {
  var key = getQuizDoneKey();
  if (!key) return;
  var data = getQuizDoneData();
  if (!data[qId]) {
    data[qId] = { ts: Date.now(), token: tokenEarned };
    localStorage.setItem(key, JSON.stringify(data));
  }
}
function getQuestionsForCat(catId) {
  return Object.entries(quizState.questions)
    .filter(([, q]) => q.catId === catId)
    .map(([id, q]) => ({ id, ...q }));
}
function shuffleArray(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function getAlphaLabel(i) { return String.fromCharCode(65 + i); }

// ─── Quiz Home: Category Grid ─────────────────────────────────────────────────
function renderQuizHome() {
  var grid = document.getElementById('quiz-category-grid');
  var nocat = document.getElementById('quiz-no-categories');
  var home = document.getElementById('quiz-home');
  var play = document.getElementById('quiz-play-area');
  var result = document.getElementById('quiz-result-area');
  if (!grid) return;

  home.classList.remove('hidden');
  play.classList.add('hidden');
  result.classList.add('hidden');

  // Update stats
  var done = getQuizDoneData();
  var doneCount = Object.keys(done).length;
  var totalToken = Object.values(done).reduce((s, d) => s + (d.token || 0), 0);
  var sd = document.getElementById('quiz-stat-done');
  var st = document.getElementById('quiz-stat-token');
  if (sd) sd.textContent = doneCount;
  if (st) st.textContent = totalToken;

  var cats = quizState.categories;
  var catIds = Object.keys(cats);

  if (catIds.length === 0) {
    grid.innerHTML = '';
    if (nocat) nocat.classList.remove('hidden');
    return;
  }
  if (nocat) nocat.classList.add('hidden');

  grid.innerHTML = catIds.map(catId => {
    var cat = cats[catId];
    var qs = getQuestionsForCat(catId);
    var doneCatQs = qs.filter(q => done[q.id]);
    var totalTok = qs.reduce((s, q) => s + (q.token || 10), 0);
    var color = cat.color || '#6C63FF';
    var allDone = qs.length > 0 && doneCatQs.length === qs.length;
    return `
      <div class="quiz-cat-card" style="--cat-color:${color}" onclick="startQuiz('${catId}')">
        <span class="quiz-cat-icon">${cat.icon || '📝'}</span>
        <div class="quiz-cat-name">${cat.name}</div>
        <div class="quiz-cat-desc">${cat.desc || ''}</div>
        <div class="quiz-cat-meta">
          <span class="quiz-cat-count">❓ ${qs.length} ข้อ</span>
          <span class="quiz-cat-token-badge">🪙 ${totalTok} Token</span>
          ${allDone ? '<span class="quiz-cat-done-badge">✅ ทำครบแล้ว</span>' : (doneCatQs.length > 0 ? `<span class="quiz-cat-done-badge">📖 ${doneCatQs.length}/${qs.length}</span>` : '')}
        </div>
        <button class="quiz-start-btn" style="background:${color}" onclick="event.stopPropagation();startQuiz('${catId}')">
          ${allDone ? '🔄 ทำซ้ำ' : '▶ เริ่มทำแบบทดสอบ'}
        </button>
      </div>`;
  }).join('');
}

// ─── Start Quiz ───────────────────────────────────────────────────────────────
function startQuiz(catId) {
  var qs = getQuestionsForCat(catId);
  if (qs.length === 0) { showToast('ยังไม่มีคำถามในหมวดนี้', '❌', 2000); return; }

  quizState.currentCatId = catId;
  quizState.currentQuestions = shuffleArray(qs);
  quizState.currentIdx = 0;
  quizState.answers = [];
  quizState.sessionTokens = 0;

  document.getElementById('quiz-home').classList.add('hidden');
  document.getElementById('quiz-result-area').classList.add('hidden');
  document.getElementById('quiz-play-area').classList.remove('hidden');

  renderQuizQuestion();
}

// ─── Render Question ──────────────────────────────────────────────────────────
function renderQuizQuestion() {
  var play = document.getElementById('quiz-play-area');
  if (!play) return;

  var qs = quizState.currentQuestions;
  var idx = quizState.currentIdx;
  var total = qs.length;
  var q = qs[idx];
  var cat = quizState.categories[quizState.currentCatId] || {};
  var progress = Math.round((idx / total) * 100);
  var choices = q.choices || [];
  var color = cat.color || '#6C63FF';
  var tokenBadge = `<span class="quiz-token-badge">🪙 +${q.token || 10}</span>`;

  play.innerHTML = `
    <div class="quiz-play-wrap">
      <div class="quiz-play-header">
        <button class="quiz-back-btn" onclick="confirmQuitQuiz()">← กลับ</button>
        <div class="quiz-play-title">${cat.icon || '📝'} ${cat.name || 'แบบทดสอบ'}</div>
        ${tokenBadge}
      </div>
      <div class="quiz-progress-bar-outer">
        <div class="quiz-progress-bar-inner" id="qpb" style="width:${progress}%"></div>
      </div>
      <div class="quiz-q-counter">ข้อที่ ${idx + 1} / ${total}</div>
      <div class="quiz-q-card" id="quiz-q-card">
        ${q.image ? `<img src="${q.image}" class="quiz-q-image" alt="โจทย์"/>` : ''}
        <div class="quiz-q-text">${q.question}</div>
        <div class="quiz-choices-list" id="quiz-choices">
          ${choices.map((ch, ci) => `
            <button class="quiz-choice-btn" id="choice-${ci}" onclick="selectQuizChoice(${ci}, ${q.correctIdx !== undefined ? q.correctIdx : -1}, '${q.id}', ${q.token || 10})">
              <span class="quiz-choice-label">${getAlphaLabel(ci)}</span>
              <span>${ch}</span>
            </button>
          `).join('')}
        </div>
        <div id="quiz-explanation" style="display:none"></div>
        <button class="quiz-next-btn hidden" id="quiz-next-btn" onclick="nextQuizQuestion()">
          ${idx + 1 < total ? 'ข้อถัดไป →' : '🏁 ดูผลลัพธ์'}
        </button>
      </div>
    </div>`;
}

// ─── Select Answer ────────────────────────────────────────────────────────────
function selectQuizChoice(chosen, correctIdx, qId, tokenVal) {
  var btns = document.querySelectorAll('.quiz-choice-btn');
  btns.forEach(b => b.disabled = true);

  var isCorrect = chosen === correctIdx;
  var q = quizState.currentQuestions[quizState.currentIdx];
  var settings = loadRewardSettings();

  // Visual feedback
  btns.forEach((b, i) => {
    b.classList.remove('selected');
    if (i === correctIdx) b.classList.add('correct');
    else if (i === chosen && !isCorrect) b.classList.add('wrong');
  });

  // Show explanation
  var expBox = document.getElementById('quiz-explanation');
  if (expBox) {
    var expText = q.explanation ? q.explanation : (isCorrect ? '✅ ถูกต้อง!' : `❌ ไม่ถูก คำตอบที่ถูกต้องคือ "${(q.choices || [])[correctIdx] || ''}"`);
    expBox.innerHTML = `<div class="quiz-explanation-box">${isCorrect ? '✅' : '❌'} ${expText}</div>`;
    expBox.style.display = 'block';
  }

  // Calculate token earned based on reward settings
  var earnedToken = 0;
  if (isCorrect) {
    var doneData = getQuizDoneData();
    var alreadyDone = !!doneData[qId]; // เคยทำข้อนี้แล้ว?
    if (alreadyDone) {
      // ทำซ้ำ: ได้ % ของ Token ปกติ
      var retryPct = settings.quiz.retryPct || 0;
      earnedToken = Math.round(tokenVal * retryPct / 100);
    } else {
      earnedToken = tokenVal;
    }
    quizState.sessionTokens += earnedToken;
    saveQuizDone(qId, earnedToken);
  } else {
    saveQuizDone(qId, 0);
  }

  // Record answer
  quizState.answers.push({ qId, chosen, correctIdx, isCorrect, token: earnedToken });

  var nextBtn = document.getElementById('quiz-next-btn');
  if (nextBtn) nextBtn.classList.remove('hidden');
}

// ─── Next Question ────────────────────────────────────────────────────────────
function nextQuizQuestion() {
  quizState.currentIdx++;
  if (quizState.currentIdx < quizState.currentQuestions.length) {
    renderQuizQuestion();
  } else {
    showQuizResult();
  }
}

// ─── Quiz Result ──────────────────────────────────────────────────────────────
function showQuizResult() {
  var play = document.getElementById('quiz-play-area');
  var result = document.getElementById('quiz-result-area');
  if (!play || !result) return;

  play.classList.add('hidden');
  result.classList.remove('hidden');

  var answers = quizState.answers;
  var correct = answers.filter(a => a.isCorrect).length;
  var total = answers.length;
  var earned = quizState.sessionTokens;
  var pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  var cat = quizState.categories[quizState.currentCatId] || {};
  var settings = loadRewardSettings();

  // คำนวณ firstBonus: ให้เฉพาะเมื่อนักเรียนเล่นหมวดนี้ครั้งแรก (ไม่มีข้อที่ทำเสร็จก่อน session นี้)
  var firstBonus = 0;
  var doneDataBefore = getQuizDoneData();
  var catQIds = getQuestionsForCat(quizState.currentCatId).map(q => q.id);
  var hadAnyCatQDoneBefore = catQIds.some(id => {
    // ข้อถูกทำก่อน session นี้หรือเปล่า? session นี้ตอบแล้วเพิ่งบันทึก
    // เช็คจาก answers ของ session นี้ - ถ้า qId ไม่มีใน session นี้ แต่มีใน doneData = เคยทำก่อน
    return !answers.find(a => a.qId === id) && !!doneDataBefore[id];
  });
  var isFirstTimeCategory = !hadAnyCatQDoneBefore;
  if (isFirstTimeCategory && earned > 0 && settings.quiz.firstBonus > 0) {
    firstBonus = settings.quiz.firstBonus;
    earned += firstBonus;
  }

  var emoji = pct >= 80 ? '🏆' : pct >= 60 ? '🎉' : pct >= 40 ? '😊' : '📚';
  var msg = pct >= 80 ? 'ยอดเยี่ยมมาก!' : pct >= 60 ? 'ทำได้ดี!' : pct >= 40 ? 'พยายามต่อไป!' : 'ต้องฝึกเพิ่มอีกหน่อย';

  var bonusHtml = firstBonus > 0 ? `<div class="quiz-token-earn" style="font-size:0.9rem;margin-top:4px;color:var(--warning)">🎉 โบนัสเล่นครั้งแรก +${firstBonus} Token!</div>` : '';

  result.innerHTML = `
    <div class="quiz-result-wrap">
      <div class="quiz-result-icon">${emoji}</div>
      <div class="quiz-result-title">${msg}</div>
      <div class="quiz-result-subtitle">${cat.name || 'แบบทดสอบ'} เสร็จสิ้น</div>
      <div class="quiz-result-stats">
        <div class="quiz-result-stat">
          <span>${correct}/${total}</span>
          <span>คำตอบถูก</span>
        </div>
        <div class="quiz-result-stat">
          <span style="color:var(--warning)">${pct}%</span>
          <span>คะแนน</span>
        </div>
        <div class="quiz-result-stat">
          <span style="color:var(--success)">+${earned}</span>
          <span>Token ที่ได้</span>
        </div>
      </div>
      ${earned > 0 ? `<div class="quiz-token-earn">🪙 ได้รับ ${earned} Token จากการทำแบบทดสอบ!</div>${bonusHtml}` : '<div class="quiz-token-earn" style="color:var(--text-muted);font-size:1rem">ลองทำใหม่เพื่อรับ Token!</div>'}
      <div class="quiz-result-btns">
        <button class="quiz-result-btn quiz-result-btn-secondary" onclick="renderQuizHome()">← กลับหน้าหลัก</button>
        <button class="quiz-result-btn quiz-result-btn-primary" onclick="startQuiz('${quizState.currentCatId}')">🔄 ลองทำซ้ำ</button>
      </div>
    </div>`;

  // Award tokens to Firebase
  if (earned > 0) {
    awardQuizTokens(earned);
  }
}

function confirmQuitQuiz() {
  if (quizState.answers.length === 0 || confirm('ออกจากแบบทดสอบ? ความคืบหน้าจะถูกบันทึก')) {
    document.getElementById('quiz-play-area').classList.add('hidden');
    renderQuizHome();
    document.getElementById('quiz-home').classList.remove('hidden');
  }
}

function awardQuizTokens(amount) {
  var me = getCurrentStudent();
  if (!me || me.isAdmin) return;
  // Update Firebase
  firebase.database().ref('students/' + me.id + '/tokens').transaction(cur => (cur || 0) + amount);
  // Update local DB (array-based)
  var db = loadDB();
  var s = db.students.find(x => x.id === me.id);
  if (s) {
    s.tokens = (s.tokens || 0) + amount;
    saveDB(db, me.id);
    updateNavUser(s);
    showToast(`ได้รับ ${amount} Token จาก Quiz! 🎉`, '🪙', 3000);
  }
}

// ─── ADMIN: Quiz Management ───────────────────────────────────────────────────

function updateAdminQuizStats() {
  var qCount = document.getElementById('ab-quiz-count');
  var cCount = document.getElementById('ab-quiz-cat-count');
  if (qCount) qCount.textContent = Object.keys(quizState.questions).length;
  if (cCount) cCount.textContent = Object.keys(quizState.categories).length;
}

function switchAdminQuizTab(tab) {
  document.getElementById('admin-quiz-tab-questions').style.display = tab === 'questions' ? '' : 'none';
  document.getElementById('admin-quiz-tab-categories').style.display = tab === 'categories' ? '' : 'none';
  document.getElementById('aqt-btn-questions').classList.toggle('active', tab === 'questions');
  document.getElementById('aqt-btn-categories').classList.toggle('active', tab === 'categories');
}

// ─── Admin: Question List ─────────────────────────────────────────────────────
function renderAdminQuizList() {
  var container = document.getElementById('admin-quiz-list');
  if (!container) return;
  var catFilter = (document.getElementById('aq-cat-filter') || {}).value || '';
  var search = ((document.getElementById('aq-q-search') || {}).value || '').toLowerCase();
  var qs = Object.entries(quizState.questions);

  if (catFilter) qs = qs.filter(([, q]) => q.catId === catFilter);
  if (search) qs = qs.filter(([, q]) => (q.question || '').toLowerCase().includes(search));

  if (qs.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)">📭 ยังไม่มีคำถาม</div>';
    return;
  }

  container.innerHTML = qs.map(([qId, q], i) => {
    var cat = quizState.categories[q.catId] || {};
    return `
      <div class="admin-quiz-q-row">
        <div class="admin-quiz-q-num">${i + 1}</div>
        <div class="admin-quiz-q-body">
          <div class="admin-quiz-q-text">${q.question}</div>
          <div class="admin-quiz-q-meta">
            <span>${(cat.icon || '❓')} ${cat.name || 'ไม่มีหมวด'}</span>
            <span>🪙 ${q.token || 10} Token</span>
            <span>📋 ${(q.choices || []).length} ตัวเลือก</span>
            ${q.image ? '<span>🖼️ มีรูป</span>' : ''}
          </div>
        </div>
        <div class="admin-quiz-q-actions">
          <button class="aqq-btn aqq-btn-edit" onclick="openQuizQuestionModal('${qId}')">✏️ แก้ไข</button>
          <button class="aqq-btn aqq-btn-del" onclick="deleteQuizQuestion('${qId}')">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

// ─── Admin: Category List ─────────────────────────────────────────────────────
function renderAdminQuizCatList() {
  var container = document.getElementById('admin-quiz-cat-list');
  if (!container) return;
  var cats = Object.entries(quizState.categories);

  if (cats.length === 0) {
    container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-muted)">📭 ยังไม่มีหมวดหมู่</div>';
    return;
  }

  container.innerHTML = cats.map(([catId, cat]) => {
    var qCount = getQuestionsForCat(catId).length;
    var color = cat.color || '#6C63FF';
    return `
      <div class="admin-quiz-cat-row">
        <div class="admin-quiz-cat-icon-box" style="background:${color}22;border:1px solid ${color}44">${cat.icon || '📝'}</div>
        <div class="admin-quiz-cat-info">
          <div class="admin-quiz-cat-name">${cat.name}</div>
          <div class="admin-quiz-cat-meta">${cat.desc || ''} · ❓ ${qCount} คำถาม</div>
        </div>
        <div class="admin-quiz-q-actions">
          <button class="aqq-btn aqq-btn-edit" onclick="openQuizCategoryModal('${catId}')">✏️ แก้ไข</button>
          <button class="aqq-btn aqq-btn-del" onclick="deleteQuizCategory('${catId}')">🗑️</button>
        </div>
      </div>`;
  }).join('');
}

function populateQuizCatSelects() {
  var selects = ['aq-cat-filter', 'qq-category'];
  selects.forEach(id => {
    var sel = document.getElementById(id);
    if (!sel) return;
    var val = sel.value;
    var placeholder = id === 'aq-cat-filter' ? '<option value="">ทุกหมวดหมู่</option>' : '<option value="">-- เลือกหมวดหมู่ --</option>';
    sel.innerHTML = placeholder + Object.entries(quizState.categories).map(([cid, cat]) =>
      `<option value="${cid}" ${val === cid ? 'selected' : ''}>${cat.icon || ''} ${cat.name}</option>`
    ).join('');
  });
}

// ─── Admin: Question Modal ────────────────────────────────────────────────────
function openQuizQuestionModal(qId) {
  quizState.editingQId = qId || null;
  quizState.quizImageData = null;
  quizState.quizChoices = [];

  populateQuizCatSelects();

  var overlay = document.getElementById('quiz-q-modal-overlay');
  var title = document.getElementById('quiz-q-modal-title');
  var err = document.getElementById('quiz-q-modal-error');
  if (err) err.textContent = '';

  if (qId && quizState.questions[qId]) {
    var q = quizState.questions[qId];
    title.textContent = '✏️ แก้ไขคำถาม';
    document.getElementById('qq-question').value = q.question || '';
    document.getElementById('qq-explanation').value = q.explanation || '';
    document.getElementById('qq-token').value = q.token || 10;
    document.getElementById('qq-category').value = q.catId || '';
    quizState.quizChoices = (q.choices || []).map((text, i) => ({ text, correct: i === q.correctIdx }));
    if (q.image) {
      quizState.quizImageData = q.image;
      setQuizImagePreview(q.image);
    } else {
      clearQuizImagePreview();
    }
  } else {
    title.textContent = '➕ เพิ่มคำถามใหม่';
    document.getElementById('qq-question').value = '';
    document.getElementById('qq-explanation').value = '';
    document.getElementById('qq-token').value = 10;
    quizState.quizChoices = [{ text: '', correct: true }, { text: '', correct: false }, { text: '', correct: false }, { text: '', correct: false }];
    clearQuizImagePreview();
  }

  renderQuizChoicesList();
  overlay.classList.remove('hidden');
}

function closeQuizQuestionModal(e) {
  if (e && e.target !== document.getElementById('quiz-q-modal-overlay')) return;
  document.getElementById('quiz-q-modal-overlay').classList.add('hidden');
}

function renderQuizChoicesList() {
  var container = document.getElementById('qq-choices-list');
  if (!container) return;
  container.innerHTML = quizState.quizChoices.map((ch, i) => `
    <div class="qq-choice-item ${ch.correct ? 'is-correct' : ''}" id="qqci-${i}">
      <input type="radio" class="qq-correct-radio" name="qq-correct" ${ch.correct ? 'checked' : ''}
        onchange="setQuizCorrect(${i})" title="ตั้งเป็นคำตอบที่ถูก"/>
      <input class="qq-choice-input" type="text" value="${ch.text.replace(/"/g, '&quot;')}"
        placeholder="ตัวเลือกที่ ${i + 1}..." oninput="updateQuizChoiceText(${i}, this.value)"/>
      <button class="qq-choice-del" onclick="removeQuizChoice(${i})" title="ลบ">✕</button>
    </div>`).join('');
}

function addQuizChoice() {
  if (quizState.quizChoices.length >= 6) return;
  quizState.quizChoices.push({ text: '', correct: false });
  renderQuizChoicesList();
}

function removeQuizChoice(idx) {
  if (quizState.quizChoices.length <= 2) return;
  quizState.quizChoices.splice(idx, 1);
  if (!quizState.quizChoices.some(c => c.correct)) quizState.quizChoices[0].correct = true;
  renderQuizChoicesList();
}

function setQuizCorrect(idx) {
  quizState.quizChoices.forEach((c, i) => c.correct = (i === idx));
  renderQuizChoicesList();
}

function updateQuizChoiceText(idx, val) {
  quizState.quizChoices[idx].text = val;
}

// ─── Image Upload ─────────────────────────────────────────────────────────────
function handleQuizImageUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showToast('ไฟล์รูปใหญ่เกิน 5MB', '❌', 2000); return; }
  var reader = new FileReader();
  reader.onload = function (e) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var maxW = 800, maxH = 600;
      var w = img.width, h = img.height;
      if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
      if (h > maxH) { w = Math.round(w * maxH / h); h = maxH; }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      quizState.quizImageData = dataUrl;
      setQuizImagePreview(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function setQuizImagePreview(dataUrl) {
  var zone = document.getElementById('quiz-img-zone');
  var preview = document.getElementById('quiz-img-preview');
  var txt = document.getElementById('quiz-img-zone-text');
  var rmBtn = document.getElementById('quiz-img-remove-btn');
  if (preview) { preview.src = dataUrl; preview.style.display = 'block'; }
  if (txt) txt.style.display = 'none';
  if (rmBtn) rmBtn.style.display = 'inline-flex';
}

function clearQuizImagePreview() {
  quizState.quizImageData = null;
  var preview = document.getElementById('quiz-img-preview');
  var txt = document.getElementById('quiz-img-zone-text');
  var rmBtn = document.getElementById('quiz-img-remove-btn');
  var input = document.getElementById('qq-img-input');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  if (txt) txt.style.display = '';
  if (rmBtn) rmBtn.style.display = 'none';
  if (input) input.value = '';
}

function removeQuizImage() { clearQuizImagePreview(); }

// ─── Save Question ────────────────────────────────────────────────────────────
function saveQuizQuestion() {
  var err = document.getElementById('quiz-q-modal-error');
  err.textContent = '';
  var catId = document.getElementById('qq-category').value.trim();
  var question = document.getElementById('qq-question').value.trim();
  var token = parseInt(document.getElementById('qq-token').value) || 10;
  var explanation = document.getElementById('qq-explanation').value.trim();

  if (!catId) { err.textContent = '⚠️ กรุณาเลือกหมวดหมู่'; return; }
  if (!question) { err.textContent = '⚠️ กรุณาพิมพ์คำถาม'; return; }

  // Sync latest choice texts from DOM inputs before saving
  document.querySelectorAll('.qq-choice-input').forEach((inp, i) => {
    if (quizState.quizChoices[i]) quizState.quizChoices[i].text = inp.value;
  });

  var choices = quizState.quizChoices;
  if (choices.length < 2) { err.textContent = '⚠️ ต้องมีตัวเลือกอย่างน้อย 2 ตัวเลือก'; return; }
  if (!choices.some(c => c.correct)) { err.textContent = '⚠️ กรุณาตั้งคำตอบที่ถูกต้อง'; return; }
  if (choices.some(c => !c.text.trim())) { err.textContent = '⚠️ กรุณาพิมพ์ตัวเลือกให้ครบ'; return; }

  var correctIdx = choices.findIndex(c => c.correct);
  var data = {
    catId, question, token, explanation,
    choices: choices.map(c => c.text.trim()),
    correctIdx,
    updatedAt: Date.now()
  };
  if (quizState.quizImageData) data.image = quizState.quizImageData;

  var db = firebase.database();
  var ref = quizState.editingQId
    ? db.ref('quiz_questions/' + quizState.editingQId)
    : db.ref('quiz_questions').push();

  ref.set(data).then(() => {
    showToast(quizState.editingQId ? 'แก้ไขคำถามเรียบร้อย' : 'เพิ่มคำถามเรียบร้อย', '✅', 2500);
    document.getElementById('quiz-q-modal-overlay').classList.add('hidden');
  }).catch(e => { err.textContent = '❌ ' + e.message; });
}

function deleteQuizQuestion(qId) {
  if (!confirm('ลบคำถามนี้ใช่ไหม?')) return;
  firebase.database().ref('quiz_questions/' + qId).remove()
    .then(() => showToast('ลบคำถามเรียบร้อย', '🗑️', 2000));
}

// ─── Category Modal ───────────────────────────────────────────────────────────
function openQuizCategoryModal(catId) {
  quizState.editingCatId = catId || null;
  var title = document.getElementById('quiz-cat-modal-title');
  var err = document.getElementById('quiz-cat-modal-error');
  if (err) err.textContent = '';

  if (catId && quizState.categories[catId]) {
    var cat = quizState.categories[catId];
    title.textContent = '✏️ แก้ไขหมวดหมู่';
    document.getElementById('qc-name').value = cat.name || '';
    document.getElementById('qc-icon').value = cat.icon || '';
    document.getElementById('qc-desc').value = cat.desc || '';
    document.getElementById('qc-color').value = cat.color || '#6C63FF';
  } else {
    title.textContent = '🗂️ เพิ่มหมวดหมู่';
    document.getElementById('qc-name').value = '';
    document.getElementById('qc-icon').value = '';
    document.getElementById('qc-desc').value = '';
    document.getElementById('qc-color').value = '#6C63FF';
  }
  document.getElementById('quiz-cat-modal-overlay').classList.remove('hidden');
}

function closeQuizCategoryModal(e) {
  if (e && e.target !== document.getElementById('quiz-cat-modal-overlay')) return;
  document.getElementById('quiz-cat-modal-overlay').classList.add('hidden');
}

function saveQuizCategory() {
  var err = document.getElementById('quiz-cat-modal-error');
  err.textContent = '';
  var name = document.getElementById('qc-name').value.trim();
  var icon = document.getElementById('qc-icon').value.trim() || '📝';
  var desc = document.getElementById('qc-desc').value.trim();
  var color = document.getElementById('qc-color').value || '#6C63FF';

  if (!name) { err.textContent = '⚠️ กรุณาพิมพ์ชื่อหมวดหมู่'; return; }

  var data = { name, icon, desc, color, updatedAt: Date.now() };
  var db = firebase.database();
  var ref = quizState.editingCatId
    ? db.ref('quiz_categories/' + quizState.editingCatId)
    : db.ref('quiz_categories').push();

  ref.set(data).then(() => {
    showToast(quizState.editingCatId ? 'แก้ไขหมวดหมู่เรียบร้อย' : 'เพิ่มหมวดหมู่เรียบร้อย', '✅', 2500);
    document.getElementById('quiz-cat-modal-overlay').classList.add('hidden');
  }).catch(e => { err.textContent = '❌ ' + e.message; });
}

function deleteQuizCategory(catId) {
  var qCount = getQuestionsForCat(catId).length;
  var msg = qCount > 0
    ? `หมวดนี้มีคำถาม ${qCount} ข้อ ถ้าลบหมวดจะลบคำถามในหมวดด้วย ยืนยันใช่ไหม?`
    : 'ลบหมวดหมู่นี้ใช่ไหม?';
  if (!confirm(msg)) return;
  var db = firebase.database();
  var promises = [db.ref('quiz_categories/' + catId).remove()];
  Object.entries(quizState.questions).forEach(([qId, q]) => {
    if (q.catId === catId) promises.push(db.ref('quiz_questions/' + qId).remove());
  });
  Promise.all(promises).then(() => showToast('ลบหมวดหมู่เรียบร้อย', '🗑️', 2000));
}

// ─── Init quiz sync when app starts ──────────────────────────────────────────
(function () {
  var origInit = window.onload;
  var _checkInit = setInterval(function () {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length) {
      clearInterval(_checkInit);
      initQuizSync();
    }
  }, 500);
})();

// ─── Initialize Animated Background Particles ─────────────────────────────────
function initParticles() {
  const container = document.getElementById('particles-container');
  if (!container) return;

  const particleCount = 35; // Adjust density
  const colors = ['#6C63FF', '#3EC6E0', '#FF6B9D', '#00E676', '#FFD740'];

  for (let i = 0; i < particleCount; i++) {
    const p = document.createElement('div');
    p.className = 'particle' + (Math.random() > 0.5 ? ' glow' : '');

    const size = Math.random() * 5 + 2; // 2px to 7px
    const color = colors[Math.floor(Math.random() * colors.length)];
    const left = Math.random() * 100;
    const duration = Math.random() * 15 + 15; // 15s to 30s
    const delay = Math.random() * -30; // Random negative delay to start immediately
    const wave = Math.random() > 0.5;

    p.style.width = size + 'px';
    p.style.height = size + 'px';
    p.style.backgroundColor = color;
    p.style.color = color; // For the glow box-shadow (currentColor)
    p.style.left = left + 'vw';
    p.style.animationName = wave ? 'floatWave' : 'float';
    p.style.animationDuration = duration + 's';
    p.style.animationDelay = delay + 's';

    container.appendChild(p);
  }
}

// Ensure particles are generated when DOM is ready
document.addEventListener('DOMContentLoaded', initParticles);

// =================== ASSIGNMENT SCORE SYSTEM ===================
let assignmentState = {
  published: false,
  columns: {},
  scores: {}
};

function initAssignmentSync() {
  if (!USE_FIREBASE || typeof firebase === 'undefined' || !firebase.database) return;
  const db = firebase.database();

  db.ref('assignments/config/published').on('value', snap => {
    assignmentState.published = snap.val() || false;
    updateAssignmentPublishBtn();
    if (document.getElementById('section-assignment').classList.contains('active')) renderStudentAssignment();
  });

  db.ref('assignments/columns').on('value', snap => {
    assignmentState.columns = snap.val() || {};
    if (document.getElementById('section-adminbackend').classList.contains('active')) renderAdminAssignmentTable();
    if (document.getElementById('section-assignment').classList.contains('active')) renderStudentAssignment();
  });

  db.ref('assignments/scores').on('value', snap => {
    assignmentState.scores = snap.val() || {};
    if (document.getElementById('section-adminbackend').classList.contains('active')) renderAdminAssignmentTable();
    if (document.getElementById('section-assignment').classList.contains('active')) renderStudentAssignment();
  });
}

function updateAssignmentPublishBtn() {
  const btn = document.getElementById('btn-publish-assignment');
  if (!btn) return;
  if (assignmentState.published) {
    btn.innerHTML = '✅ เปิดเผยแพร่คะแนนแล้ว';
    btn.style.background = 'var(--success)';
  } else {
    btn.innerHTML = '🔒 ปิดการเผยแพร่คะแนนอยู่';
    btn.style.background = 'var(--warning)';
  }
}

function togglePublishAssignment() {
  if (!USE_FIREBASE || typeof firebase === 'undefined') return;
  const newState = !assignmentState.published;
  if (!confirm(newState ? 'ต้องการ "เปิดเผยแพร่" ให้นักเรียนทั้งหมดเห็นคะแนนใช่ไหม?' : 'ต้องการ "ปิด" ไม่ให้นักเรียนเห็นคะแนนใช่ไหม?')) return;
  firebase.database().ref('assignments/config/published').set(newState)
    .then(() => showToast(newState ? 'เปิดการเผยแพร่คะแนนแล้ว' : 'ปิดการเผยแพร่คะแนนแล้ว', '✅', 2000))
    .catch(err => alert(err));
}

window.exportAssignmentToExcel = function () {
  const table = document.getElementById("admin-assignment-table");
  if (!table) return;

  const roomFilter = document.getElementById("admin-assign-room-filter");
  const roomName = roomFilter && roomFilter.value !== "all" ? roomFilter.value : "All_Rooms";
  const filename = `Assignment_Scores_${roomName}_${new Date().toISOString().slice(0, 10)}.csv`;

  let csvContent = "\uFEFF"; // UTF-8 BOM for Excel Excel Thai suppport

  const thead = table.querySelector("thead tr");
  let headers = [];
  if (thead) {
    const ths = thead.querySelectorAll("th");
    ths.forEach(th => {
      let temp = document.createElement("div");
      temp.innerHTML = th.innerHTML;
      const btns = temp.querySelectorAll("button");
      btns.forEach(b => b.remove());
      const inputs = temp.querySelectorAll("input");
      inputs.forEach(i => i.remove());
      let text = temp.innerText.trim().replace(/"/g, '""');
      headers.push(`"${text}"`);
    });
    csvContent += headers.join(",") + "\n";
  }

  const tbody = table.querySelector("tbody");
  if (tbody) {
    const rows = tbody.querySelectorAll("tr");
    rows.forEach(row => {
      let rowData = [];
      const tds = row.querySelectorAll("td");
      tds.forEach((td, colIndex) => {
        let text = "";
        const input = td.querySelector("input[type='number']");
        if (input) {
          text = input.value;
        } else {
          let temp = document.createElement("div");
          temp.innerHTML = td.innerHTML;
          // Clean out avatars/images if any
          text = temp.innerText.trim();
        }
        text = text.replace(/"/g, '""');
        rowData.push(`"${text}"`);
      });
      csvContent += rowData.join(",") + "\n";
    });
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// ── Admin Assignment Management ──
function openAssignmentColumnModal(colId = null) {
  document.getElementById('ac-name').value = '';
  document.getElementById('ac-max-score').value = '10';

  if (colId && assignmentState.columns[colId]) {
    document.getElementById('ac-name').value = assignmentState.columns[colId].name;
    document.getElementById('ac-max-score').value = assignmentState.columns[colId].maxScore;
  }

  document.getElementById('assignment-col-modal-error').textContent = '';
  document.getElementById('assignment-col-modal-title').textContent = colId ? '✏️ แก้ไขหัวข้องาน' : '📌 สร้างหัวข้องานใหม่';
  document.getElementById('assignment-col-modal-overlay').dataset.editId = colId || '';
  document.getElementById('assignment-col-modal-overlay').classList.remove('hidden');
}

function closeAssignmentColumnModal() {
  document.getElementById('assignment-col-modal-overlay').classList.add('hidden');
}

function saveAssignmentColumn() {
  const name = document.getElementById('ac-name').value.trim();
  const maxScore = parseInt(document.getElementById('ac-max-score').value) || 10;
  const err = document.getElementById('assignment-col-modal-error');

  if (!name) { err.textContent = 'กรุณาใส่ชื่อหัวข้องาน'; return; }
  if (maxScore <= 0) { err.textContent = 'คะแนนเต็มต้องมากกว่า 0'; return; }

  const editId = document.getElementById('assignment-col-modal-overlay').dataset.editId;
  const db = firebase.database();
  const ref = editId ? db.ref('assignments/columns/' + editId) : db.ref('assignments/columns').push();

  const data = { name, maxScore, updatedAt: Date.now() };
  if (!editId) data.createdAt = Date.now();

  ref.update(data).then(() => {
    closeAssignmentColumnModal();
    showToast(editId ? 'แก้ไขหัวข้องานเรียบร้อย' : 'เพิ่มหัวข้องานเรียบร้อย', '✅');
  }).catch(e => { err.textContent = e.message; });
}

function deleteAssignmentColumn(colId) {
  if (!confirm('ลบหัวข้องานนี้? (คะแนนของนักเรียนทุกคนในหัวข้อนี้จะถูกลบไปด้วย)')) return;
  const db = firebase.database();
  db.ref('assignments/columns/' + colId).remove();

  // Clear scores for this column
  if (assignmentState.scores) {
    Object.keys(assignmentState.scores).forEach(stuId => {
      db.ref(`assignments/scores/${stuId}/${colId}`).remove();
    });
  }
  showToast('ลบหัวข้องานสำเร็จ', '🗑️');
}

function renderAdminAssignmentTable() {
  const thead = document.getElementById('admin-assignment-thead-row');
  const tbody = document.getElementById('admin-assignment-tbody');
  if (!thead || !tbody) return;

  const cols = Object.entries(assignmentState.columns || {}).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));

  let thHtml = `<th style="text-align:left;position:sticky;left:0;background:var(--card-bg);z-index:2">ชื่อนักเรียน</th>
                <th style="width:80px;text-align:center">ห้อง</th>`;

  cols.forEach(([colId, colData]) => {
    thHtml += `<th style="text-align:center;min-width:120px">
      <div style="font-size:0.9rem;font-weight:bold">${colData.name}</div>
      <div style="font-size:0.75rem;color:var(--text-muted);margin-top:2px">(เต็ม ${colData.maxScore})</div>
      <div style="margin-top:6px;display:flex;justify-content:center;gap:8px">
         <button class="aqf-btn" onclick="openAssignmentColumnModal('${colId}')" style="padding:2px 6px;font-size:0.75rem;background:var(--primary)">✏️</button>
         <button class="aqf-btn" onclick="deleteAssignmentColumn('${colId}')" style="padding:2px 6px;font-size:0.75rem;background:var(--danger)">🗑️</button>
         <button class="aqf-btn" onclick="autoFillScoreForRoom('${colId}')" style="padding:2px 6px;font-size:0.75rem;background:#FFD740;color:#000" title="ลงคะแนนอัตโนมัติ">👇</button>
      </div>
    </th>`;
  });
  thead.innerHTML = thHtml;

  let students = loadDB().students || [];
  const roomFilter = document.getElementById('admin-assign-room-filter')?.value || '';
  if (roomFilter) {
    students = students.filter(s => s.room === roomFilter);
  }
  students.sort((a, b) => (a.room || '').localeCompare(b.room || '') || (a.firstName || '').localeCompare(b.firstName || ''));

  let trHtml = '';
  if (students.length === 0) {
    trHtml = `<tr><td colspan="${cols.length + 2}" style="text-align:center;color:var(--text-muted)">ไม่มีข้อมูลนักเรียน</td></tr>`;
  } else {
    students.forEach(s => {
      trHtml += `<tr>
        <td style="position:sticky;left:0;background:var(--card-bg);z-index:1;font-weight:500">
          ${s.firstName} ${s.lastName} ${s.nickname ? '(' + s.nickname + ')' : ''}
        </td>
        <td style="text-align:center;color:var(--text-muted)">${s.room || '-'}</td>`;

      cols.forEach(([colId, colData]) => {
        const score = (assignmentState.scores[s.id] && assignmentState.scores[s.id][colId]);
        const dispVal = score !== undefined ? score : '';
        trHtml += `<td style="text-align:center">
          <input type="number" class="aq-input" style="width:70px;text-align:center;padding:4px 6px" 
            value="${dispVal}" max="${colData.maxScore}" min="0" 
            onchange="updateStudentAssignmentScore('${s.id}', '${colId}', this.value)" placeholder="-" />
        </td>`;
      });
      trHtml += `</tr>`;
    });
  }
  tbody.innerHTML = trHtml;
}

function updateStudentAssignmentScore(studentId, colId, value) {
  const db = firebase.database();
  if (value === '') {
    db.ref(`assignments/scores/${studentId}/${colId}`).remove();
  } else {
    db.ref(`assignments/scores/${studentId}/${colId}`).set(Number(value));
  }
}

// ── Assignment Fill Auto Score ──
function autoFillScoreForRoom(colId) {
  const roomFilter = document.getElementById('admin-assign-room-filter')?.value || '';
  const colData = assignmentState.columns[colId];
  if (!colData) return;

  let scoreInput = prompt(`กรุณากรอกคะแนนที่จะให้แก่นักเรียน${roomFilter ? 'ห้อง ' + roomFilter : 'ทุกคน'} (คะแนนเต็ม ${colData.maxScore}):`, colData.maxScore);
  if (scoreInput === null) return;

  const targetScore = Number(scoreInput);
  if (isNaN(targetScore) || targetScore < 0 || targetScore > colData.maxScore) {
    alert('กรุณากรอกตัวเลขคะแนนให้ถูกต้อง (ไม่เกินคะแนนเต็ม)');
    return;
  }

  const msg = roomFilter
    ? `ยืนยันการให้คะแนน ${targetScore} งานนี้แก่นักเรียนห้อง ${roomFilter} ทุกคนใช่ไหม?`
    : `คุณไม่ได้เลือกห้อง ยืนยันการให้คะแนน ${targetScore} งานนี้แก่นักเรียน "ทั้งหมด" ทุกคนใช่ไหม?`;

  if (!confirm(msg)) return;

  const db = firebase.database();
  let students = loadDB().students || [];
  if (roomFilter) {
    students = students.filter(s => s.room === roomFilter);
  }

  if (students.length === 0) {
    alert('ไม่มีนักเรียนในกลุ่มที่เลือก');
    return;
  }

  const updates = {};
  students.forEach(s => {
    updates[`${s.id}/${colId}`] = targetScore;
  });

  db.ref('assignments/scores').update(updates).then(() => {
    showToast('อัปเดตคะแนนเสร็จสิ้น', '💯');
  }).catch(e => {
    alert('Error: ' + e.message);
  });
}

// ── Student Assignment View ──
function renderStudentAssignment() {
  const loading = document.getElementById('assign-loading');
  const freezeMsg = document.getElementById('assign-freeze-msg');
  const grid = document.getElementById('assign-scores-grid');

  if (loading) loading.classList.add('hidden');

  if (!assignmentState.published) {
    if (freezeMsg) freezeMsg.classList.remove('hidden');
    if (grid) grid.classList.add('hidden');
    return;
  }

  if (freezeMsg) freezeMsg.classList.add('hidden');
  if (grid) grid.classList.remove('hidden');

  const me = getCurrentStudent();
  if (!me) return;

  const cols = Object.entries(assignmentState.columns || {}).sort((a, b) => (a[1].createdAt || 0) - (b[1].createdAt || 0));
  let html = '';

  if (cols.length === 0) {
    grid.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;background:var(--card-bg);border-radius:12px">ยังไม่มีหัวข้องานที่ตรวจเสร็จ</div>';
    return;
  }

  let totalScore = 0;
  let totalMax = 0;

  cols.forEach(([colId, colData]) => {
    const score = (assignmentState.scores[me.id] && assignmentState.scores[me.id][colId]);
    const scoreText = score !== undefined ? score : '-';
    let colorClass = score !== undefined ? 'color:var(--primary)' : 'color:var(--text-muted)';

    if (score !== undefined) {
      totalScore += score;
      totalMax += colData.maxScore;
    }

    html += `
      <div style="display:flex;justify-content:space-between;align-items:center;background:var(--card-bg);padding:16px 20px;border-radius:12px;border:1px solid var(--border);transition:all 0.3s;" onmouseover="this.style.transform='translateX(5px)';this.style.borderColor='var(--primary)'" onmouseout="this.style.transform='none';this.style.borderColor='var(--border)'">
        <div>
          <h4 style="margin:0;font-size:1.1rem;color:var(--text)">${colData.name}</h4>
          <p style="margin:0;font-size:0.85rem;color:var(--text-muted);margin-top:4px">คะแนนเต็ม: ${colData.maxScore}</p>
        </div>
        <div style="font-size:1.6rem;font-weight:bold;${colorClass}">
          ${scoreText} <span style="font-size:1rem;color:var(--text-muted)">/ ${colData.maxScore}</span>
        </div>
      </div>
    `;
  });

  if (totalMax > 0) {
    const pcent = ((totalScore / totalMax) * 100).toFixed(1);
    html = `
      <div style="background:linear-gradient(135deg, #6C63FF, #3EC6E0);color:#fff;padding:20px;border-radius:12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 4px 15px rgba(108,99,255,0.3)">
        <div>
          <h3 style="margin:0;font-size:1.3rem">คะแนนรวมทั้งหมด</h3>
          <p style="margin:0;opacity:0.85;margin-top:5px;font-size:0.9rem">รวมจากทุกงานของคุณ</p>
        </div>
        <div style="text-align:right">
          <div style="font-size:2.2rem;font-weight:bold">${totalScore} <span style="font-size:1.2rem;opacity:0.85">/ ${totalMax}</span></div>
          <div style="font-size:1rem;opacity:0.9;font-weight:500;margin-top:2px">คิดเป็น ${pcent}%</div>
        </div>
      </div>
    ` + html;
  }

  grid.innerHTML = html;
}

// Call init for Assignment
(function () {
  const check = setInterval(() => {
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
      clearInterval(check);
      initAssignmentSync();
    }
  }, 600);
})();

// ── Admin Panel Switcher ──
function switchAdminPanel(panelType) {
  const panels = document.querySelectorAll('.admin-main-panel');
  panels.forEach(p => p.style.display = 'none');
  
  if (panelType === 'student-token') {
    document.getElementById('admin-panel-student-token').style.display = 'block';
  } else if (panelType === 'shop') {
    document.getElementById('admin-panel-shop').style.display = 'block';
  } else if (panelType === 'reward-setting') {
    document.getElementById('admin-panel-reward-setting').style.display = 'block';
  } else if (panelType === 'quiz') {
    document.getElementById('admin-panel-quiz').style.display = 'block';
  } else if (panelType === 'assignment') {
    document.getElementById('admin-panel-assignment').style.display = 'block';
  }
}
