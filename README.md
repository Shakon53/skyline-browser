# Skyline Browser

Skyline is a lightweight desktop browser shell for Windows, built with Electron and Chromium.

## Features

- Persistent Skyline sidebar
- Multiple tabs and address/search bar
- Back, forward, reload, bookmarks and history
- Downloads and private windows
- Kazakh-language start page
- Windows NSIS installer build
- Public download website

## Development

Requirements: Node.js and npm.

```powershell
npm install
npm start
```

## Build the Windows installer

```powershell
npm run dist
```

The installer is created under `release/`.

## Website

The landing page source is in `website/`.

Public site: https://website-steel-delta-13.vercel.app

## Security note

The current public preview installer is unsigned. Windows SmartScreen may display an unknown-publisher warning until a code-signing certificate is configured.

## License

MIT
