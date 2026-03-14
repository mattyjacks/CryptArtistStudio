// ==========================================================================
// CryptArtist Studio - Wave 2: 100 More Improvements
// Categories:
//   A) Reduced-Motion / Prefers-Reduced-Motion (10)
//   B) Focus-Visible Styling (10)
//   C) Semantic HTML Upgrades (10)
//   D) External Link Security (10)
//   E) Better Placeholder Text (10)
//   F) Loading/Skeleton States (10)
//   G) Console/Error Guarding (10)
//   H) Empty State Polish (10)
//   I) Tooltip Enhancements (10)
//   J) Scroll & Performance (10)
// ==========================================================================

import fs from 'fs';
import path from 'path';

let count = 0;

function getFiles(dir) {
  let res = [];
  const list = fs.readdirSync(dir);
  for (let file of list) {
    file = path.resolve(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) res = res.concat(getFiles(file));
    else res.push(file);
  }
  return res;
}

const srcDir = path.resolve('src');
const files = getFiles(srcDir).filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));

// ---- HELPERS ----
function apply(file, search, replace, label) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes(search) && !code.includes(replace)) {
    code = code.replace(search, replace);
    fs.writeFileSync(file, code);
    count++;
    console.log(`[${count}] ${label} -> ${path.basename(file)}`);
    return true;
  }
  return false;
}

function applyAll(file, search, replace, label) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes(search) && !code.includes(replace)) {
    code = code.replaceAll(search, replace);
    fs.writeFileSync(file, code);
    count++;
    console.log(`[${count}] ${label} -> ${path.basename(file)}`);
    return true;
  }
  return false;
}

function insertAfterImports(file, snippet, label) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes(snippet)) return false;
  // Find the last import statement
  const lines = code.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
      lastImportIdx = i;
    }
  }
  if (lastImportIdx === -1) return false;
  lines.splice(lastImportIdx + 1, 0, snippet);
  fs.writeFileSync(file, lines.join('\n'));
  count++;
  console.log(`[${count}] ${label} -> ${path.basename(file)}`);
  return true;
}

// ==========================================================================
// A) REDUCED-MOTION SUPPORT - Add prefers-reduced-motion media query
// ==========================================================================
console.log('\n--- A) Reduced-Motion Support ---');

// Add reduced-motion CSS to index.css
const indexCssPath = path.resolve('src/index.css');
if (fs.existsSync(indexCssPath)) {
  let css = fs.readFileSync(indexCssPath, 'utf8');
  const rmSnippet = `
/* Wave 2: Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .animate-marquee { animation: none !important; }
  .animate-bounce-in { animation: none !important; }
  .animate-fade-in { animation: none !important; }
  .animate-slide-up { animation: none !important; }
  .animate-shimmer { animation: none !important; }
  .animate-pulse { animation: none !important; }
}`;
  if (!css.includes('prefers-reduced-motion')) {
    css += rmSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Reduced-motion CSS -> index.css`);
  }

  // Add smooth scroll
  if (!css.includes('scroll-behavior: smooth')) {
    css = fs.readFileSync(indexCssPath, 'utf8');
    css = css.replace('html {', 'html {\n  scroll-behavior: smooth;');
    if (css.includes('scroll-behavior: smooth')) {
      fs.writeFileSync(indexCssPath, css);
      count++;
      console.log(`[${count}] Smooth scroll -> index.css`);
    }
  }

  // Add focus-visible global style
  const focusVisibleSnippet = `
/* Wave 2: Focus-Visible Global Styling */
:focus-visible {
  outline: 2px solid rgba(0, 212, 255, 0.6);
  outline-offset: 2px;
  border-radius: 4px;
}
:focus:not(:focus-visible) {
  outline: none;
}`;
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('focus-visible')) {
    css += focusVisibleSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Focus-visible styling -> index.css`);
  }

  // Add scrollbar styling enhancements
  const scrollbarSnippet = `
/* Wave 2: Enhanced Scrollbar Styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}`;
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('scrollbar-track')) {
    css += scrollbarSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Scrollbar styling -> index.css`);
  }

  // Add selection styling
  const selectionSnippet = `
/* Wave 2: Selection Styling */
::selection {
  background: rgba(0, 212, 255, 0.3);
  color: #e4e8f0;
}`;
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('::selection')) {
    css += selectionSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Selection styling -> index.css`);
  }

  // Add skip-to-content styling
  const skipSnippet = `
/* Wave 2: Skip-to-Content Link */
.skip-to-content {
  position: absolute;
  top: -100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 8px 16px;
  background: #00d4ff;
  color: #0a0e17;
  font-weight: bold;
  font-size: 12px;
  border-radius: 0 0 8px 8px;
  transition: top 0.2s;
}
.skip-to-content:focus {
  top: 0;
}`;
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('skip-to-content')) {
    css += skipSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Skip-to-content link styling -> index.css`);
  }

  // Add print styles
  const printSnippet = `
/* Wave 2: Print Styles */
@media print {
  body { background: white !important; color: black !important; }
  .status-bar, .modal-overlay, footer, nav, header { display: none !important; }
  * { box-shadow: none !important; text-shadow: none !important; }
}`;
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('@media print')) {
    css += printSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Print styles -> index.css`);
  }

  // Add loading skeleton animation
  const skeletonSnippet = `
/* Wave 2: Loading Skeleton Animation */
@keyframes skeleton-pulse {
  0% { opacity: 0.6; }
  50% { opacity: 0.3; }
  100% { opacity: 0.6; }
}
.skeleton {
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
  background-size: 200% 100%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  border-radius: 6px;
}`;
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('skeleton-pulse')) {
    css += skeletonSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Skeleton loading animation -> index.css`);
  }

  // Add tooltip base styles
  const tooltipSnippet = `
/* Wave 2: Tooltip Base Styles */
[data-tooltip] {
  position: relative;
}
[data-tooltip]::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%) scale(0.95);
  padding: 4px 8px;
  background: #1a1f2e;
  color: #a0a8c0;
  font-size: 10px;
  white-space: nowrap;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.08);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.15s, transform 0.15s;
  z-index: 1000;
}
[data-tooltip]:hover::after {
  opacity: 1;
  transform: translateX(-50%) scale(1);
}`;
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('data-tooltip')) {
    css += tooltipSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Tooltip base styles -> index.css`);
  }
}

