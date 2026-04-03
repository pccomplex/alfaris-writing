const LETTERS = ['ا','ب','ت','ث','ج','ح','خ','د','ذ','ر','ز','س','ش','ص','ض','ط','ظ','ع','غ','ف','ق','ك','ل','م','ن','ه','و','ي'];

let progress = {};
let currentItem = '';
let currentIndex = 0;
let currentMode = 'letters';
let words = [];
let drawing = false;
let paths = [];
let currentPath = [];

// ==========================================
// DATA - all stored in localStorage (no server)
// ==========================================
function loadProgress() {
  progress = JSON.parse(localStorage.getItem('faris_progress') || '{}');
}

function saveProgress(item, stars) {
  if (!progress[item] || stars > progress[item]) {
    progress[item] = stars;
    localStorage.setItem('faris_progress', JSON.stringify(progress));
  }
}

function loadWords() {
  words = JSON.parse(localStorage.getItem('faris_words') || '[]');
}

function saveWords() {
  localStorage.setItem('faris_words', JSON.stringify(words));
}

// ==========================================
// SCREENS
// ==========================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  if (id === 'letters-screen') renderLetters();
  if (id === 'words-screen') renderWords();
  if (id === 'practice-screen') initCanvas();
}

function goBack() {
  showScreen(currentMode === 'letters' ? 'letters-screen' : 'words-screen');
}

// ==========================================
// LETTERS GRID
// ==========================================
function renderLetters() {
  loadProgress();
  const grid = document.getElementById('letters-grid');
  grid.innerHTML = '';

  LETTERS.forEach((letter, i) => {
    const card = document.createElement('div');
    card.className = 'letter-card';
    const stars = progress[letter] || 0;
    const prevLetter = i > 0 ? LETTERS[i - 1] : null;
    const unlocked = i === 0 || (progress[prevLetter] && progress[prevLetter] > 0);

    if (!unlocked) {
      card.classList.add('locked');
      card.textContent = '🔒';
    } else {
      card.textContent = letter;
      const starsEl = document.createElement('div');
      starsEl.className = 'card-stars';
      starsEl.textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
      card.appendChild(starsEl);
      card.onclick = () => startPractice(letter, i, 'letters');
    }
    grid.appendChild(card);
  });
}

// ==========================================
// WORDS GRID
// ==========================================
function renderWords() {
  loadWords();
  const grid = document.getElementById('words-grid');
  grid.innerHTML = '';
  document.getElementById('no-words').style.display = words.length ? 'none' : 'block';

  words.forEach((word, i) => {
    const card = document.createElement('div');
    card.className = 'word-card';
    card.textContent = word;
    card.onclick = () => startPractice(word, i, 'words');
    grid.appendChild(card);
  });
}

// ==========================================
// PRACTICE
// ==========================================
function startPractice(item, index, mode) {
  currentItem = item;
  currentIndex = index;
  currentMode = mode;
  paths = [];
  currentPath = [];
  document.getElementById('current-display').textContent = item;
  const stars = progress[item] || 0;
  document.getElementById('practice-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  showScreen('practice-screen');
  drawGuide();
  playLetterSound();
}

function initCanvas() {
  const canvas = document.getElementById('trace-canvas');
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = Math.min(580, rect.width - 40);
  canvas.height = 300;
  canvas.onpointerdown = (e) => { drawing = true; currentPath = [{x:e.offsetX,y:e.offsetY}]; e.preventDefault(); };
  canvas.onpointermove = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const p = {x:e.offsetX,y:e.offsetY};
    currentPath.push(p);
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#e65100'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    if (currentPath.length > 1) {
      const prev = currentPath[currentPath.length-2];
      ctx.beginPath(); ctx.moveTo(prev.x,prev.y); ctx.lineTo(p.x,p.y); ctx.stroke();
    }
  };
  canvas.onpointerup = canvas.onpointerleave = () => {
    if (!drawing) return;
    drawing = false;
    if (currentPath.length > 1) paths.push([...currentPath]);
    currentPath = [];
  };
  drawGuide();
}

