# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CLG Launcher is a fork of OriLauncher, customized for the Club Informatique du Collège Madame Epinay. It is a cross-platform Minecraft launcher built with Electron and Svelte. Key modifications from upstream:
- **Offline accounts only** - Microsoft authentication removed
- **Dedicated server tab** - Auto-connects to 179.61.190.50:25565 with player count display
- **Minecraft 1.21.1** - Version for server compatibility
- **Discord RPC disabled** - Social features removed
- **French/English** - Bilingual localization

## Build & Development Commands

```bash
npm install          # Install dependencies (runs electron-builder install-app-deps)
npm run dev          # Start Vite dev server + Electron concurrently
npm run build        # Build Svelte frontend to dist/
npm run preview      # Preview built UI
npm run dist         # Package for current platform (runs via build.js)
npm run dist:win     # Windows NSIS installer
npm run dist:mac     # macOS DMG
npm run dist:linux   # Linux AppImage
```

Development runs Vite at `http://localhost:5173`, then Electron launches once the server is ready.

## Architecture

### Process Model
- **Main Process** (`src/electron/main.js`): IPC handlers, game launch orchestration via `ori-mcc`, account management via `msmc`, Discord RPC, file I/O
- **Preload** (`src/electron/preload.js`): Context bridge exposing `window.electron` to renderer
- **Renderer** (`src/app/`): Svelte 5 frontend with components, stores, and services

### Key IPC Events
- `launch-game`, `cancel-launch` - Game launch control
- `launch-progress`, `launch-data`, `launch-complete`, `launch-close`, `launch-cancelled`, `error` - Launch status events
- `add-account`, `refresh-account` - Account management (offline only)
- `check-for-updates`, `install-update`, `update-status` - Auto-updater control
- `add-server-to-list` - Adds CLG server to Minecraft's servers.dat

### State Management
Svelte stores in `src/app/stores/`:
- `account.js` - Account profiles (offline only)
- `settings.js` - User settings persistence
- `ui.js` - UI state (sidebar, modals)
- `launch.js` - Game launch orchestration
- `i18n.js` - Localization (en/fr/es/tr)
- `version.js` - Minecraft version selection
- `connection.js` - Server connection status
- `data.js` - General data store
- `dropdown.js` - Dropdown state
- `news.js` - News/announcements

### Core Dependencies
- `ori-mcc` - Minecraft launcher core (download, launch, events)
- `msmc` - Offline authentication only (Microsoft auth removed)
- `discord-rpc` - DISABLED in this fork (code remains but unused)
- `skin3d` - 3D player skin viewer
- `electron-updater` - Auto-update from GitHub releases (prereleases enabled)
- `nbt` - NBT parsing for servers.dat manipulation

### Data Paths
All launcher data is stored in `{APPDATA}/.OriLauncher/`:
- `.Minecraft/` - Minecraft game files, instances, mods
- `logs/` - Session log files
- `Backup/` - User backups

## Localization

Supported languages: English (en), French (fr), Spanish (es), Turkish (tr).
Base language is English (`locale/en.json`).

Workflow:
1. Update `locale/en.json` first with new keys
2. Mirror keys in other locale files (`fr.json`, `es.json`, `tr.json`)
3. Keep translations concise

French is the primary language for this launcher's users (Club Informatique CLG).

## Coding Conventions

- ES Modules only (`"type": "module"`)
- Modern JS patterns (async/await, destructuring)
- Keep changes focused and minimal
- Feature branches: `feat/<description>`, `fix/<description>`, `docs/<description>`
- Commit style: present tense, imperative (e.g., `feat(instances): add RAM slider`)

## CLG Launcher Specifics

### Custom Build Pipeline
The `build.js` script handles the build process:
1. Runs `npm run build:ui` to compile Svelte frontend to `dist/`
2. Copies `src/electron/*` to `appsrc/electron/` and `locale/*` to `appsrc/locale/`
3. Runs electron-builder with ASAR packing
4. Uses `rcedit` on Windows to embed icon and version info after packaging

### App Metadata
- **App ID**: `fr.clg.launcher`
- **Product Name**: `CLG Launcher`
- **Repository**: `BourezBastien/ClgLauncher`

### Important Notes
- Discord RPC code exists in `src/electron/utils/discordRPC.js` but is disabled in `main.js`
- Server address (179.61.190.50:25565) and Minecraft version (1.21.1) are configured for the club's server
- Window management is modularized in `src/electron/window/appWindow.js`

## Distribution Policy

Personal builds are allowed for local testing. Redistribution of binaries or source is prohibited. Official releases are published only by maintainers via GitHub Actions.

See `BUILD.md` for detailed local build instructions.
