/**
 * Neon Pong — Electron Desktop Entry
 * In production: connects to Railway server
 * In dev: connects to localhost:3000
 */

const { app, BrowserWindow, shell, dialog } = require('electron');
const path = require('path');

// ── Config ────────────────────────────────────────────────────────────
// Set RAILWAY_URL to your Railway deployment URL (no trailing slash)
// e.g. https://neon-pong-production.up.railway.app
const RAILWAY_URL = process.env.RAILWAY_URL || null;
const DEV_URL     = 'http://localhost:3000';

const isProd = app.isPackaged;
const GAME_URL = (isProd && RAILWAY_URL) ? RAILWAY_URL : DEV_URL;

console.log(`[Electron] Mode: ${isProd ? 'production' : 'dev'} | URL: ${GAME_URL}`);

// ── Window ────────────────────────────────────────────────────────────
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 750,
    minWidth: 600,
    minHeight: 520,
    title: 'Neon Pong × TikTok Live',
    backgroundColor: '#0a0a12',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    // Custom traffic-light position for a clean game feel
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  // Show when ready to avoid white flash
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.setMenuBarVisibility(false);

  // Load the game
  mainWindow.loadURL(GAME_URL).catch(() => {
    // If Railway is unreachable, show a helpful message
    mainWindow.loadURL('data:text/html,<html style="background:#0a0a12;color:#0ff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column"><h2>Could not connect to game server</h2><p style="color:#555;margin-top:1rem">Make sure your Railway server is running<br>or set RAILWAY_URL in your .env file</p><p style="margin-top:1rem"><a href="' + GAME_URL + '" style="color:#0ff">' + GAME_URL + '</a></p></html>');
  });

  // Open external links in browser, not Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App events ────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
