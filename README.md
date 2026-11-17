# Voltline — Live EV Factory

A live 3D EV factory dashboard that plays like a factory tycoon game. Built with plain HTML, CSS and JavaScript plus [Three.js](https://threejs.org) loaded from a CDN. There is **no build step and nothing to install**.

## Project structure

```
voltline/
├── index.html        Page markup and the Three.js import map
├── css/styles.css    Dashboard styles (glass panels, light and dark themes, mobile layout)
├── js/main.js        3D world, simulation, camera and dashboard logic
├── js/boot.js        Shows a message if Three.js or WebGL fails to load
├── favicon.svg
├── package.json      Only a local preview script (no dependencies)
└── vercel.json       Vercel settings for a static site
```

## Run it locally

`js/main.js` is an ES module, so the page has to be served over `http://`. Double-clicking `index.html` (a `file://` address) will not work.

Pick one:

- **VS Code Live Server:** open the folder in VS Code, install the recommended *Live Server* extension when prompted, then right-click `index.html` → **Open with Live Server**.
- **Node.js (18+):** run `npm run dev` and open http://localhost:3000.
- **Python:** run `python -m http.server 3000` and open http://localhost:3000.

An internet connection is needed because Three.js and the fonts load from `cdn.jsdelivr.net` and Google Fonts.

## Put it on GitHub

```bash
cd voltline
git init
git add .
git commit -m "Voltline: live 3D EV factory dashboard"
git branch -M main
git remote add origin https://github.com/<your-username>/voltline.git
git push -u origin main
```

Create the empty `voltline` repository on GitHub first, without a README, so the first push doesn't conflict.

## Deploy on Vercel

1. Go to https://vercel.com/new and import the GitHub repository.
2. Framework Preset: **Other**. Leave Build Command and Output Directory empty, and leave Root Directory as `./`.
3. Click **Deploy**.

Every push to `main` then redeploys automatically.

Or from the terminal: `npx vercel` (preview), then `npx vercel --prod`.

## Controls

| Action | Mouse | Touch |
| --- | --- | --- |
| Pan | Left-drag | One-finger drag |
| Rotate | Right-drag | Two-finger twist |
| Zoom | Scroll | Pinch |
| Inspect | Click a station, robot, cart or car | Tap |

Press `/` to search and `Esc` to clear the selection. Dragging stops the camera following the selected object; press **Follow** to follow it again.

## Notes

- The line runs as a 4× time-lapse. A car body moves station to station every 13 s, while the dashboard shows the realistic 52 s takt.
- Day or night on load follows the viewer's local clock. Use the sun/moon button to switch.
- Weather (Clear, Monsoon, Winter fog, Heatwave) changes the outdoor yard and test track: rain, wet asphalt, fog banks, snow, heat haze, track speed limits and charger derating.
- VINs, cycle times, OEE and pack sizes are realistic but simulated. "Cars built today" starts from an estimate based on the time since 06:00.
- To change the Three.js version, edit the two URLs in the import map in `index.html`.
- Debug handle in the browser console: `__voltline.warp(60)` fast-forwards the simulation 60 seconds.
