# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OriLauncher is a cross-platform Minecraft launcher built with Electron and Svelte. It supports multiple accounts (Microsoft/offline), instance management (Vanilla/Forge/Fabric), and custom Java/RAM settings.

## Build & Development Commands

```bash
npm install          # Install dependencies (runs electron-builder install-app-deps)
npm run dev          # Start Vite dev server + Electron concurrently
npm run build        # Build Svelte frontend to dist/
npm run preview      # Preview built UI
npm run dist         # Package for current platform (personal use only)
npm run dist:win     # Windows NSIS installer
npm run dist:mac     # macOS DMG
npm run dist:linux   # Linux AppImage
```

Development runs Vite at `http://localhost:5173`, then Electron launches once the server is ready.

## Architecture

### Process Model
- **Main Process** (`src/electron/main.js`): IPC handlers, game launch orchestration via `ori-mcc`, account management via `msmc`, Discord RPC, file I/O
- **Preload** (`src/electron/preload.js`): Context bridge exposing `window.electronAPI` to renderer
- **Renderer** (`src/app/`): Svelte 5 frontend with components, stores, and services

### Key IPC Events
- `launch-game`, `cancel-launch` - Game launch control
- `launch-progress`, `launch-data`, `launch-complete`, `error` - Launch status events
- `get-accounts`, `add-account`, `remove-account` - Account management
- `get-settings`, `set-settings` - Settings persistence

### State Management
Svelte stores in `src/app/stores/`: `account.js`, `settings.js`, `ui.js`, `launch.js`, `i18n.js`, `version.js`, `news.js`

### Core Dependencies
- `ori-mcc` - Minecraft launcher core (download, launch, events)
- `msmc` - Microsoft/offline authentication
- `discord-rpc` - Discord Rich Presence
- `skin3d` - 3D player skin viewer

## Localization

Base language is English (`locale/en.json`). Other languages: Spanish, French, Turkish.

Workflow:
1. Update `locale/en.json` first with new keys
2. Mirror keys in other locale files
3. Keep translations concise

## Coding Conventions

- ES Modules only (`"type": "module"`)
- Modern JS patterns (async/await, destructuring)
- Keep changes focused and minimal
- Feature branches: `feat/<description>`, `fix/<description>`, `docs/<description>`
- Commit style: present tense, imperative (e.g., `feat(instances): add RAM slider`)

## Build Pipeline

`build.js` copies `src/electron/*` and `locale/*` to `appsrc/`, then runs Electron Builder. ASAR packing is enabled with `discord-rpc` unpacked for native module compatibility.

## Distribution Policy

Personal builds are allowed for local testing. Redistribution of binaries or source is prohibited. Official releases are published only by maintainers via GitHub Actions.
