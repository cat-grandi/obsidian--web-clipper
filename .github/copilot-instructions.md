# Obsidian Web Clipper

Obsidian Web Clipper is a browser extension for Chrome, Firefox, and Safari that allows users to save and highlight web pages to their Obsidian vault. The extension is built with TypeScript and Webpack, using web extension APIs.

Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.

## Working Effectively

### Initial Setup
- `npm install` -- takes ~11 seconds. Dependencies install cleanly.
- Node.js v20+ and npm v10+ are supported.

### Build Commands
- `npm run build` -- builds all browser versions. Takes ~60 seconds total. NEVER CANCEL. Set timeout to 90+ minutes.
  - Creates `dist/` (Chrome), `dist_firefox/`, and `dist_safari/` directories
  - Creates production-ready ZIP files in `builds/` directory
- `npm run build:chrome` -- builds Chrome version only. Takes ~20 seconds. NEVER CANCEL.
- `npm run build:firefox` -- builds Firefox version only. Takes ~20 seconds. NEVER CANCEL.
- `npm run build:safari` -- builds Safari version only. Takes ~20 seconds. NEVER CANCEL.

### Development Commands
- `npm run dev` -- starts Chrome development build with watch mode. Initial compilation takes ~22 seconds. NEVER CANCEL.
  - Equivalent to `npm run dev:chrome`
  - Creates `dev/` directory for development files
  - Watch mode rebuilds automatically on file changes
- `npm run dev:firefox` -- Firefox development build with watch mode
- `npm run dev:safari` -- Safari development build with watch mode

### Dependency Management
- `npm run defuddle-prod` -- switches to published defuddle library. Takes ~1 second.
- `npm run defuddle-dev` -- switches to local defuddle library for development. Takes ~1 second.

### Localization Commands (Require OpenAI API Key)
- `npm run update-locales` -- updates translations for all languages. Requires OPENAI_API_KEY in .env file.
- `npm run add-locale [locale]` -- adds new language support. Example: `npm run add-locale fr`

### Broken Commands (Known Issues)
- `npm run check-strings` -- FAILS due to incorrect path (looks for `src/locales` instead of `src/_locales`)
- ESLint commands fail due to outdated configuration (incompatible with ESLint v9+)

## Validation

### Manual Testing Requirements
ALWAYS manually validate browser extension functionality after making changes:

1. **Load Extension in Browser**:
   - Chrome/Edge: Navigate to `chrome://extensions`, enable Developer mode, click "Load unpacked", select `dist/` or `dev/` directory
   - Firefox: Navigate to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select `manifest.json` from `dist_firefox/` or `dev_firefox/`
   - Safari: Use Xcode project in `xcode/` directory

2. **Test Core Functionality**:
   - Click extension icon to open popup
   - Test highlighting functionality on a web page (Alt+Shift+H)
   - Test reader mode (Alt+Shift+R)
   - Test settings page functionality
   - Test clipping content to Obsidian (requires Obsidian 1.7.2+ installed)

3. **Keyboard Shortcuts**:
   - Ctrl+Shift+O (Cmd+Shift+O on Mac): Open clipper
   - Alt+Shift+O: Quick clip
   - Alt+Shift+H: Toggle highlighter
   - Alt+Shift+R: Toggle reader

4. **Extension Files to Verify**:
   - `manifest.json` -- Extension configuration
   - `popup.html` and `popup.js` -- Main extension interface
   - `settings.html` and `settings.js` -- Settings page
   - `content.js` -- Content script for web pages
   - `background.js` -- Service worker
   - `_locales/` -- Language files (32 languages supported)

### Build Validation
- Always run `npm run build` after making changes to ensure all browser builds succeed
- Check that output directories contain all expected files (manifest.json, popup.html, etc.)
- Verify ZIP files are created in `builds/` directory for production builds

## Project Structure

### Key Directories
- `src/core/` -- Core extension logic (popup.ts, settings.ts)
- `src/managers/` -- Feature management modules
  - `template-manager.ts` -- Template system
  - `highlights-manager.ts` -- Highlighting functionality
  - `interpreter-settings.ts` -- AI interpretation features
  - `general-settings.ts` -- Extension settings
- `src/utils/` -- Utility functions and helpers
  - `filters/` -- 50 template filters (date, text, markdown transformations)
  - `variables/` -- Template variable processors
  - `content-extractor.ts` -- Web page content extraction
  - `markdown-converter.ts` -- HTML to Markdown conversion
- `src/_locales/` -- Internationalization files (32 languages supported)
- `src/types/` -- TypeScript type definitions
- `scripts/` -- Build and maintenance scripts

### Key Files
- `webpack.config.js` -- Build configuration for all browsers
- `manifest.*.json` -- Browser-specific extension manifests
- `tsconfig.json` -- TypeScript configuration
- `.eslintrc.json` -- ESLint configuration (OUTDATED - incompatible with v9+)

### Frequently Modified Files
When working on specific features:
- **Templates**: `src/managers/template-manager.ts`, `src/managers/template-ui.ts`
- **Settings**: `src/managers/general-settings.ts`, `src/settings.html`
- **Content Extraction**: `src/utils/content-extractor.ts`
- **Highlighting**: `src/managers/highlights-manager.ts`, `src/utils/highlighter.ts`
- **Filters**: Files in `src/utils/filters/`
- **Variables**: Files in `src/utils/variables/`

## Common Issues and Workarounds

### Known Broken Features
- **String validation**: `npm run check-strings` fails due to path bug (expects `src/locales` but actual path is `src/_locales`)
- **Linting**: ESLint configuration is incompatible with ESLint v9+. Use manual code review.
- **No Tests**: Project has no test suite. All validation must be manual.

### Build Warnings
- Large bundle size warnings are expected (popup.js ~1.4MB, settings.js ~1.2MB, reader-script.js ~1.6MB)
- These warnings do not prevent successful builds

### Development Tips
- Use `npm run dev` for faster iteration during development
- Always test in at least Chrome and Firefox after changes
- The extension requires Obsidian 1.7.2+ for full functionality
- Content scripts inject into all web pages - test on various sites
- Side panel feature requires Chrome 114+ or Edge 114+

## Third-Party Dependencies

The extension uses several key libraries:
- **webextension-polyfill**: Cross-browser API compatibility
- **defuddle**: Content extraction and readability
- **turndown**: HTML to Markdown conversion
- **dayjs**: Date formatting and parsing
- **lz-string**: Template compression
- **lucide**: Icon system
- **highlight.js**: Syntax highlighting
- **dompurify**: HTML sanitization

## CI/CD

Currently there are NO GitHub Actions workflows. All builds and validation must be done manually.

## Performance Expectations

- **npm install**: 11 seconds
- **Full build**: 60 seconds total (20 seconds per browser)
- **Development build**: 22 seconds initial, then incremental updates
- **Defuddle scripts**: 1 second each
- **Extension load time**: Under 1 second in browser

Always wait for commands to complete fully. Build processes are CPU-intensive but reliable.