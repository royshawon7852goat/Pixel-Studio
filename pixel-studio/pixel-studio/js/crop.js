/**
 * Pixel Studio — Interactive Crop Tool
 * Manages crop rectangle geometry, aspect ratio locking (Free, 1:1, 4:3, 16:9),
 * canvas overlay rendering, pointer dragging, and full-resolution pixel cropping.
 */
(function (global) {
  'use strict';

  const PixelStudio = (global.PixelStudio = global.PixelStudio || {});

  const RATIOS = {
    free: null,
    '1:1': 1,
    '4:3': 4 / 3,
    '16:9': 16 / 9,
  };

  class CropTool {
    constructor() {
      this.imgWidth = 0;
      this.imgHeight = 0;
      this.ratioKey = 'free';
      this.rect = { x: 0, y: 0, width: 0, height: 0 };
      this.minSize = 20;
      this.activeHandle = null;
      this.dragStartImg = null;
      this.dragStartRect = null;
    }

    /**
     * Initialize crop bounds for a given image dimension.
     * @param {number} imgW
     * @param {number} imgH
     * @param {string} [ratioKey='free']
     */
    init(imgW, imgH, ratioKey = 'free') {
      this.imgWidth = imgW;
      this.imgHeight = imgH;
      this.setRatio(ratioKey, true);
    }

    /**
     * Set aspect ratio constraint and adjust the current crop box to fit.
     * @param {string} ratioKey
     * @param {boolean} [resetToFull=false]
     */
    setRatio(ratioKey, resetToFull = false) {
      this.ratioKey = ratioKey in RATIOS ? ratioKey : 'free';
      const targetRatio = RATIOS[this.ratioKey];

      if (!this.imgWidth || !this.imgHeight) return;

      if (resetToFull || this.rect.width === 0) {
        const pad = targetRatio ? 0.92 : 0.9;
        const maxW = this.imgWidth * pad;
        const maxH = this.imgHeight * pad;

        let w = maxW;
        let h = maxH;
        if (targetRatio) {
          if (w / h > targetRatio) {
            w = h * targetRatio;
          } else {
            h = w / targetRatio;
          }
        }
        this.rect = {
          x: Math.round((this.imgWidth - w) / 2),
          y: Math.round((this.imgHeight - h) / 2),
          width: Math.max(this.minSize, Math.round(w)),
          height: Math.max(this.minSize, Math.round(h)),
        };
        return;
      }

      if (targetRatio) {
        const cx = this.rect.x + this.rect.width / 2;
        const cy = this.rect.y + this.rect.height / 2;
        let w = this.rect.width;
        let h = w / targetRatio;
        if (h > this.imgHeight) {
          h = this.imgHeight * 0.92;
          w = h * targetRatio;
        }
        if (w > this.imgWidth) {
          w = this.imgWidth * 0.92;
          h = w / targetRatio;
        }
        const x = Math.max(0, Math.min(this.imgWidth - w, cx - w / 2));
        const y = Math.max(0, Math.min(this.imgHeight - h, cy - h / 2));
        this.rect = {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.max(this.minSize, Math.round(w)),
          height: Math.max(this.minSize, Math.round(h)),
        };
      }
    }

    /**
     * Detect which crop handle (or body) is under a viewport canvas coordinate.
     * @param {number} vx Viewport X
     * @param {number} vy Viewport Y
     * @param {Object} transform { offsetX, offsetY, scale }
     * @returns {string|null} Handle name or 'move' or null
     */
    hitTest(vx, vy, transform) {
      const sx = transform.offsetX + this.rect.x * transform.scale;
      const sy = transform.offsetY + this.rect.y * transform.scale;
      const sw = this.rect.width * transform.scale;
      const sh = this.rect.height * transform.scale;
      const r = 12;

      const handles = [
        { id: 'nw', x: sx, y: sy },
        { id: 'n', x: sx + sw / 2, y: sy },
        { id: 'ne', x: sx + sw, y: sy },
        { id: 'e', x: sx + sw, y: sy + sh / 2 },
        { id: 'se', x: sx + sw, y: sy + sh },
        { id: 's', x: sx + sw / 2, y: sy + sh },
        { id: 'sw', x: sx, y: sy + sh },
        { id: 'w', x: sx, y: sy + sh / 2 },
      ];

      for (const h of handles) {
        if (Math.abs(vx - h.x) <= r && Math.abs(vy - h.y) <= r) {
          return h.id;
        }
      }

      if (vx >= sx && vx <= sx + sw && vy >= sy && vy <= sy + sh) {
        return 'move';
      }
      return null;
    }

    getCursorForHandle(handle) {
      const map = {
        nw: 'nwse-resize',
        se: 'nwse-resize',
        ne: 'nesw-resize',
        sw: 'nesw-resize',
        n: 'ns-resize',
        s: 'ns-resize',
        e: 'ew-resize',
        w: 'ew-resize',
        move: 'move',
      };
      return map[handle] || 'crosshair';
    }

    beginDrag(handle, imgX, imgY) {
      this.activeHandle = handle;
      this.dragStartImg = { x: imgX, y: imgY };
      this.dragStartRect = { ...this.rect };
    }

    updateDrag(imgX, imgY) {
      if (!this.activeHandle || !this.dragStartRect) return;
      const dx = imgX - this.dragStartImg.x;
      const dy = imgY - this.dragStartImg.y;
      const orig = this.dragStartRect;
      const ratio = RATIOS[this.ratioKey];
      const min = Math.min(this.minSize, this.imgWidth, this.imgHeight);

      if (this.activeHandle === 'move') {
        const nx = Math.max(0, Math.min(this.imgWidth - orig.width, orig.x + dx));
        const ny = Math.max(0, Math.min(this.imgHeight - orig.height, orig.y + dy));
        this.rect.x = Math.round(nx);
        this.rect.y = Math.round(ny);
        return;
      }

      let left = orig.x;
      let top = orig.y;
      let right = orig.x + orig.width;
      let bottom = orig.y + orig.height;

      const h = this.activeHandle;
      if (h.includes('w')) left = Math.max(0, Math.min(right - min, orig.x + dx));
      if (h.includes('e')) right = Math.min(this.imgWidth, Math.max(left + min, orig.x + orig.width + dx));
      if (h.includes('n')) top = Math.max(0, Math.min(bottom - min, orig.y + dy));
      if (h.includes('s')) bottom = Math.min(this.imgHeight, Math.max(top + min, orig.y + orig.height + dy));

      if (ratio) {
        let w = right - left;
        let height = bottom - top;

        if (h === 'n' || h === 's') {
          w = height * ratio;
          const cx = (orig.x + orig.x + orig.width) / 2;
          left = cx - w / 2;
          right = cx + w / 2;
          if (left < 0) {
            left = 0;
            right = w;
          }
          if (right > this.imgWidth) {
            right = this.imgWidth;
            left = this.imgWidth - w;
          }
          if (left < 0) {
            left = 0;
            right = this.imgWidth;
            height = (right - left) / ratio;
            if (h === 'n') top = bottom - height;
            else bottom = top + height;
          }
        } else if (h === 'e' || h === 'w') {
          height = w / ratio;
          const cy = (orig.y + orig.y + orig.height) / 2;
          top = cy - height / 2;
          bottom = cy + height / 2;
          if (top < 0) {
            top = 0;
            bottom = height;
          }
          if (bottom > this.imgHeight) {
            bottom = this.imgHeight;
            top = this.imgHeight - height;
          }
          if (top < 0) {
            top = 0;
            bottom = this.imgHeight;
            w = (bottom - top) * ratio;
            if (h === 'w') left = right - w;
            else right = left + w;
          }
        } else {
          // Corner handle: adjust based on dominant dimension while staying inside image bounds
          if (w / height > ratio) {
            height = w / ratio;
          } else {
            w = height * ratio;
          }

          if (h.includes('n')) top = bottom - height;
          else bottom = top + height;

          if (h.includes('w')) left = right - w;
          else right = left + w;

          // Clamp inside image bounds while preserving aspect ratio
          if (left < 0) {
            left = 0;
            w = right - left;
            height = w / ratio;
            if (h.includes('n')) top = bottom - height;
            else bottom = top + height;
          }
          if (right > this.imgWidth) {
            right = this.imgWidth;
            w = right - left;
            height = w / ratio;
            if (h.includes('n')) top = bottom - height;
            else bottom = top + height;
          }
          if (top < 0) {
            top = 0;
            height = bottom - top;
            w = height * ratio;
            if (h.includes('w')) left = right - w;
            else right = left + w;
          }
          if (bottom > this.imgHeight) {
            bottom = this.imgHeight;
            height = bottom - top;
            w = height * ratio;
            if (h.includes('w')) left = right - w;
            else right = left + w;
          }
        }
      }

      this.rect = {
        x: Math.round(Math.max(0, left)),
        y: Math.round(Math.max(0, top)),
        width: Math.max(min, Math.round(right - left)),
        height: Math.max(min, Math.round(bottom - top)),
      };
    }

    endDrag() {
      this.activeHandle = null;
      this.dragStartImg = null;
      this.dragStartRect = null;
    }

    /**
     * Render the interactive crop mask, rule-of-thirds grid, and handles on the display canvas.
     */
    renderOverlay(ctx, transform, imgScreenRect) {
      const sx = transform.offsetX + this.rect.x * transform.scale;
      const sy = transform.offsetY + this.rect.y * transform.scale;
      const sw = this.rect.width * transform.scale;
      const sh = this.rect.height * transform.scale;

      ctx.save();

      // Darken area outside crop selection (using evenodd clip)
      ctx.fillStyle = 'rgba(5, 7, 12, 0.65)';
      ctx.beginPath();
      ctx.rect(imgScreenRect.x, imgScreenRect.y, imgScreenRect.w, imgScreenRect.h);
      ctx.rect(sx, sy, sw, sh);
      ctx.fill('evenodd');

      // Rule of thirds grid inside crop rect
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(sx + sw / 3, sy);
      ctx.lineTo(sx + sw / 3, sy + sh);
      ctx.moveTo(sx + (2 * sw) / 3, sy);
      ctx.lineTo(sx + (2 * sw) / 3, sy + sh);
      ctx.moveTo(sx, sy + sh / 3);
      ctx.lineTo(sx + sw, sy + sh / 3);
      ctx.moveTo(sx, sy + (2 * sh) / 3);
      ctx.lineTo(sx + sw, sy + (2 * sh) / 3);
      ctx.stroke();

      // Crisp crop outline
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);

      // 8 interactive handles
      const handleSize = 9;
      const pts = [
        [sx, sy],
        [sx + sw / 2, sy],
        [sx + sw, sy],
        [sx + sw, sy + sh / 2],
        [sx + sw, sy + sh],
        [sx + sw / 2, sy + sh],
        [sx, sy + sh],
        [sx, sy + sh / 2],
      ];

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 2;
      for (const [px, py] of pts) {
        ctx.fillRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
        ctx.strokeRect(px - handleSize / 2, py - handleSize / 2, handleSize, handleSize);
      }

      // Dimension pill badge
      const label = `${this.rect.width} × ${this.rect.height} px`;
      ctx.font = '600 11px Inter, sans-serif';
      const padX = 8;
      const textW = ctx.measureText(label).width;
      const badgeW = textW + padX * 2;
      const badgeH = 22;
      const bx = Math.max(8, Math.min(sx + sw / 2 - badgeW / 2, ctx.canvas.width - badgeW - 8));
      const by = sy > 32 ? sy - badgeH - 8 : sy + 8;

      ctx.fillStyle = 'rgba(15, 18, 28, 0.9)';
      ctx.beginPath();
      ctx.roundRect(bx, by, badgeW, badgeH, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.6)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, bx + badgeW / 2, by + badgeH / 2 + 0.5);

      ctx.restore();
    }

    /**
     * Execute full-resolution crop on sourceCanvas and shift text layers into new coordinates.
     * @param {HTMLCanvasElement} sourceCanvas
     * @param {Array} textLayers
     * @returns {{ canvas: HTMLCanvasElement, textLayers: Array }}
     */
    applyCrop(sourceCanvas, textLayers) {
      const { x, y, width, height } = this.rect;
      const out = document.createElement('canvas');
      out.width = width;
      out.height = height;
      const ctx = out.getContext('2d');
      ctx.drawImage(sourceCanvas, x, y, width, height, 0, 0, width, height);

      // Recompute percentage positions so existing text stays in place over cropped image
      const oldW = sourceCanvas.width;
      const oldH = sourceCanvas.height;
      const shiftedLayers = textLayers.map((layer) => {
        const absX = (layer.xPct / 100) * oldW - x;
        const absY = (layer.yPct / 100) * oldH - y;
        return {
          ...layer,
          xPct: Math.max(0, Math.min(100, (absX / width) * 100)),
          yPct: Math.max(0, Math.min(100, (absY / height) * 100)),
        };
      });

      return { canvas: out, textLayers: shiftedLayers };
    }
  }

  PixelStudio.CropTool = CropTool;
})(window);
