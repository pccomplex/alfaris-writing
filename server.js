const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

const AUDIO_DIR = path.join(__dirname, 'audio');
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR);

const DATA_FILE = path.join(__dirname, 'data.json');

function loadData() {
  if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  return { progress: {}, words: [] };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Save letter progress
app.post('/api/progress', (req, res) => {
  const { letter, stars } = req.body;
  const data = loadData();
  if (!data.progress[letter] || stars > data.progress[letter]) {
    data.progress[letter] = stars;
  }
  saveData(data);
  res.json({ ok: true });
});

// Get all progress
app.get('/api/progress', (req, res) => {
  const data = loadData();
  res.json(data.progress);
});

// Get custom words
app.get('/api/words', (req, res) => {
  const data = loadData();
  res.json(data.words);
});

// Add custom word (mom)
app.post('/api/words', (req, res) => {
  const { word } = req.body;
  const data = loadData();
  if (word && !data.words.includes(word)) {
    data.words.push(word);
    saveData(data);
  }
  res.json(data.words);
});

// Delete word
app.delete('/api/words', (req, res) => {
  const { word } = req.body;
  const data = loadData();
  data.words = data.words.filter(w => w !== word);
  saveData(data);
  res.json(data.words);
});

// Upload recorded audio for a letter/word (base64)
app.post('/api/audio', (req, res) => {
  const { letter, audio } = req.body;
  if (!letter || !audio) return res.status(400).json({ error: 'missing data' });

  // Extract base64 data - handle various formats
  let base64Data, ext;
  const dataUrlMatch = audio.match(/^data:([^;]+);base64,(.+)$/);
  if (dataUrlMatch) {
    const mimeType = dataUrlMatch[1];
    base64Data = dataUrlMatch[2];
    ext = mimeType.includes('webm') ? 'webm' : mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'webm';
  } else {
    // Raw base64
    base64Data = audio;
    ext = 'webm';
  }

  const buffer = Buffer.from(base64Data, 'base64');
  const hex = Buffer.from(letter).toString('hex');

  // Remove old recordings for this letter
  if (fs.existsSync(AUDIO_DIR)) {
    fs.readdirSync(AUDIO_DIR).forEach(f => {
      if (f.startsWith(hex + '.')) fs.unlinkSync(path.join(AUDIO_DIR, f));
    });
  }

  const filePath = path.join(AUDIO_DIR, `${hex}.${ext}`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved audio for "${letter}" (${buffer.length} bytes) -> ${filePath}`);
  res.json({ ok: true });
});

// Serve recorded audio
app.get('/api/audio/:letter', (req, res) => {
  const letter = req.params.letter;
  const hex = Buffer.from(letter).toString('hex');

  // Find the file with any extension
  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.startsWith(hex + '.'));
  if (files.length > 0) {
    const filePath = path.join(AUDIO_DIR, files[0]);
    const ext = files[0].split('.').pop();
    const mimeTypes = { webm: 'audio/webm', ogg: 'audio/ogg', wav: 'audio/wav' };
    res.setHeader('Content-Type', mimeTypes[ext] || 'audio/webm');
    res.sendFile(filePath);
  } else {
    res.status(404).send('not found');
  }
});

const PORT = 3002;
app.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIP();
  console.log('\n========================================');
  console.log('  ✏️ كتابة الفارس - Alfaris Writing');
  console.log('========================================');
  console.log(`\n  http://localhost:${PORT}`);
  console.log(`  http://${ip}:${PORT}`);
  console.log('\n========================================\n');
});

function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return 'localhost';
}
