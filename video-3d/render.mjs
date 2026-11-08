// Usage: node render.mjs <spec.json> <sortie.mp4> [--from s] [--to s] [--noaudio]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import ffmpegStatic from "ffmpeg-static";
const ffmpegPath = (ffmpegStatic && fs.existsSync(ffmpegStatic)) ? ffmpegStatic : "ffmpeg";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const specPath = args[0], outPath = args[1];
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const noAudio = args.includes('--noaudio');
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const fps = spec.fps || 30;
const from = Math.round(parseFloat(opt('--from', 0)) * fps);
const to = Math.round(parseFloat(opt('--to', spec.duration)) * fps);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': mime[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

// Dans le cloud, cdn.playwright.dev est bloque: on utilise le Chromium deja installe (/opt/pw-browsers).
function findInstalledChrome() {
  const base = process.env.PW_BROWSERS_DIR || '/opt/pw-browsers';
  if (!fs.existsSync(base)) return undefined;
  for (const d of fs.readdirSync(base).sort().reverse()) {
    for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-linux/headless_shell']) {
      const p = path.join(base, d, rel);
      if (fs.existsSync(p)) return p;
    }
  }
  return undefined;
}
let executablePath;
try { if (!fs.existsSync(chromium.executablePath())) executablePath = findInstalledChrome(); } catch { executablePath = findInstalledChrome(); }
const browser = await chromium.launch({ executablePath, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('PAGEERROR', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE', m.text()); });
await page.goto(`http://localhost:${port}/engine/index.html`);
await page.waitForFunction('window.__ready === true', null, { timeout: 60000 });
await page.evaluate((s) => window.loadSpec(s), spec);

// apercu: node render.mjs spec.json prefix --frames 3,15,27  -> out/prefix_<t>.png (aucune video)
const framesOpt = opt('--frames', null);
if (framesOpt) {
  fs.mkdirSync(path.join(ROOT, 'out'), { recursive: true });
  for (const sec of framesOpt.split(',').map(Number)) {
    await page.evaluate((k) => window.renderFrame(k), Math.round(sec * fps));
    await page.screenshot({ path: path.join(ROOT, 'out', `${path.basename(outPath, '.mp4')}_${sec}.png`) });
    console.log('frame', sec);
  }
  await browser.close(); server.close(); process.exit(0);
}

// audio
let wavPath = null;
if (!noAudio) {
  const [L, R] = await page.evaluate(() => window.renderAudio(44100));
  const n = L.length, buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(44100, 24); buf.writeUInt32LE(44100 * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) { buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(L[i] * 32767))), 44 + i * 4); buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(R[i] * 32767))), 46 + i * 4); }
  wavPath = path.join(ROOT, 'out', 'music_tmp.wav'); fs.mkdirSync(path.dirname(wavPath), { recursive: true }); fs.writeFileSync(wavPath, buf);
}

const narrPath = opt('--narration', null);
const ff = ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-'];
if (wavPath) ff.push('-ss', String(from / fps), '-i', wavPath);
if (wavPath && narrPath) ff.push('-ss', String(from / fps), '-i', narrPath);
ff.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium', '-r', String(fps));
if (wavPath && narrPath) ff.push('-filter_complex', '[1:a]volume=0.32[m];[2:a]volume=1.25[n];[m][n]amix=inputs=2:duration=first:normalize=0[a]', '-map', '0:v', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-shortest');
else if (wavPath) ff.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
ff.push('-movflags', '+faststart', outPath);
const enc = spawn(ffmpegPath, ff, { stdio: ['pipe', 'inherit', 'inherit'] });

const t0 = Date.now();
for (let i = from; i < to; i++) {
  await page.evaluate((k) => window.renderFrame(k), i);
  const jpg = await page.screenshot({ type: 'jpeg', quality: 95 });
  if (!enc.stdin.write(jpg)) await new Promise(r => enc.stdin.once('drain', r));
  if ((i - from) % 30 === 0) console.log(`frame ${i - from}/${to - from}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}
enc.stdin.end();
await new Promise(r => enc.on('close', r));
await browser.close(); server.close();
console.log('OK', outPath, ((Date.now() - t0) / 1000).toFixed(0) + 's');