function drawGuide() {
  const canvas = document.getElementById('trace-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#e0e0e0'; ctx.lineWidth = 1; ctx.setLineDash([5,5]);
  ctx.beginPath(); ctx.moveTo(0, canvas.height/2); ctx.lineTo(canvas.width, canvas.height/2); ctx.stroke();
  ctx.setLineDash([]);
  const fontSize = currentItem.length > 1 ? Math.min(150, 400/currentItem.length) : 200;
  ctx.font = `${fontSize}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.strokeStyle = '#ddd'; ctx.lineWidth = 2; ctx.setLineDash([4,4]);
  ctx.strokeText(currentItem, canvas.width/2, canvas.height/2);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(230,81,0,0.06)';
  ctx.fillText(currentItem, canvas.width/2, canvas.height/2);
  ctx.strokeStyle = '#e65100'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  paths.forEach(path => {
    ctx.beginPath(); ctx.moveTo(path[0].x, path[0].y);
    for (let i=1;i<path.length;i++) ctx.lineTo(path[i].x, path[i].y);
    ctx.stroke();
  });
}

function clearCanvas() { paths = []; currentPath = []; drawGuide(); }

function checkTrace() {
  if (paths.length === 0) return;
  const canvas = document.getElementById('trace-canvas');
  const fontSize = currentItem.length > 1 ? Math.min(150, 400/currentItem.length) : 200;
  const ref = document.createElement('canvas');
  ref.width = canvas.width; ref.height = canvas.height;
  const rCtx = ref.getContext('2d');
  rCtx.font = `${fontSize}px Arial`; rCtx.textAlign = 'center'; rCtx.textBaseline = 'middle';
  rCtx.fillStyle = 'black'; rCtx.fillText(currentItem, ref.width/2, ref.height/2);
  const refData = rCtx.getImageData(0,0,ref.width,ref.height).data;
  let onTarget = 0, total = 0;
  paths.forEach(path => path.forEach(p => {
    const x = Math.round(p.x), y = Math.round(p.y);
    if (x>=0 && x<canvas.width && y>=0 && y<canvas.height) {
      total++; if (refData[(y*canvas.width+x)*4+3] > 50) onTarget++;
    }
  }));
  const accuracy = total > 0 ? (onTarget/total)*100 : 0;
  const usr = document.createElement('canvas');
  usr.width = canvas.width; usr.height = canvas.height;
  const uCtx = usr.getContext('2d');
  uCtx.strokeStyle = 'black'; uCtx.lineWidth = 8; uCtx.lineCap = 'round';
  paths.forEach(path => {
    uCtx.beginPath(); uCtx.moveTo(path[0].x,path[0].y);
    for(let i=1;i<path.length;i++) uCtx.lineTo(path[i].x,path[i].y);
    uCtx.stroke();
  });
  const usrData = uCtx.getImageData(0,0,canvas.width,canvas.height).data;
  let letterPx=0, coveredPx=0;
  for(let i=0;i<refData.length;i+=4) {
    if(refData[i+3]>50) { letterPx++; if(usrData[i+3]>50) coveredPx++; }
  }
  const coverage = letterPx > 0 ? (coveredPx/letterPx)*100 : 0;
  const score = accuracy*0.5 + coverage*0.5;
  let stars = 0;
  if (score >= 50) stars = 3;
  else if (score >= 30) stars = 2;
  else if (score >= 15) stars = 1;
  saveProgress(currentItem, stars);
  showResult(stars);
}

// ==========================================
// RESULTS & SOUNDS
// ==========================================
function showResult(stars) {
  const msgs = ['حاول مرة ثانية 😊', 'جيد فارس! 💪', 'شاطر فارس! 👏', 'شاطر فارس! 🎉'];
  document.getElementById('result-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3-stars);
  document.getElementById('result-msg').textContent = msgs[stars];
  document.getElementById('next-btn').style.display = stars > 0 ? 'inline-block' : 'none';
  showScreen('result-screen');
  if (stars >= 2) {
    playApplause();
    speakPraise();
  }
}

function retryPractice() { paths = []; showScreen('practice-screen'); drawGuide(); }

function nextPractice() {
  if (currentMode === 'letters') {
    if (currentIndex < LETTERS.length - 1) startPractice(LETTERS[currentIndex+1], currentIndex+1, 'letters');
    else showScreen('letters-screen');
  } else {
    if (currentIndex < words.length - 1) startPractice(words[currentIndex+1], currentIndex+1, 'words');
    else showScreen('words-screen');
  }
}

function playApplause() {
  const data = localStorage.getItem('audio___applause');
  if (data) new Audio(data).play();
}

function speakPraise() {
  setTimeout(() => {
    const data = localStorage.getItem('audio___praise');
    if (data) new Audio(data).play();
  }, 500);
}

function playLetterSound() {
  const data = localStorage.getItem('audio_' + currentItem);
  if (data) {
    new Audio(data).play();
  } else {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440; osc.type = 'sine';
      gain.gain.value = 0.3;
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(); osc.stop(ctx.currentTime + 0.2);
    } catch(e) {}
  }
}

// ==========================================
// MOM'S PAGE
// ==========================================
function checkMomPin() {
  const pin = document.getElementById('mom-pin').value;
  if (pin === '1234') {
    document.getElementById('mom-pin-area').style.display = 'none';
    const content = document.getElementById('mom-content');
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.alignItems = 'center';
    content.style.gap = '10px';
    renderMomWords();
    populateRecordSelect();
  } else {
    alert('الرقم غلط');
  }
}

function addWord() {
  const input = document.getElementById('new-word');
  const word = input.value.trim();
  if (!word) return;
  loadWords();
  if (!words.includes(word)) { words.push(word); saveWords(); }
  input.value = '';
  renderMomWords();
  populateRecordSelect();
}

function renderMomWords() {
  loadWords();
  const list = document.getElementById('mom-words-list');
  list.innerHTML = '';
  words.forEach(word => {
    const el = document.createElement('div');
    el.className = 'mom-word';
    el.textContent = `${word} ❌`;
    el.onclick = () => {
      words = words.filter(w => w !== word);
      saveWords();
      renderMomWords();
      populateRecordSelect();
    };
    list.appendChild(el);
  });
}

function populateRecordSelect() {
  const select = document.getElementById('record-letter');
  select.innerHTML = '';
  [{ value: '__applause', label: '👏 تصفيق' }, { value: '__praise', label: '🎉 شاطر فارس' }]
    .forEach(s => { const o = document.createElement('option'); o.value = s.value; o.textContent = s.label; select.appendChild(o); });
  const sep = document.createElement('option'); sep.disabled = true; sep.textContent = '── الحروف ──'; select.appendChild(sep);
  LETTERS.forEach(l => { const o = document.createElement('option'); o.value = l; o.textContent = l; select.appendChild(o); });
  if (words.length > 0) {
    const sep2 = document.createElement('option'); sep2.disabled = true; sep2.textContent = '── الكلمات ──'; select.appendChild(sep2);
    words.forEach(w => { const o = document.createElement('option'); o.value = w; o.textContent = w; select.appendChild(o); });
  }
}

// ==========================================
// RECORDING
// ==========================================
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

function toggleRecording() {
  const btn = document.getElementById('record-btn');
  const status = document.getElementById('record-status');

  if (!isRecording) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      recordedChunks = [];

      // iOS Safari doesn't support webm - use mp4 or wav
      let options = {};
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }
      // If none supported, use default (Safari will pick its own format)

      mediaRecorder = Object.keys(options).length > 0
        ? new MediaRecorder(stream, options)
        : new MediaRecorder(stream);
      mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/mp4' });
        const letter = document.getElementById('record-letter').value;
        const reader = new FileReader();
        reader.onloadend = () => {
          localStorage.setItem('audio_' + letter, reader.result);
          status.textContent = `✅ تم تسجيل: ${letter} (${Math.round(blob.size/1024)} KB)`;
          new Audio(reader.result).play();
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorder.start(100);
      isRecording = true;
      btn.textContent = '⏹️ إيقاف';
      btn.style.background = '#43a047';
      status.textContent = '🔴 جاري التسجيل...';
    }).catch(() => { status.textContent = 'لا يمكن الوصول للميكروفون'; });
  } else {
    mediaRecorder.stop();
    isRecording = false;
    btn.textContent = '🎙️ تسجيل';
    btn.style.background = '#e53935';
  }
}

function playRecorded() {
  const letter = document.getElementById('record-letter').value;
  const data = localStorage.getItem('audio_' + letter);
  if (data) new Audio(data).play();
  else document.getElementById('record-status').textContent = `لم يتم تسجيل: ${letter}`;
}

function clearRecordings() {
  const pin = prompt('أدخلي الرقم السري');
  if (pin !== '1234') { alert('الرقم غلط'); return; }
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith('audio_')) keys.push(key);
  }
  keys.forEach(k => localStorage.removeItem(k));
  document.getElementById('record-status').textContent = `✅ تم مسح ${keys.length} تسجيل`;
}

// Init
loadProgress();

// iOS audio unlock - Safari requires user gesture to play audio
let audioUnlocked = false;
document.addEventListener('touchstart', function unlockAudio() {
  if (audioUnlocked) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const buf = ctx.createBuffer(1, 1, 22050);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
  audioUnlocked = true;
}, { once: false });