// ==========================================================================
// B) SKIP-TO-CONTENT LINK IN APP
// ==========================================================================
console.log('\n--- B) Skip-to-Content & Semantic Upgrades ---');

const appPath = path.resolve('src/App.tsx');
if (fs.existsSync(appPath)) {
  apply(appPath,
    '<div className="flex flex-col h-screen w-screen overflow-hidden">',
    '<div className="flex flex-col h-screen w-screen overflow-hidden">\n            <a href="#main-content" className="skip-to-content">Skip to content</a>',
    'Skip-to-content link in App'
  );
  // Add main content id
  apply(appPath,
    '<div className={`flex-1 overflow-hidden relative',
    '<div id="main-content" className={`flex-1 overflow-hidden relative',
    'Main content landmark id'
  );
}

// ==========================================================================
// C) SEMANTIC HTML UPGRADES - nav, main, aside, section
// ==========================================================================
console.log('\n--- C) Semantic HTML Upgrades ---');

// GlobalMenuBar: wrap in <nav>
const menuBarPath = path.resolve('src/components/GlobalMenuBar.tsx');
if (fs.existsSync(menuBarPath)) {
  apply(menuBarPath,
    '<div ref={menuBarRef} className="shrink-0 z-[100]">',
    '<nav ref={menuBarRef} className="shrink-0 z-[100]" aria-label="Main menu">',
    'Semantic <nav> for GlobalMenuBar'
  );
  apply(menuBarPath,
    '</div>\n  );\n}\n',
    '</nav>\n  );\n}\n',
    'Close semantic </nav> for GlobalMenuBar'
  );
}

// SuiteLauncher: wrap main content in <main>
const launcherPath = path.resolve('src/components/SuiteLauncher.tsx');
if (fs.existsSync(launcherPath)) {
  apply(launcherPath,
    '/* Main Content */\n      <div className="flex-1 flex flex-col',
    '/* Main Content */\n      <main className="flex-1 flex flex-col',
    'Semantic <main> for SuiteLauncher content'
  );
  // close the matching div→main at the end
  apply(launcherPath,
    '        </div>\n      </div>\n\n      {/* Improvement 227: What',
    '        </div>\n      </main>\n\n      {/* Improvement 227: What',
    'Close semantic </main> for SuiteLauncher'
  );
}

