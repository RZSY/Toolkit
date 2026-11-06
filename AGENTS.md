# AGENTS.md — Developer & AI Agent Guidelines for Toolkit

This document provides architecture details, conventions, development workflows, and guidelines for AI agents and human contributors working within the **Toolkit** codebase.

---

## 1. Project Overview

**Toolkit** is an open-source, client-side suite of productivity and visualization tools. It runs completely inside the user's web browser without requiring a backend runtime, database server (aside from Firebase client-side auth/realtime database for the comments forum), or build step. It is deployed and statically hosted via GitHub Pages.

### Core Philosophy
- **Zero Build Step:** Native HTML5, modern CSS3, and standard ES6/JavaScript. Can be served via any static file server or opened directly.
- **Self-Contained Tools:** Each tool is modular and isolated in its own directory with dedicated HTML, CSS, and JavaScript.
- **Privacy & Offline First:** Core diagramming and charting tools operate 100% in-browser with zero telemetry or tracking.
- **Theme Consistency:** Universal dark and light mode support synchronized via `localStorage` across all pages.

---

## 2. Directory Structure

```text
Toolkit/
├── .git/
├── ico/                           # Shared icons, logos, and tool favicons
│   ├── tkico.jpg                  # Toolkit main logo
│   ├── csico.jpg                  # Chartsmith favicon
│   ├── efico.jpg                  # Entity Family favicon
│   ├── fsico.jpg                  # Flowchart Studio favicon
│   ├── tbico.jpg                  # Timeline Builder favicon
│   ├── jun.jpg                    # Storybook / character asset
│   └── nimbus.jpg                 # Storybook / character asset
├── about/                         # About & showcase page
│   ├── index.html                 # About page markup
│   ├── style.css                  # About page styles & layout
│   └── script.js                  # Theme switcher and icon carousel
├── comments/                      # Community comments & feedback section
│   ├── index.html                 # Comments markup & Firebase UI
│   ├── style.css                  # Comments & auth modal styles
│   ├── comments.js                # Firebase Authentication & Realtime DB logic
│   └── theme.js                   # Theme switcher for comments
├── tools/                         # Modular directory for all interactive tools
│   ├── chartsmith/                # Bar, line, pie, radar, Gantt chart builder
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── app.js
│   │   └── vendor/                # Chart.js, ChartDataLabels, jsPDF
│   ├── entity-family/             # Entity Relationship Diagram (ERD) Studio
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   ├── flowchart-studio/          # Flowchart & node-based diagram generator
│   │   ├── index.html
│   │   ├── style.css
│   │   └── app.js
│   └── timeline-generator/        # Chronological timeline designer
│       ├── index.html
│       ├── style.css
│       └── app.js
├── index.html                     # Central landing page & tool grid
├── style.css                      # Hub styling, CSS variables, & responsive grid
├── script.js                      # Hub live search, icon fallback, & theme logic
├── manual.pdf                     # Offline user documentation manual
├── README.md                      # Public project documentation
└── AGENTS.md                      # AI agent instructions and repository standards
```

---

## 3. Architecture & Conventions

### 3.1 Relative Paths & URL Hierarchy
Because tools reside inside `tools/<tool-name>/`, relative asset linking rules must be strictly maintained:

| Location | Path to Root Hub | Path to Icons (`ico/`) | Path to Sub-pages (`about/`, `comments/`) |
| :--- | :--- | :--- | :--- |
| **Root (`/`)** | `./index.html` | `ico/<file>` | `about/index.html`, `comments/index.html` |
| **Pages (`about/`, `comments/`)** | `../index.html` | `../ico/<file>` | `../about/index.html`, `../comments/index.html` |
| **Tools (`tools/<name>/`)** | `../../index.html` | `../../ico/<file>` | `../../about/index.html`, `../../comments/index.html` |

> [!IMPORTANT]
> Always verify relative paths when adding images, stylesheets, scripts, or navigation hyperlinks. Avoid absolute root `/` paths so the site remains compatible with nested subpath hosting (such as GitHub Pages repository URLs like `https://username.github.io/Toolkit/`).

