/**
 * Neon Pong × TikTok Live — Production Server
 * Hosted on Railway | PM2 auto-restart | dotenv config
 */

require('dotenv').config();

const { WebcastPushConnection } = require('tiktok-live-connector');
const { WebSocketServer }        = require('ws');
const http                       = require('http');
const fs                         = require('fs');
const path                       = require('path');

const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || '@yourusername';
const PORT            = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV        = process.env.NODE_ENV || 'development';
const isProd          = NODE_ENV === 'production';

const log = (...a) => console.log(`[${new Date().toISOString()}]`, ...a);
const err = (...a) => console.error(`[${new Date().toISOString()}] ERR`, ...a);

log('🎮  Neon Pong Production Server');
log('    TikTok :', TIKTOK_USERNAME, '| Port:', PORT, '| Env:', NODE_ENV);

// ── HTTP ──────────────────────────────────────────────────────────────
const httpServer = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status:'ok', tiktok:TIKTOK_USERNAME, uptime:Math.floor(process.uptime()), clients:clients.size }));
    return;
  }
  const staticFiles = {
    '/':             { file:'index.html',    type:'text/html' },
    '/index.html':   { file:'index.html',    type:'text/html' },
    '/manifest.json':{ file:'manifest.json', type:'application/manifest+json' },
    '/sw.js':        { file:'sw.js',         type:'application/javascript' },
    '/icon-192.png': { file:'icon-192.png',  type:'image/png' },
    '/icon-512.png': { file:'icon-512.png',  type:'image/png' },
  };
  const sf = staticFiles[req.url];
  if (sf) {
    fs.readFile(path.join(__dirname, sf.file), (e, data) => {
      if (e) { res.writeHead(404); res.end('Not found'); return; }
      const cache = sf.file==='sw.js' ? 'no-cache' : sf.file.endsWith('.png') ? 'public,max-age=86400' : 'no-cache';
      res.writeHead(200, { 'Content-Type': sf.type, 'Cache-Control': cache });
      res.end(data);
    });
    return;
  }
  res.writeHead(404); res.end('Not found');
});

// ── WebSocket ─────────────────────────────────────────────────────────
const wss = new WebSocketServer({ server: httpServer });
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  log(`✅  Client connected (${clients.size} total)`);
  ws.send(JSON.stringify({ event:'server_info', tiktok:TIKTOK_USERNAME }));
  ws.on('close', () => { clients.delete(ws); log(`❌  Client left (${clients.size} remaining)`); });
  ws.on('error', e => err('WS client:', e.message));
});

function broadcast(event, data = {}) {
  const msg = JSON.stringify({ event, ...data, ts: Date.now() });
  clients.forEach(ws => { if (ws.readyState === 1) ws.send(msg); });
  log(`📡  [${event}]`, isProd ? `→ ${clients.size} clients` : JSON.stringify(data));
}

function classifyGift(coins) {
  if (coins >= 5000) return 'mega';
  if (coins >= 1000) return 'big';
  if (coins >=  100) return 'medium';
  return 'small';
}

// ── TikTok with exponential backoff reconnect ─────────────────────────
let tiktok = null, reconnectTimer = null, retryCount = 0;

function createTikTok() {
  tiktok = new WebcastPushConnection(TIKTOK_USERNAME, {
    processInitialData: false,
    enableExtendedGiftInfo: true,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 2000,
    clientParams: { app_language: 'en-US', device_platform: 'web' },
  });

  tiktok.on('gift', data => {
    if (data.giftType === 1 && !data.repeatEnd) return;
    const coins = (data.diamondCount || data.giftValue || 1) * (data.repeatCount || 1);
    const tier  = classifyGift(coins);
    log(`🎁  ${data.uniqueId} → ${data.giftName} x${data.repeatCount||1} = ${coins} [${tier}]`);
    broadcast('gift', { sender:data.uniqueId||'someone', giftName:data.giftName||'Gift', giftCount:data.repeatCount||1, coins, tier, avatarUrl:data.profilePictureUrl||null });
  });

  tiktok.on('like',   data => broadcast('like',    { sender:data.uniqueId||'someone', likeCount:data.likeCount||1,  avatarUrl:data.profilePictureUrl||null }));
  tiktok.on('chat',   data => broadcast('comment', { sender:data.uniqueId||'someone', comment:data.comment||'',     avatarUrl:data.profilePictureUrl||null }));
  tiktok.on('follow', data => broadcast('follow',  { sender:data.uniqueId||'someone', avatarUrl:data.profilePictureUrl||null }));
  tiktok.on('share',  data => broadcast('share',   { sender:data.uniqueId||'someone', avatarUrl:data.profilePictureUrl||null }));
  tiktok.on('member', data => broadcast('viewer',  { sender:data.uniqueId||'someone', avatarUrl:data.profilePictureUrl||null }));

  tiktok.on('connected', state => {
    retryCount = 0;
    log(`🔴  LIVE — Room ${state.roomId} | ${state.viewerCount} viewers`);
    broadcast('connected', { username:TIKTOK_USERNAME, viewers:state.viewerCount });
  });

  tiktok.on('disconnected', () => { log('⚠️  TikTok disconnected'); broadcast('disconnected', {}); scheduleReconnect(); });
  tiktok.on('error', e => err('TikTok:', e.message || e));
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  retryCount++;
  const delay = Math.min(3000 * Math.pow(1.5, Math.min(retryCount - 1, 8)), 60000);
  log(`🔄  Retry #${retryCount} in ${Math.round(delay/1000)}s`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    createTikTok();
    tiktok.connect().then(() => log('✅  Reconnected')).catch(e => { err('Reconnect fail:', e.message); scheduleReconnect(); });
  }, delay);
}

// ── Start ─────────────────────────────────────────────────────────────
httpServer.listen(PORT, '0.0.0.0', () => {
  log(`🌐  Listening on 0.0.0.0:${PORT}`);
  log(`    Health: http://localhost:${PORT}/health\n`);
  createTikTok();
  tiktok.connect().then(() => log('TikTok connected.')).catch(e => { err('Initial connect:', e.message); scheduleReconnect(); });
});

// ── Graceful shutdown ─────────────────────────────────────────────────
function shutdown(sig) {
  log(`🛑  ${sig} — shutting down`);
  broadcast('disconnected', {});
  if (reconnectTimer) clearTimeout(reconnectTimer);
  try { if (tiktok) tiktok.disconnect(); } catch (_) {}
  wss.close(() => httpServer.close(() => { log('✅  Clean exit'); process.exit(0); }));
  setTimeout(() => process.exit(1), 8000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  e => err('Uncaught:', e));
process.on('unhandledRejection', e => err('Unhandled:', e));