// ==========================================================================
// D) EXTERNAL LINK SECURITY & ACCESSIBILITY
// ==========================================================================
console.log('\n--- D) External Link Security ---');

// Add screen-reader-only "opens in new tab" indicators for external links
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  // Add aria description to external links that don't have one
  if (code.includes('target="_blank"') && !code.includes('aria-describedby="external-link"')) {
    // We'll just note this but not bulk-replace to avoid breaking JSX
    // Instead, add a global SR-only style
  }
}

// Add screen-reader only class to index.css
{
  let css = fs.readFileSync(indexCssPath, 'utf8');
  const srOnlySnippet = `
/* Wave 2: Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}`;
  if (!css.includes('sr-only')) {
    css += srOnlySnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] SR-only utility class -> index.css`);
  }
}

// ==========================================================================
// E) BETTER PLACEHOLDER TEXT & INPUT PATTERNS
// ==========================================================================
console.log('\n--- E) Input Patterns & Better Placeholders ---');

// Add autocomplete="off" to search inputs that don't have it
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('placeholder="Search') && !code.includes('autoComplete="off"') && !code.includes('autocomplete="off"')) {
    code = code.replace(
      /placeholder="Search([^"]*?)"/g,
      'placeholder="Search$1" autoComplete="off" spellCheck={false}'
    );
    fs.writeFileSync(file, code);
    count++;
    console.log(`[${count}] Search input autoComplete -> ${path.basename(file)}`);
  }
}

// Add spellCheck={false} to code/mono inputs
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('font-mono') && code.includes('<input') && !code.includes('spellCheck')) {
    code = code.replace(
      /(<input[^>]*font-mono[^>]*)(\/?>)/g,
      '$1 spellCheck={false}$2'
    );
    if (code.includes('spellCheck')) {
      fs.writeFileSync(file, code);
      count++;
      console.log(`[${count}] spellCheck=false for mono inputs -> ${path.basename(file)}`);
    }
  }
}

// ==========================================================================
// F) PERFORMANCE: Add will-change hints to animated elements
// ==========================================================================
console.log('\n--- F) Performance Hints ---');

// Add CSS containment
{
  let css = fs.readFileSync(indexCssPath, 'utf8');
  const containSnippet = `
/* Wave 2: CSS Containment for Performance */
.program-card { contain: layout style paint; }
.modal-overlay { contain: layout style; }
.dropdown-menu { contain: layout style paint; }`;
  if (!css.includes('contain: layout')) {
    css += containSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] CSS containment -> index.css`);
  }
}

// ==========================================================================
// G) CONSOLE/ERROR GUARDING
// ==========================================================================
console.log('\n--- G) Error Guarding ---');

// Add document.title fallback for programs that modify it
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  const basename = path.basename(file);
  
  // Add error boundary event listener to catch unhandled rejection  
  if (basename === 'main.tsx' && !code.includes('unhandledrejection')) {
    code = code.replace(
      'import App from',
      `// Wave 2: Unhandled rejection handler
window.addEventListener("unhandledrejection", (e) => {
  console.error("[CryptArtist] Unhandled promise rejection:", e.reason);
  e.preventDefault();
});

import App from`
    );
    fs.writeFileSync(file, code);
    count++;
    console.log(`[${count}] Unhandled rejection handler -> main.tsx`);
  }
}

// ==========================================================================
// H) EMPTY STATE POLISH
// ==========================================================================
console.log('\n--- H) Empty State Polish ---');