### 3.2 Modular File Separation
- Monolithic HTML files with embedded `<style>` and `<script>` blocks are strictly forbidden.
- Each page or tool must maintain:
  - `index.html`: Semantic markup and structure only.
  - `style.css`: Visual styling, layout, variables, and responsive design.
  - `app.js` (or `script.js`): Functional logic, event listeners, and data manipulation.
  - `vendor/`: Bundled external scripts (e.g., Chart.js, jsPDF) when offline independence is needed.

### 3.3 Theming (Dark / Light Mode)
- Theme preference is stored in `localStorage.getItem('theme')` as `'dark'` or `'light'`.
- The active theme is applied via the `data-theme="dark"` attribute on the root `<html>` element.
- Default to user system preferences when no saved choice exists:
  ```javascript
  var initial = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  if (initial === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  ```
- CSS styling must support theme switching by using CSS custom variables defined under `:root` and `[data-theme="dark"]`.

### 3.4 Comments System
- Powered by Google Firebase Auth & Realtime Database using the Firebase Web Compat SDK.
- To prevent comment fragmentation across different URL query strings or trailing slashes, always define:
  ```html
  <script>window.TOOLKIT_PAGE_ID = 'comments';</script>
  ```
  prior to loading `comments.js`.

---

## 4. How to Add a New Tool

When creating a new utility or integrating an existing tool into the repository, follow this checklist:

1. **Create Directory Structure:**
   Create a dedicated subfolder under `tools/<tool-name>/`:
   - `tools/<tool-name>/index.html`
   - `tools/<tool-name>/style.css`
   - `tools/<tool-name>/app.js`
   - `tools/<tool-name>/vendor/` (if bundling vendor libraries)

2. **Add Header Navigation Back to Hub:**
   Ensure the tool includes an unobtrusive brand or link back to the toolkit hub:
   ```html
   <a href="../../index.html" class="brand" title="Back to Toolkit">← Toolkit</a>
   ```

3. **Provide Favicon and Assets:**
   - Place any dedicated 1:1 icon or favicon into `ico/<tool-abbreviation>ico.jpg`.
   - In `tools/<tool-name>/index.html`, link the favicon:
     ```html
     <link rel="icon" type="image/jpeg" href="../../ico/<tool-abbreviation>ico.jpg">
     ```

4. **Register in Hub Grid (`index.html`):**
   Add a new `.tile` card inside `<div class="tile-grid">` in root `index.html`:
   ```html
   <a class="tile" href="tools/<tool-name>/index.html" data-category="<category>">
       <div class="tile-icon">
           <img src="ico/<tool-abbreviation>ico.jpg" alt="<Tool Name> icon" loading="lazy">
           <span class="tile-fallback" aria-hidden="true"><First Letter></span>
       </div>
       <div class="tile-body">
           <h2 class="tile-title"><Tool Name></h2>
           <p class="tile-desc"><Short 1-2 sentence description></p>
           <div class="tile-tags">
               <span class="tag"><Tag 1></span>
               <span class="tag"><Tag 2></span>
           </div>
       </div>
   </a>
   ```

5. **Update About Carousel & Documentation:**
   - In `about/script.js`, register the icon and caption in the `slides` array:
     ```javascript
     { src: '../ico/<tool-abbreviation>ico.jpg', caption: '<Tool Name>' }
     ```
   - In `README.md`, add the new tool to the feature highlights and project structure tree.

---

## 5. Testing & Quality Assurance Verification

Before committing changes, execute the following verification steps:

### 5.1 JavaScript Syntax Verification
Run Node.js syntax verification across all scripts:
```powershell
Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

### 5.2 Link & Asset Integrity Check
Verify that all referenced assets (stylesheets, scripts, images, favicons) in every HTML file resolve to valid files on disk.

### 5.3 Headless Browser Execution
Start a local static server and run headless Edge or Chrome using Chrome DevTools Protocol (CDP) to confirm:
- Zero JavaScript console errors (`console.error` or unhandled exceptions).
- Zero network 404 or 500 response errors.
- Correct rendering of all primary DOM containers.

---

## 6. Git & Commit Guidelines

- **Commit Message Convention:** Use concise, imperative commit messages describing the purpose of the changes (e.g., `feat: Add new audio spectrogram tool`, `refactor: Modularize styles and scripts`, `fix: Correct relative favicon paths`).
- **Clean Working Tree:** Do not leave temporary test artifacts, scratch files, or unwanted logs in the workspace.
