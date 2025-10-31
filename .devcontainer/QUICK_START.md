# 🚀 Quick Start Guide

## First Time Setup

1. **Open in VS Code**
   ```bash
   code .
   ```

2. **Reopen in Container**
   - Click "Reopen in Container" when prompted
   - OR press `F1` → "Dev Containers: Reopen in Container"

3. **Wait for Setup** (2-5 minutes first time)
   - Container builds
   - Dependencies install automatically

## Essential Commands

### Start Development

```bash
cd src
npm run dev        # Start with auto-reload (recommended)
npm start          # Start normally
```

### Run Tests

```bash
cd src
npm test           # Run once
npm run test:watch # Auto-run on changes
```

### Debug

- Press `F5` → Select "Launch Viridis with Nodemon"
- Set breakpoints by clicking line numbers
- Use Debug Console for live evaluation

## Quick Access

| What | Where |
|------|-------|
| **Web UI** | http://localhost:9099/ |
| **API** | http://localhost:9099/api/color |
| **Redis** | redis://redis:6379 |

## Common Tasks (Ctrl+Shift+P → Tasks: Run Task)

- Start Viridis (Dev Mode)
- Run Tests (Watch)
- Check Redis Connection

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Run/Debug | `F5` |
| Command Palette | `Ctrl+Shift+P` / `Cmd+Shift+P` |
| Integrated Terminal | `` Ctrl+` `` / `` Cmd+` `` |
| Run Task | `Ctrl+Shift+B` / `Cmd+Shift+B` |

## Test the Setup

```bash
# 1. Check Node version
node --version  # Should be v22.x.x

# 2. Check Redis
redis-cli -h redis ping  # Should return PONG

# 3. Start the app
cd src && npm run dev

# 4. Test API (in another terminal)
curl http://localhost:9099/api/color | jq .
```

## Troubleshooting

### Container won't start
```
F1 → "Dev Containers: Rebuild Container"
```

### Port already in use
```bash
# Stop the production containers
docker-compose down
```

### Need to reinstall dependencies
```bash
cd src
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

📖 Read [DEVELOPMENT.md](../DEVELOPMENT.md) for detailed guide
🐳 See [README.md](README.md) for dev container details
🧪 Check `src/index.test.js` for API examples

---

**Pro Tip**: Keep `npm run test:watch` running in one terminal while developing in another!

