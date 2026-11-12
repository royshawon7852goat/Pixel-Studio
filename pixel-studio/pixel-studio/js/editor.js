/**
 * Pixel Studio — Core Canvas Editor Engine
 * Manages image loading, non-destructive edit state, viewport zoom/pan,
 * geometric transforms, text layers, before/after comparison, and rendering.
 */
(function (global) {
  'use strict';

  const PixelStudio = (global.PixelStudio = global.PixelStudio || {});

  const PREVIEW_MAX_DIM = 1400;

  class Editor {
    constructor(canvasEl, historyManager) {
      this.displayCanvas = canvasEl;
      this.displayCtx = canvasEl.getContext('2d');
      this.history = historyManager;

      // Document canvases
      this.originalCanvas = null;
      this.baseCanvas = null;
      this.previewProxyCanvas = null;
      this.processedCanvas = document.createElement('canvas');
      this.compositeCanvas = document.createElement('canvas');

      // Metadata
      this.meta = {
        name: '',
        format: '—',
        originalWidth: 0,
        originalHeight: 0,
      };

      // Editable state
      this.state = this._createDefaultState();

      // Viewport & interaction
      this.zoom = 1;
      this.fitZoom = 1;
      this.panX = 0;
      this.panY = 0;
      this.activeTool = 'adjustments';
      this.panMode = false;
      this.compareMode = false;
      this.compareSplit = 0.5;
      this.selectedTextId = null;

      // Studio display settings
      this.settings = {
        canvasBg: 'checker-dark',
        smoothing: true,
        gridGuides: false,
      };

      this.cropTool = new PixelStudio.CropTool();

      // Callbacks
      this.onStateRender = null;
      this.onImageLoaded = null;
      this.onTextSelectionChange = null;
    }

    _createDefaultState() {
      return {
        adjustments: { ...PixelStudio.Filters.DEFAULT_ADJUSTMENTS },
        filter: 'none',
        filterIntensity: 100,
        effects: { ...PixelStudio.Filters.DEFAULT_EFFECTS },
        fineRotation: 0,
        textLayers: [],
      };
    }

    hasImage() {
      return Boolean(this.baseCanvas && this.baseCanvas.width > 0 && this.baseCanvas.height > 0);
    }

    /**
     * Clone a canvas into a fresh offscreen HTMLCanvasElement.
     * @param {HTMLCanvasElement} src
     * @returns {HTMLCanvasElement}
     */
    _cloneCanvas(src) {
      const c = document.createElement('canvas');
      c.width = src.width;
      c.height = src.height;
      c.getContext('2d').drawImage(src, 0, 0);
      return c;
    }

    /**
     * Rebuild downscaled proxy canvas for 60fps interactive slider scrubbing.
     */
    _rebuildPreviewProxy() {
      if (!this.baseCanvas) return;
      const w = this.baseCanvas.width;
      const h = this.baseCanvas.height;
      const maxSide = Math.max(w, h);

      if (maxSide <= PREVIEW_MAX_DIM) {
        this.previewProxyCanvas = this.baseCanvas;
        return;
      }

      const ratio = PREVIEW_MAX_DIM / maxSide;
      const pw = Math.max(1, Math.round(w * ratio));
      const ph = Math.max(1, Math.round(h * ratio));
      const proxy = document.createElement('canvas');
      proxy.width = pw;
      proxy.height = ph;
      const pCtx = proxy.getContext('2d');
      pCtx.imageSmoothingEnabled = true;
      pCtx.imageSmoothingQuality = 'high';
      pCtx.drawImage(this.baseCanvas, 0, 0, pw, ph);
      this.previewProxyCanvas = proxy;
    }

    /**
     * Load an image File object with MIME/decode error handling.
     * @param {File} file
     * @returns {Promise<void>}
     */
    async loadImageFile(file) {
      if (!file) throw new Error('No file provided.');

      const validExt = /\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(file.name || '');
      const isImgMime = file.type && file.type.startsWith('image/');
      if (!isImgMime && !validExt) {
        throw new Error('Unsupported file format. Please choose PNG, JPG, WEBP, GIF, BMP, or SVG.');
      }

      const url = URL.createObjectURL(file);
      try {
        const format = this._detectFormatLabel(file.type, file.name);
        await this.loadImageFromURL(url, file.name || 'image', format);
      } finally {
        URL.revokeObjectURL(url);
      }
    }

    _detectFormatLabel(mimeType, fileName) {
      if (mimeType && mimeType.includes('/')) {
        const sub = mimeType.split('/')[1].toUpperCase();
        if (sub === 'SVG+XML') return 'SVG';
        if (sub === 'JPEG') return 'JPG';
        return sub;
      }
      const match = (fileName || '').match(/\.([a-z0-9]+)$/i);
      return match ? match[1].toUpperCase() : 'IMAGE';
    }

    /**
     * Load an image from URL or DataURL and initialize editor document.
     * @param {string} url
     * @param {string} name
     * @param {string} format
     * @returns {Promise<void>}
     */
    loadImageFromURL(url, name = 'image.png', format = 'PNG') {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const w = img.naturalWidth || img.width;
          const h = img.naturalHeight || img.height;
          if (!w || !h) {
            reject(new Error('Image has invalid zero dimensions.'));
            return;
          }

          const orig = document.createElement('canvas');
          orig.width = w;
          orig.height = h;
          orig.getContext('2d').drawImage(img, 0, 0, w, h);

          this._initDocument(orig, name, format);
          resolve();
        };
        img.onerror = () => {
          reject(new Error('Failed to decode image. The file may be corrupted or unsupported.'));
        };
        img.src = url;
      });
    }

    /**
     * Create a new blank canvas document of specified dimensions and fill color.
     */
    createBlankCanvas(width, height, bgColor = 'transparent') {
      const w = Math.max(16, Math.min(8000, Math.round(width)));
      const h = Math.max(16, Math.min(8000, Math.round(height)));
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      if (bgColor && bgColor !== 'transparent') {
        const ctx = c.getContext('2d');
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, w, h);
      }
      this._initDocument(c, `canvas-${w}x${h}.png`, 'PNG');
    }

    _initDocument(canvas, name, format) {
      this.originalCanvas = this._cloneCanvas(canvas);
      this.baseCanvas = this._cloneCanvas(canvas);
      this.meta = {
        name,
        format,
        originalWidth: canvas.width,
        originalHeight: canvas.height,
      };
      this.state = this._createDefaultState();
      this.selectedTextId = null;
      this.compareMode = false;
      this.panX = 0;
      this.panY = 0;

      this._rebuildPreviewProxy();
      this.cropTool.init(this.baseCanvas.width, this.baseCanvas.height, this.cropTool.ratioKey);
      this.fitToViewport();

      this.history.clear();
      this.commitHistory('Open Image');

      if (typeof this.onImageLoaded === 'function') {
        this.onImageLoaded(this.meta);
      }
      this.render(false);
    }

    /**
     * Push current state to history manager.
     * @param {string} label
     */
    commitHistory(label) {
      if (!this.hasImage()) return;
      this.history.push(
        {
          baseCanvas: this.baseCanvas,
          ...this.state,
        },
        label
      );
    }

    /**
     * Restore a snapshot returned from HistoryManager.
     * @param {Object} snapshot
     */
    applySnapshot(snapshot) {
      if (!snapshot) return;
      const geomChanged =
        this.baseCanvas !== snapshot.baseCanvas ||
        this.baseCanvas.width !== snapshot.baseCanvas.width ||
        this.baseCanvas.height !== snapshot.baseCanvas.height;

      this.baseCanvas = snapshot.baseCanvas;
      this.state = {
        adjustments: { ...snapshot.adjustments },
        filter: snapshot.filter,
        filterIntensity: snapshot.filterIntensity,
        effects: { ...snapshot.effects },
        fineRotation: snapshot.fineRotation,
        textLayers: snapshot.textLayers.map((l) => ({ ...l })),
      };

      if (this.selectedTextId && !this.state.textLayers.some((l) => l.id === this.selectedTextId)) {
        this.selectedTextId = this.state.textLayers[0]?.id || null;
      }

      if (geomChanged) {
        this._rebuildPreviewProxy();
        this.cropTool.init(this.baseCanvas.width, this.baseCanvas.height, this.cropTool.ratioKey);
        this.fitToViewport();
      }

      if (typeof this.onTextSelectionChange === 'function') {
        this.onTextSelectionChange(this.getSelectedTextLayer());
      }

      this.render(false);
    }

    /**
     * Reset color adjustments, filter, effects, and straighten angle while keeping geometry.
     */
    resetAdjustments() {
      if (!this.hasImage()) return;
      this.state.adjustments = { ...PixelStudio.Filters.DEFAULT_ADJUSTMENTS };
      this.state.filter = 'none';
      this.state.filterIntensity = 100;
      this.state.effects = { ...PixelStudio.Filters.DEFAULT_EFFECTS };
      this.state.fineRotation = 0;
      this.commitHistory('Reset Adjustments');
      this.render(false);
    }

    /**
     * Restore exact original uploaded image and clear all edits/layers (undoable).
     */
    restoreOriginal() {
      if (!this.originalCanvas) return;
      this.baseCanvas = this._cloneCanvas(this.originalCanvas);
      this.state = this._createDefaultState();
      this.selectedTextId = null;
      this.compareMode = false;
      this._rebuildPreviewProxy();
      this.cropTool.init(this.baseCanvas.width, this.baseCanvas.height, 'free');
      this.fitToViewport();
      this.commitHistory('Restore Original');
      if (typeof this.onTextSelectionChange === 'function') {
        this.onTextSelectionChange(null);
      }
      this.render(false);
    }

    // =========================================================================
    // GEOMETRIC TRANSFORMS
    // =========================================================================

    /**
     * Rotate baseCanvas by 90 degrees left (-1) or right (+1).
     * @param {-1|1} direction
     */
    rotate90(direction) {
      if (!this.hasImage()) return;
      const src = this.baseCanvas;
      const out = document.createElement('canvas');
      out.width = src.height;
      out.height = src.width;
      const ctx = out.getContext('2d');
      ctx.save();
      if (direction > 0) {
        ctx.translate(out.width, 0);
        ctx.rotate(Math.PI / 2);
      } else {
        ctx.translate(0, out.height);
        ctx.rotate(-Math.PI / 2);
      }
      ctx.drawImage(src, 0, 0);
      ctx.restore();

      // Rotate text layer coordinates cleanly
      this.state.textLayers = this.state.textLayers.map((layer) => {
        const oldX = layer.xPct;
        const oldY = layer.yPct;
        return direction > 0
          ? { ...layer, xPct: 100 - oldY, yPct: oldX }
          : { ...layer, xPct: oldY, yPct: 100 - oldX };
      });

      this.baseCanvas = out;
      this._rebuildPreviewProxy();
      this.cropTool.init(out.width, out.height, this.cropTool.ratioKey);
      this.fitToViewport();
      this.commitHistory(direction > 0 ? 'Rotate Right 90°' : 'Rotate Left 90°');
      this.render(false);
    }

    /**
     * Flip baseCanvas horizontally ('h') or vertically ('v').
     * @param {'h'|'v'} axis
     */
    flip(axis) {
      if (!this.hasImage()) return;
      const src = this.baseCanvas;
      const out = document.createElement('canvas');
      out.width = src.width;
      out.height = src.height;
      const ctx = out.getContext('2d');
      ctx.save();
      if (axis === 'h') {
        ctx.translate(out.width, 0);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(0, out.height);
        ctx.scale(1, -1);
      }
      ctx.drawImage(src, 0, 0);
      ctx.restore();

      this.state.textLayers = this.state.textLayers.map((layer) => ({
        ...layer,
        xPct: axis === 'h' ? 100 - layer.xPct : layer.xPct,
        yPct: axis === 'v' ? 100 - layer.yPct : layer.yPct,
      }));

      this.baseCanvas = out;
      this._rebuildPreviewProxy();
      this.commitHistory(axis === 'h' ? 'Flip Horizontal' : 'Flip Vertical');
      this.render(false);
    }

    /**
     * Resize baseCanvas to explicit pixel width & height with high-quality resampling.
     * @param {number} newW
     * @param {number} newH
     */
    resizeImage(newW, newH) {
      if (!this.hasImage()) return;
      const w = Math.max(1, Math.min(10000, Math.round(newW)));
      const h = Math.max(1, Math.min(10000, Math.round(newH)));
      const oldW = this.baseCanvas.width;
      const oldH = this.baseCanvas.height;
      if (w === oldW && h === oldH) return;

      const out = document.createElement('canvas');
      out.width = w;
      out.height = h;
      const ctx = out.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.baseCanvas, 0, 0, w, h);

      // Scale font sizes proportionally to width change
      const fontScale = w / oldW;
      this.state.textLayers = this.state.textLayers.map((l) => ({
        ...l,
        fontSize: Math.max(8, Math.round(l.fontSize * fontScale)),
      }));

      this.baseCanvas = out;
      this._rebuildPreviewProxy();
      this.cropTool.init(w, h, this.cropTool.ratioKey);
      this.fitToViewport();
      this.commitHistory(`Resize ${w}×${h}`);
      this.render(false);
    }

    /**
     * Commit the active CropTool selection onto baseCanvas.
     */
    applyCrop() {
      if (!this.hasImage()) return;
      const { canvas, textLayers } = this.cropTool.applyCrop(this.baseCanvas, this.state.textLayers);
      this.baseCanvas = canvas;
      this.state.textLayers = textLayers;
      this._rebuildPreviewProxy();
      this.cropTool.init(canvas.width, canvas.height, this.cropTool.ratioKey);
      this.fitToViewport();
      this.commitHistory(`Crop ${canvas.width}×${canvas.height}`);
      this.render(false);
    }

    // =========================================================================
    // TEXT LAYERS
    // =========================================================================

    addTextLayer(text = 'Pixel Studio') {
      if (!this.hasImage()) return null;
      const defaultSize = Math.max(24, Math.min(140, Math.round(this.baseCanvas.width * 0.065)));
      const layer = {
        id: `txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text,
        xPct: 50,
        yPct: 50,
        fontSize: defaultSize,
        fontFamily: 'Inter, sans-serif',
        color: '#ffffff',
        bold: true,
        italic: false,
        shadow: true,
      };
      this.state.textLayers.push(layer);
      this.selectedTextId = layer.id;
      this.commitHistory('Add Text');
      if (typeof this.onTextSelectionChange === 'function') {
        this.onTextSelectionChange(layer);
      }
      this.render(false);
      return layer;
    }

    getSelectedTextLayer() {
      return this.state.textLayers.find((l) => l.id === this.selectedTextId) || null;
    }

    selectTextLayer(id) {
      this.selectedTextId = id;
      if (typeof this.onTextSelectionChange === 'function') {
        this.onTextSelectionChange(this.getSelectedTextLayer());
      }
      this.render(false);
    }

    deleteSelectedTextLayer() {
      if (!this.selectedTextId) return;
      this.state.textLayers = this.state.textLayers.filter((l) => l.id !== this.selectedTextId);
      this.selectedTextId = this.state.textLayers[0]?.id || null;
      this.commitHistory('Delete Text');
      if (typeof this.onTextSelectionChange === 'function') {
        this.onTextSelectionChange(this.getSelectedTextLayer());
      }
      this.render(false);
    }

    /**
     * Draw all text layers onto a target 2D canvas context.
     * Scales font size proportionally when drawing on preview proxy vs full-res.
     */
    _drawTextLayers(ctx, targetW, targetH) {
      if (!this.state.textLayers.length) return;
      const scale = targetW / this.baseCanvas.width;

      for (const layer of this.state.textLayers) {
        const x = (layer.xPct / 100) * targetW;
        const y = (layer.yPct / 100) * targetH;
        const fontSize = Math.max(6, layer.fontSize * scale);
        const weight = layer.bold ? '700' : '400';
        const style = layer.italic ? 'italic' : 'normal';

        ctx.save();
        ctx.font = `${style} ${weight} ${fontSize}px ${layer.fontFamily}`;
        ctx.fillStyle = layer.color || '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (layer.shadow) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
          ctx.shadowBlur = Math.max(4, fontSize * 0.16);
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = Math.max(2, fontSize * 0.06);
        }

        const lines = (layer.text || '').split('\n');
        const lineHeight = fontSize * 1.18;
        const startY = y - ((lines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], x, startY + i * lineHeight);
        }
        ctx.restore();
      }
    }

    /**
     * Measure bounding box of a text layer in base image pixel coordinates.
     */
    _measureTextLayerBounds(layer) {
      const ctx = this.displayCtx;
      const weight = layer.bold ? '700' : '400';
      const style = layer.italic ? 'italic' : 'normal';
      ctx.save();
      ctx.font = `${style} ${weight} ${layer.fontSize}px ${layer.fontFamily}`;
      const lines = (layer.text || ' ').split('\n');
      let maxW = 40;
      for (const line of lines) {
        maxW = Math.max(maxW, ctx.measureText(line).width);
      }
      ctx.restore();

      const lineHeight = layer.fontSize * 1.18;
      const totalH = Math.max(layer.fontSize, lines.length * lineHeight);
      const cx = (layer.xPct / 100) * this.baseCanvas.width;
      const cy = (layer.yPct / 100) * this.baseCanvas.height;

      return {
        x: cx - maxW / 2 - 12,
        y: cy - totalH / 2 - 8,
        w: maxW + 24,
        h: totalH + 16,
      };
    }

    hitTestTextLayer(imgX, imgY) {
      for (let i = this.state.textLayers.length - 1; i >= 0; i--) {
        const layer = this.state.textLayers[i];
        const b = this._measureTextLayerBounds(layer);
        if (imgX >= b.x && imgX <= b.x + b.w && imgY >= b.y && imgY <= b.y + b.h) {
          return layer;
        }
      }
      return null;
    }

    // =========================================================================
    // VIEWPORT ZOOM, PAN & COORDINATE MAPPING
    // =========================================================================

    resizeDisplayCanvas() {
      const parent = this.displayCanvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const targetW = Math.max(1, Math.floor(rect.width * dpr));
      const targetH = Math.max(1, Math.floor(rect.height * dpr));

      if (this.displayCanvas.width !== targetW || this.displayCanvas.height !== targetH) {
        this.displayCanvas.width = targetW;
        this.displayCanvas.height = targetH;
      }
      return { width: rect.width, height: rect.height, dpr };
    }

    fitToViewport() {
      if (!this.hasImage()) return;
      const parent = this.displayCanvas.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const pad = 52;
      const availW = Math.max(80, rect.width - pad);
      const availH = Math.max(80, rect.height - pad);
      const scale = Math.min(availW / this.baseCanvas.width, availH / this.baseCanvas.height);

      this.fitZoom = Math.max(0.05, Math.min(4, scale));
      this.zoom = this.fitZoom;
      this.panX = 0;
      this.panY = 0;
      this.render(false);
    }

    setZoom(newZoom) {
      if (!this.hasImage()) return;
      this.zoom = Math.max(0.08, Math.min(8, newZoom));
      this.render(false);
    }

    zoomAtViewportPoint(factor, vx, vy) {
      if (!this.hasImage()) return;
      const prevZoom = this.zoom;
      const nextZoom = Math.max(0.08, Math.min(8, prevZoom * factor));
      if (Math.abs(nextZoom - prevZoom) < 0.0001) return;

      const parent = this.displayCanvas.parentElement;
      const rect = parent.getBoundingClientRect();
      const cx = rect.width / 2 + this.panX;
      const cy = rect.height / 2 + this.panY;

      const ratio = nextZoom / prevZoom;
      this.panX += (vx - cx) * (1 - ratio);
      this.panY += (vy - cy) * (1 - ratio);
      this.zoom = nextZoom;
      this.render(false);
    }

    getScreenTransform() {
      const parent = this.displayCanvas.parentElement;
      const rect = parent.getBoundingClientRect();
      const imgW = this.baseCanvas.width;
      const imgH = this.baseCanvas.height;
      const drawW = imgW * this.zoom;
      const drawH = imgH * this.zoom;
      const offsetX = (rect.width - drawW) / 2 + this.panX;
      const offsetY = (rect.height - drawH) / 2 + this.panY;
      return {
        offsetX,
        offsetY,
        scale: this.zoom,
        drawW,
        drawH,
        viewportW: rect.width,
        viewportH: rect.height,
      };
    }

    viewportToImageCoords(vx, vy) {
      const t = this.getScreenTransform();
      return {
        x: (vx - t.offsetX) / t.scale,
        y: (vy - t.offsetY) / t.scale,
      };
    }

    // =========================================================================
    // RENDER PIPELINE (PREVIEW & FULL-RES EXPORT)
    // =========================================================================

    /**
     * Compose processedCanvas + fineRotation + textLayers into targetCanvas.
     */
    _composeFinal(srcCanvas, targetCanvas, state, blurScale) {
      PixelStudio.Filters.applyPixelPipeline(srcCanvas, this.processedCanvas, state, blurScale);

      const w = this.processedCanvas.width;
      const h = this.processedCanvas.height;
      if (targetCanvas.width !== w || targetCanvas.height !== h) {
        targetCanvas.width = w;
        targetCanvas.height = h;
      }

      const ctx = targetCanvas.getContext('2d');
      ctx.clearRect(0, 0, w, h);

      if (state.fineRotation && Math.abs(state.fineRotation) > 0.01) {
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate((state.fineRotation * Math.PI) / 180);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(this.processedCanvas, -w / 2, -h / 2);
        ctx.restore();
      } else {
        ctx.drawImage(this.processedCanvas, 0, 0);
      }

      this._drawTextLayers(ctx, w, h);
    }

    /**
     * Render full-resolution edited canvas for lossless export.
     * @returns {HTMLCanvasElement|null}
     */
    renderFullResolutionForExport() {
      if (!this.hasImage()) return null;
      const exportCanvas = document.createElement('canvas');
      this._composeFinal(this.baseCanvas, exportCanvas, this.state, 1);
      return exportCanvas;
    }

    _drawCheckerboard(ctx, x, y, w, h, mode) {
      if (mode === 'solid') {
        ctx.fillStyle = '#181c28';
        ctx.fillRect(x, y, w, h);
        return;
      }

      const size = 12;
      const c1 = mode === 'checker-light' ? '#e2e8f0' : '#1b202e';
      const c2 = mode === 'checker-light' ? '#cbd5e1' : '#252b3d';

      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, w, h);
      ctx.clip();

      ctx.fillStyle = c1;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = c2;

      const cols = Math.ceil(w / size);
      const rows = Math.ceil(h / size);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if ((r + c) % 2 === 1) {
            ctx.fillRect(x + c * size, y + r * size, size, size);
          }
        }
      }
      ctx.restore();
    }

    /**
     * Main viewport render loop.
     * @param {boolean} [isInteractive=false] Use fast preview proxy during live slider scrubbing
     */
    render(isInteractive = false) {
      const dims = this.resizeDisplayCanvas();
      if (!dims) return;

      const ctx = this.displayCtx;
      const dpr = dims.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, dims.width, dims.height);

      if (!this.hasImage()) {
        if (typeof this.onStateRender === 'function') this.onStateRender();
        return;
      }

      const useProxy = isInteractive && this.previewProxyCanvas !== this.baseCanvas;
      const src = useProxy ? this.previewProxyCanvas : this.baseCanvas;
      const blurScale = src.width / this.baseCanvas.width;

      this._composeFinal(src, this.compositeCanvas, this.state, blurScale);

      const t = this.getScreenTransform();
      const imgRect = { x: t.offsetX, y: t.offsetY, w: t.drawW, h: t.drawH };

      // Drop shadow behind artboard
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 32;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = '#000';
      ctx.fillRect(imgRect.x, imgRect.y, imgRect.w, imgRect.h);
      ctx.restore();

      // Transparency checkerboard
      this._drawCheckerboard(ctx, imgRect.x, imgRect.y, imgRect.w, imgRect.h, this.settings.canvasBg);

      ctx.imageSmoothingEnabled = Boolean(this.settings.smoothing);
      ctx.imageSmoothingQuality = 'high';

      if (this.compareMode && this.originalCanvas) {
        const splitX = imgRect.x + imgRect.w * this.compareSplit;

        // Left side: Original Image fitted into artboard
        ctx.save();
        ctx.beginPath();
        ctx.rect(imgRect.x, imgRect.y, Math.max(0, splitX - imgRect.x), imgRect.h);
        ctx.clip();
        const origRatio = this.originalCanvas.width / this.originalCanvas.height;
        const boxRatio = imgRect.w / imgRect.h;
        let ow = imgRect.w;
        let oh = imgRect.h;
        if (origRatio > boxRatio) {
          oh = ow / origRatio;
        } else {
          ow = oh * origRatio;
        }
        const ox = imgRect.x + (imgRect.w - ow) / 2;
        const oy = imgRect.y + (imgRect.h - oh) / 2;
        ctx.drawImage(this.originalCanvas, ox, oy, ow, oh);
        ctx.restore();

        // Right side: Edited Image
        ctx.save();
        ctx.beginPath();
        ctx.rect(splitX, imgRect.y, Math.max(0, imgRect.x + imgRect.w - splitX), imgRect.h);
        ctx.clip();
        ctx.drawImage(this.compositeCanvas, imgRect.x, imgRect.y, imgRect.w, imgRect.h);
        ctx.restore();

        // Comparison Divider Line & Handle
        ctx.save();
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(splitX, imgRect.y);
        ctx.lineTo(splitX, imgRect.y + imgRect.h);
        ctx.stroke();

        const cy = imgRect.y + imgRect.h / 2;
        ctx.fillStyle = '#8b5cf6';
        ctx.beginPath();
        ctx.arc(splitX, cy, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('‹ ›', splitX, cy + 0.5);
        ctx.restore();
      } else {
        ctx.drawImage(this.compositeCanvas, imgRect.x, imgRect.y, imgRect.w, imgRect.h);
      }

      // Optional Center Guides
      if (this.settings.gridGuides) {
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(imgRect.x + imgRect.w / 2, imgRect.y);
        ctx.lineTo(imgRect.x + imgRect.w / 2, imgRect.y + imgRect.h);
        ctx.moveTo(imgRect.x, imgRect.y + imgRect.h / 2);
        ctx.lineTo(imgRect.x + imgRect.w, imgRect.y + imgRect.h / 2);
        ctx.stroke();
        ctx.restore();
      }

      // Active Text Layer Selection Box
      if (this.activeTool === 'text' && this.selectedTextId && !this.compareMode) {
        const layer = this.getSelectedTextLayer();
        if (layer) {
          const b = this._measureTextLayerBounds(layer);
          const sx = t.offsetX + b.x * t.scale;
          const sy = t.offsetY + b.y * t.scale;
          const sw = b.w * t.scale;
          const sh = b.h * t.scale;
          ctx.save();
          ctx.strokeStyle = '#a855f7';
          ctx.setLineDash([5, 4]);
          ctx.lineWidth = 1.5;
          ctx.strokeRect(sx, sy, sw, sh);
          ctx.restore();
        }
      }

      // Active Crop Overlay
      if (this.activeTool === 'crop' && !this.compareMode) {
        this.cropTool.renderOverlay(ctx, t, imgRect);
      }

      if (typeof this.onStateRender === 'function') {
        this.onStateRender();
      }
    }
  }

  PixelStudio.Editor = Editor;
})(window);