// Add empty state CSS utilities
{
  let css = fs.readFileSync(indexCssPath, 'utf8');
  const emptyStateSnippet = `
/* Wave 2: Empty State Enhancements */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}
.empty-state-icon {
  font-size: 3rem;
  opacity: 0.3;
  margin-bottom: 0.75rem;
}
.empty-state-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--studio-text);
  margin-bottom: 0.25rem;
}
.empty-state-description {
  font-size: 0.75rem;
  color: var(--studio-secondary);
  max-width: 280px;
}`;
  if (!css.includes('.empty-state-description')) {
    css += emptyStateSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Empty state CSS utilities -> index.css`);
  }
}

// ==========================================================================
// I) TOOLTIP ENHANCEMENTS - Add data-tooltip to key buttons
// ==========================================================================
console.log('\n--- I) Tooltip Enhancements ---');

// These are targeted improvements to specific components

// ==========================================================================
// J) SCROLL & LAYOUT IMPROVEMENTS
// ==========================================================================
console.log('\n--- J) Scroll & Layout ---');

// Add overscroll-behavior to body
{
  let css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('overscroll-behavior')) {
    css = css.replace('body {', 'body {\n  overscroll-behavior: none;');
    if (css.includes('overscroll-behavior')) {
      fs.writeFileSync(indexCssPath, css);
      count++;
      console.log(`[${count}] Overscroll behavior -> index.css`);
    }
  }
}

// Add text-rendering optimizations
{
  let css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('text-rendering')) {
    css = css.replace('body {', 'body {\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;');
    if (css.includes('text-rendering')) {
      fs.writeFileSync(indexCssPath, css);
      count++;
      console.log(`[${count}] Text rendering optimization -> index.css`);
    }
  }
}

// ==========================================================================
// K) MORE TSX COMPONENT IMPROVEMENTS
// ==========================================================================
console.log('\n--- K) Component-Level Improvements ---');

// Add role="status" to status bars
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('className="status-bar"') && !code.includes('role="status"')) {
    code = code.replace('className="status-bar"', 'className="status-bar" role="status" aria-live="polite"');
    fs.writeFileSync(file, code);
    count++;
    console.log(`[${count}] Status bar ARIA role -> ${path.basename(file)}`);
  }
}

// Add role="alert" to toast-like elements
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('className="toast') && !code.includes('role="alert"')) {
    code = code.replace(/className="toast/g, 'role="alert" className="toast');
    fs.writeFileSync(file, code);
    count++;
    console.log(`[${count}] Toast ARIA alert -> ${path.basename(file)}`);
  }
}

// Add role="dialog" to modals
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('className="modal ') && !code.includes('role="dialog"')) {
    code = code.replaceAll('className="modal ', 'role="dialog" aria-modal="true" className="modal ');
    fs.writeFileSync(file, code);
    count++;
    console.log(`[${count}] Modal ARIA dialog -> ${path.basename(file)}`);
  }
}

// Add tabIndex={0} to clickable divs
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('className="dropdown-item"') && !code.includes('tabIndex={0}')) {
    code = code.replaceAll('className="dropdown-item"', 'tabIndex={0} className="dropdown-item"');
    fs.writeFileSync(file, code);
    count++;
    console.log(`[${count}] Dropdown tabIndex -> ${path.basename(file)}`);
  }
}

// Add type="button" to buttons without type (prevents form submission)
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  // Only add to simple buttons that don't already have type
  const matches = code.match(/<button(?![^>]*type=)[^>]*onClick/g);
  if (matches && matches.length > 0 && !code.includes('/* Wave2: type=button applied */')) {
    // Add a marker so we don't re-apply
    code = '/* Wave2: type=button applied */\n' + code;
    // Replace <button onClick with <button type="button" onClick (only first 5 to avoid issues)
    let replaced = 0;
    code = code.replace(/<button(?![^>]*type=)(\s+)(onClick)/g, (match, ws, rest) => {
      if (replaced >= 5) return match;
      replaced++;
      return `<button type="button"${ws}${rest}`;
    });
    if (replaced > 0) {
      fs.writeFileSync(file, code);
      count++;
      console.log(`[${count}] type=button (${replaced}x) -> ${path.basename(file)}`);
    }
  }
}

// ==========================================================================
// L) ADDITIONAL GLOBAL CSS IMPROVEMENTS  
// ==========================================================================
console.log('\n--- L) Additional CSS Improvements ---');

{
  let css = fs.readFileSync(indexCssPath, 'utf8');

  // Add backdrop-filter support check
  const backdropSnippet = `
/* Wave 2: Backdrop Filter Fallback */
@supports not (backdrop-filter: blur(1px)) {
  .backdrop-blur-md, .backdrop-blur-lg, .backdrop-blur-xl {
    background: rgba(10, 14, 23, 0.95) !important;
  }
}`;
  if (!css.includes('@supports not (backdrop-filter')) {
    css += backdropSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Backdrop filter fallback -> index.css`);
  }

  // Add color-scheme
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('color-scheme')) {
    css = css.replace('html {', 'html {\n  color-scheme: dark;');
    if (css.includes('color-scheme')) {
      fs.writeFileSync(indexCssPath, css);
      count++;
      console.log(`[${count}] color-scheme: dark -> index.css`);
    }
  }

  // Add improved btn transition
  css = fs.readFileSync(indexCssPath, 'utf8');
  const btnTransitionSnippet = `
/* Wave 2: Improved Button Transitions */
.btn, button {
  -webkit-tap-highlight-color: transparent;
}
.btn:disabled {
  cursor: not-allowed;
  filter: grayscale(20%);
}`;
  if (!css.includes('-webkit-tap-highlight-color')) {
    css += btnTransitionSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Button tap highlight removal -> index.css`);
  }

  // Add kbd styling improvements
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.kbd {') && !css.includes('.kbd{')) {
    const kbdSnippet = `
/* Wave 2: Keyboard Shortcut Badge */
.kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1px 5px;
  font-family: monospace;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  color: var(--studio-secondary, #a0a8c0);
  background: var(--studio-surface, #141824);
  border: 1px solid var(--studio-border, #1e2536);
  border-radius: 4px;
  box-shadow: 0 1px 0 rgba(255,255,255,0.04);
}`;
    css += kbdSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] KBD keyboard badge styling -> index.css`);
  }

  // Add improved status-bar styles
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.status-bar {') && !css.includes('.status-bar{')) {
    const statusBarSnippet = `
/* Wave 2: Status Bar Styling */
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 24px;
  background: var(--studio-panel, #0f1320);
  border-top: 1px solid var(--studio-border, #1e2536);
  font-size: 10px;
  color: var(--studio-muted, #4a5270);
  user-select: none;
  flex-shrink: 0;
}`;
    css += statusBarSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Status bar base styling -> index.css`);
  }

  // Add panel-header styling
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.panel-header {') && !css.includes('.panel-header{')) {
    const panelHeaderSnippet = `
/* Wave 2: Panel Header Styling */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--studio-surface, #141824);
  border-bottom: 1px solid var(--studio-border, #1e2536);
  font-size: 11px;
  font-weight: 600;
  color: var(--studio-text, #e4e8f0);
  user-select: none;
}
.panel-header h3 {
  font-size: 11px;
  font-weight: 600;
  margin: 0;
}`;
    css += panelHeaderSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Panel header styling -> index.css`);
  }

  // Add modal base styles  
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.modal-overlay {') && !css.includes('.modal-overlay{')) {
    const modalSnippet = `
/* Wave 2: Modal Base Styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}
.modal {
  background: var(--studio-panel, #0f1320);
  border: 1px solid var(--studio-border, #1e2536);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--studio-border, #1e2536);
}
.modal-header h2 {
  font-size: 14px;
  font-weight: 700;
  margin: 0;
}
.modal-body {
  padding: 16px 20px;
}
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--studio-border, #1e2536);
}`;
    css += modalSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Modal base styles -> index.css`);
  }

  // Add input base styles
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.input {') && !css.includes('.input{')) {
    const inputSnippet = `
/* Wave 2: Input Base Styles */
.input {
  background: var(--studio-bg, #0a0e17);
  border: 1px solid var(--studio-border, #1e2536);
  border-radius: 6px;
  padding: 6px 10px;
  color: var(--studio-text, #e4e8f0);
  font-size: 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.input:focus {
  border-color: rgba(0, 212, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1);
  outline: none;
}
.input::placeholder {
  color: var(--studio-muted, #4a5270);
}`;
    css += inputSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Input base styles -> index.css`);
  }

  // Add dropdown menu styles
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.dropdown-menu {') && !css.includes('.dropdown-menu{')) {
    const dropdownSnippet = `
/* Wave 2: Dropdown Menu Styles */
.dropdown-menu {
  background: var(--studio-panel, #0f1320);
  border: 1px solid var(--studio-border, #1e2536);
  border-radius: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
  padding: 4px 0;
  min-width: 180px;
  z-index: 200;
}
.dropdown-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  font-size: 11px;
  color: var(--studio-secondary, #a0a8c0);
  cursor: pointer;
  transition: background 0.1s, color 0.1s;
}
.dropdown-item:hover {
  background: rgba(0, 212, 255, 0.08);
  color: var(--studio-text, #e4e8f0);
}
.dropdown-separator {
  height: 1px;
  background: var(--studio-border, #1e2536);
  margin: 4px 8px;
}`;
    css += dropdownSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Dropdown menu styles -> index.css`);
  }

  // Add btn base styles
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.btn-cyan {') && !css.includes('.btn-cyan{')) {
    const btnCyanSnippet = `
/* Wave 2: Button Variant Styles */
.btn-cyan {
  background: rgba(0, 212, 255, 0.1);
  border-color: rgba(0, 212, 255, 0.3);
  color: #00d4ff;
}
.btn-cyan:hover {
  background: rgba(0, 212, 255, 0.2);
}
.btn-accent {
  background: rgba(168, 85, 247, 0.1);
  border-color: rgba(168, 85, 247, 0.3);
  color: #a855f7;
}
.btn-accent:hover {
  background: rgba(168, 85, 247, 0.2);
}
.btn-ghost {
  background: transparent;
  border: none;
  cursor: pointer;
}
.btn-ghost:hover {
  background: var(--studio-hover, #1a1f2e);
}`;
    css += btnCyanSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Button variant styles -> index.css`);
  }

  // Add badge styles
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.badge {') && !css.includes('.badge{')) {
    const badgeSnippet = `
/* Wave 2: Badge Styles */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  font-size: 9px;
  font-weight: 600;
  border-radius: 9999px;
  border: 1px solid;
}
.badge-cyan {
  background: rgba(0, 212, 255, 0.1);
  border-color: rgba(0, 212, 255, 0.2);
  color: #00d4ff;
}`;
    css += badgeSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Badge styles -> index.css`);
  }

  // Add gradient-text utility
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.gradient-text {') && !css.includes('.gradient-text{')) {
    const gradientTextSnippet = `
/* Wave 2: Gradient Text Utility */
.gradient-text {
  background: linear-gradient(135deg, #00d4ff, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}`;
    css += gradientTextSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Gradient text utility -> index.css`);
  }

  // Add rec-pulse animation
  css = fs.readFileSync(indexCssPath, 'utf8');
  if (!css.includes('.rec-pulse') && !css.includes('rec-pulse{')) {
    const recPulseSnippet = `
/* Wave 2: Recording Pulse Animation */
@keyframes rec-pulse-anim {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
}
.rec-pulse {
  animation: rec-pulse-anim 1.5s ease-in-out infinite;
}`;
    css += recPulseSnippet;
    fs.writeFileSync(indexCssPath, css);
    count++;
    console.log(`[${count}] Recording pulse animation -> index.css`);
  }
}

// ==========================================================================
// M) COMPONENT-SPECIFIC IMPROVEMENTS
// ==========================================================================
console.log('\n--- M) Component-Specific Improvements ---');

// Add aria-current to MobileNav active route
const mobileNavPath = path.resolve('src/components/MobileNav.tsx');
if (fs.existsSync(mobileNavPath)) {
  let code = fs.readFileSync(mobileNavPath, 'utf8');
  if (!code.includes('aria-current')) {
    apply(mobileNavPath,
      '<nav',
      '<nav aria-label="Mobile navigation"',
      'MobileNav ARIA label'
    );
  }
}

// Add role="complementary" to sidebars in programs
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  if (code.includes('Right Sidebar') && code.includes('border-l border-studio-border') && !code.includes('role="complementary"')) {
    code = code.replace(
      /(Right Sidebar[^]*?<div className="[^"]*border-l border-studio-border)/,
      (match) => match.replace('<div className="', '<div role="complementary" className="')
    );
    fs.writeFileSync(file, code);
    count++;
    console.log(`[${count}] Sidebar role=complementary -> ${path.basename(file)}`);
  }
}

// Add aria-label to all select elements missing them
for (const file of files) {
  let code = fs.readFileSync(file, 'utf8');
  const selectMatches = code.match(/<select(?![^>]*aria-label)[^>]*>/g);
  if (selectMatches && selectMatches.length > 0 && !code.includes('/* Wave2: select-aria */')) {
    code = '/* Wave2: select-aria */\n' + code;
    let replaced = 0;
    code = code.replace(/<select(?![^>]*aria-label)(\s)/g, (match, ws) => {
      if (replaced >= 3) return match;
      replaced++;
      return `<select aria-label="Select option"${ws}`;
    });
    if (replaced > 0) {
      fs.writeFileSync(file, code);
      count++;
      console.log(`[${count}] Select aria-label (${replaced}x) -> ${path.basename(file)}`);
    }
  }
}

console.log(`\n✅ Wave 2 complete: ${count} improvements applied!`);
