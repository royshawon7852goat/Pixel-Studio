# Pixel Studio

A fast, dark-themed, browser-based image editing application built with **HTML5**, **CSS3**, **Vanilla JavaScript**, and the **HTML5 Canvas API**. All image processing runs locally in your browser with zero external uploads.

## Features

- **Image Loading & Creation**
  - File upload picker (`PNG`, `JPG`, `WEBP`, `GIF`, `BMP`, `SVG`)
  - Drag-and-drop directly onto the workspace
  - Clipboard image paste (`Ctrl+V`)
  - Built-in sample landscape photo & blank custom-size canvas creator
- **8 Real-Time Adjustments** (slider + numeric input, double-click slider to reset)
  - Brightness, Contrast, Saturation, Exposure, Temperature, Hue, Blur, Sharpen
- **9 Creative Filters + Original** (with live preview thumbnails & intensity slider)
  - Vintage, Cinematic, Grayscale, Black & White, Warm, Cool, Retro, Dramatic, Sepia
- **Optical & Stylized Effects**
  - Vignette, Film Grain, Matte Fade, Pixelate, Invert Colors
- **Interactive Crop & Transform**
  - Free, Square (`1:1`), `4:3`, and `16:9` aspect-locked crop with rule-of-thirds overlay
  - Rotate Left (`-90°`), Rotate Right (`+90°`), Straighten (`-45°` to `+45°`), Flip Horizontal & Vertical
  - High-quality Resize by pixel width & height with aspect ratio lock and scale presets
- **Text Layer Tool**
  - Add multiple text layers, edit copy, change font family, size, color, bold/italic/drop-shadow
  - Drag text directly on the canvas or position via X/Y percentage controls
- **Non-Destructive History & Comparison**
  - Multi-step Undo / Redo (`Ctrl+Z` / `Ctrl+Y`) with clickable history timeline
  - Interactive Before/After split-screen comparison (`\` key or **Compare Original** button)
  - Reset Adjustments & Restore Original Image
- **Full-Resolution Export**
  - Export edited canvas as **PNG**, **JPG**, or **WEBP** with adjustable quality and live file size estimation

## Project Structure

```text
pixel-studio/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js
│   ├── editor.js
│   ├── filters.js
│   ├── history.js
│   ├── crop.js
│   └── export.js
├── assets/
│   ├── icons/
│   │   └── logo.svg
│   └── images/
│       └── sample-photo.png
└── README.md
```

## Running with VS Code Live Server

1. Open the `pixel-studio` folder in **Visual Studio Code**.
2. Install/enable the **Live Server** extension (`ritwickdey.LiveServer`).
3. Right-click `index.html` and choose **Open with Live Server**.

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+E` | Open Export modal |
| `Ctrl+0` | Fit image to screen |
| `+` / `-` | Zoom in / out |
| `Space` + Drag | Pan canvas |
| `\` | Toggle Before/After comparison |
| `Enter` | Apply active crop |
| `Escape` | Close open modal |
