# Neon Pong × TikTok Live — Production Deployment Guide

## Project structure

```
neon-pong-production/
├── index.html              ← Game (auto-connects Railway or localhost)
├── server.js               ← Production server (dotenv + reconnect + health check)
├── package.json            ← All scripts and electron-builder config
├── ecosystem.config.js     ← PM2 config (auto-restart)
├── .env.example            ← Copy to .env and fill in your details
├── .gitignore
└── electron/
    └── main.js             ← Desktop app entry point (loads Railway URL)
```

---

## PART 1 — Deploy Server to Railway (free)

### Step 1 — Create a GitHub repo

1. Go to https://github.com and create a new repository called `neon-pong`
2. Make it **public** (Railway free tier requires this)
3. Upload all files from this folder to the repo

Or use the command line:
```bash
cd neon-pong-production
git init
git add .
git commit -m "Initial production release"
git remote add origin https://github.com/YOURUSERNAME/neon-pong.git
git push -u origin main
```

### Step 2 — Deploy on Railway

1. Go to https://railway.app and sign up (free)
2. Click **New Project → Deploy from GitHub repo**
3. Select your `neon-pong` repo
4. Railway will auto-detect Node.js and start deploying

### Step 3 — Set environment variables on Railway

In your Railway project → **Variables** tab, add:

| Variable | Value |
|---|---|
| `TIKTOK_USERNAME` | `@yourtiktokusername` |
| `NODE_ENV` | `production` |

Railway sets `PORT` automatically — do not add it.

### Step 4 — Get your Railway URL

After deployment, Railway gives you a URL like:
```
https://neon-pong-production.up.railway.app
```

Open it in your browser — your game is live! 🎉

### Step 5 — Verify it's working

- Open `https://your-app.up.railway.app/health`
- You should see: `{"status":"ok","tiktok":"@yourusername",...}`

---

## PART 2 — Build Desktop App (Mac + Windows)

### Prerequisites

Install Node.js from https://nodejs.org (LTS version)

Then in the project folder:
```bash
npm install
```

### Configure the Railway URL

Create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

Edit `.env`:
```
TIKTOK_USERNAME=@yourtiktokusername
RAILWAY_URL=https://your-app.up.railway.app
NODE_ENV=production
```

### Build for Mac

```bash
npm run build:mac
```

Output: `dist/Neon Pong-2.0.0.dmg`

- Double-click the `.dmg`
- Drag **Neon Pong** to your Applications folder
- Open it — it loads your Railway game automatically

### Build for Windows

Run this on a Windows machine:
```bash
npm run build:win
```

Output: `dist/Neon Pong Setup 2.0.0.exe`

- Share this `.exe` with anyone on Windows
- It installs like a normal app with a desktop shortcut

### Build both at once (on Mac)

```bash
npm run build:all
```

---

## PART 3 — PM2 Auto-restart (optional, for VPS)

If you ever move to a VPS instead of Railway, use PM2:

```bash
# Install PM2 globally
npm install -g pm2

# Start with PM2
npm run pm2:start

# View logs
npm run pm2:logs

# Restart
npm run pm2:restart

# Auto-start on server reboot
pm2 startup
pm2 save
```

PM2 will automatically restart the server if it crashes,
with exponential backoff and log rotation.

---

## PART 4 — Show on OBS (stream overlay)

To show the game on your TikTok Live:

1. Open **OBS** (free at obsproject.com)
2. Add a **Browser Source**
3. Set URL to: `https://your-app.up.railway.app`
4. Width: `800` Height: `600`
5. Your viewers see the game reacting to their gifts in real time!

---

## Testing gift effects

Press these keys while the game is running:

| Key | Effect |
|---|---|
| `1` | 🌸 Small gift (speed + sparks) |
| `2` | 🎆 Medium gift (extra ball) |
| `3` | 🦁 Big gift (fireball mode) |
| `4` | 🌌 Mega gift (golden paddle) |
| `5` | ❤️ Like |
| `6` | 👤 Follow |
| `7` | 🔁 Share |

Or in browser console:
```js
testSmall(); testMedium(); testBig(); testMega();
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Railway deploy fails | Check Build logs — usually a missing dependency |
| TikTok not connecting | Make sure you are LIVE and username includes @ |
| Desktop app shows blank | Check RAILWAY_URL in .env matches your Railway domain |
| Health check fails | Wait 30s after deploy — Railway needs boot time |
| `npm install` fails | Make sure Node.js 18+ is installed |
| Mac app: "unidentified developer" | Right-click → Open → Open anyway |
| Windows app blocked by SmartScreen | Click "More info" → "Run anyway" |

---

## Railway free tier limits

- ✅ $5 free credit per month (enough for always-on)
- ✅ Automatic HTTPS
- ✅ Custom domain support
- ✅ Auto-deploy on every GitHub push
- ✅ WebSocket support (required for live events)
- ⚠️  Sleeps after inactivity on hobby plan — upgrade to $5/mo for always-on

---

Built with: Node.js · tiktok-live-connector · ws · Electron · Railway · PM2
100% free and open source.
