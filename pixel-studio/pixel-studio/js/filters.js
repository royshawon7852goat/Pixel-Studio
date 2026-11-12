/**
 * Pixel Studio — Pixel Processing, Adjustments, Filters & Effects Engine
 * Pure HTML5 Canvas / ImageData processing with zero external dependencies.
 */
(function (global) {
  'use strict';

  const PixelStudio = (global.PixelStudio = global.PixelStudio || {});

  const DEFAULT_ADJUSTMENTS = {
    brightness: 0,
    contrast: 0,
    saturation: 0,
    exposure: 0,
    temperature: 0,
    hue: 0,
    blur: 0,
    sharpen: 0,
  };

  const DEFAULT_EFFECTS = {
    vignette: 0,
    grain: 0,
    fade: 0,
    pixelate: 0,
    invert: false,
  };

  const FILTER_PRESETS = [
    { id: 'none', name: 'Original' },
    { id: 'vintage', name: 'Vintage' },
    { id: 'cinematic', name: 'Cinematic' },
    { id: 'grayscale', name: 'Grayscale' },
    { id: 'bw', name: 'Black & White' },
    { id: 'warm', name: 'Warm' },
    { id: 'cool', name: 'Cool' },
    { id: 'retro', name: 'Retro' },
    { id: 'dramatic', name: 'Dramatic' },
    { id: 'sepia', name: 'Sepia' },
  ];

  function clamp255(v) {
    return v < 0 ? 0 : v > 255 ? 255 : v;
  }

  /**
   * Precompute 3x3 hue rotation matrix around the RGB luminance diagonal.
   * @param {number} degrees
   * @returns {number[]} 9-element matrix
   */
  function getHueMatrix(degrees) {
    const rad = (degrees * Math.PI) / 180;
    const cosA = Math.cos(rad);
    const sinA = Math.sin(rad);
    const sqrt1_3 = Math.sqrt(1 / 3);
    return [
      cosA + (1 - cosA) / 3,
      (1 - cosA) / 3 - sqrt1_3 * sinA,
      (1 - cosA) / 3 + sqrt1_3 * sinA,
      (1 - cosA) / 3 + sqrt1_3 * sinA,
      cosA + (1 - cosA) / 3,
      (1 - cosA) / 3 - sqrt1_3 * sinA,
      (1 - cosA) / 3 - sqrt1_3 * sinA,
      (1 - cosA) / 3 + sqrt1_3 * sinA,
      cosA + (1 - cosA) / 3,
    ];
  }

  /**
   * Apply a single filter preset to RGB values and blend by intensity [0..1].
   */
  function applyPresetToRGB(r, g, b, filterId, intensity) {
    if (filterId === 'none' || intensity <= 0) return [r, g, b];

    let fr = r;
    let fg = g;
    let fb = b;
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    switch (filterId) {
      case 'grayscale':
        fr = fg = fb = lum;
        break;

      case 'bw': {
        // High-contrast monochrome S-curve
        const n = lum / 255;
        const curved = n < 0.5 ? 2 * n * n : 1 - 2 * (1 - n) * (1 - n);
        const val = clamp255((curved * 255 - 128) * 1.32 + 128);
        fr = fg = fb = val;
        break;
      }

      case 'sepia':
        fr = r * 0.393 + g * 0.769 + b * 0.189;
        fg = r * 0.349 + g * 0.686 + b * 0.168;
        fb = r * 0.272 + g * 0.534 + b * 0.131;
        break;

      case 'vintage':
        // Warm amber highlights, faded lifted shadows, slight desaturation
        fr = r * 0.96 + 18;
        fg = g * 0.91 + 12;
        fb = b * 0.76 + 22;
        fr = fr * 0.85 + lum * 0.15;
        fg = fg * 0.85 + lum * 0.15;
        fb = fb * 0.85 + lum * 0.15;
        break;

      case 'cinematic': {
        // Teal shadows + golden-orange highlights + crisp contrast
        const shadowWeight = Math.max(0, 1 - lum / 140);
        const hiWeight = Math.max(0, (lum - 110) / 145);
        fr = (r - 128) * 1.16 + 128 + hiWeight * 22 - shadowWeight * 16;
        fg = (g - 128) * 1.14 + 128 + hiWeight * 6 + shadowWeight * 6;
        fb = (b - 128) * 1.16 + 128 - hiWeight * 20 + shadowWeight * 24;
        break;
      }

      case 'warm':
        fr = r * 1.08 + 14;
        fg = g * 1.02 + 5;
        fb = b * 0.88 - 8;
        break;

      case 'cool':
        fr = r * 0.88 - 8;
        fg = g * 1.0 + 4;
        fb = b * 1.12 + 16;
        break;

      case 'retro':
        // 70s film cast: lifted blacks, warm yellows, cyan-magenta split
        fr = r * 0.92 + 24;
        fg = g * 0.96 + 10;
        fb = b * 0.8 + 28;
        fr = (fr - 128) * 1.08 + 128;
        fg = (fg - 128) * 1.02 + 128;
        fb = (fb - 128) * 0.94 + 128;
        break;

      case 'dramatic': {
        // Deep shadows, punchy contrast, muted color
        const satMix = 0.62;
        const dr = lum + (r - lum) * satMix;
        const dg = lum + (g - lum) * satMix;
        const db = lum + (b - lum) * satMix;
        fr = (dr - 128) * 1.42 + 118;
        fg = (dg - 128) * 1.42 + 118;
        fb = (db - 128) * 1.42 + 118;
        break;
      }

      default:
        break;
    }

    if (intensity >= 0.999) {
      return [fr, fg, fb];
    }
    return [
      r + (fr - r) * intensity,
      g + (fg - g) * intensity,
      b + (fb - b) * intensity,
    ];
  }

  /**
   * Fast O(W*H) sliding-window separable box blur (3 passes approximate Gaussian).
   * Clamps borders so edges never bleed transparent.
   */
  function applyBoxBlur(data, width, height, radius) {
    const r = Math.round(radius);
    if (r <= 0) return;

    const len = width * height * 4;
    const temp = new Uint8ClampedArray(len);
    const passes = 3;
    const boxSize = r * 2 + 1;

    for (let pass = 0; pass < passes; pass++) {
      // Horizontal pass: data -> temp
      for (let y = 0; y < height; y++) {
        const rowOffset = y * width * 4;
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let sa = 0;

        for (let k = -r; k <= r; k++) {
          const sx = k < 0 ? 0 : k >= width ? width - 1 : k;
          const idx = rowOffset + sx * 4;
          sr += data[idx];
          sg += data[idx + 1];
          sb += data[idx + 2];
          sa += data[idx + 3];
        }

        for (let x = 0; x < width; x++) {
          const outIdx = rowOffset + x * 4;
          temp[outIdx] = sr / boxSize;
          temp[outIdx + 1] = sg / boxSize;
          temp[outIdx + 2] = sb / boxSize;
          temp[outIdx + 3] = sa / boxSize;

          const removeX = Math.max(0, x - r);
          const addX = Math.min(width - 1, x + r + 1);
          const remIdx = rowOffset + removeX * 4;
          const addIdx = rowOffset + addX * 4;

          sr += data[addIdx] - data[remIdx];
          sg += data[addIdx + 1] - data[remIdx + 1];
          sb += data[addIdx + 2] - data[remIdx + 2];
          sa += data[addIdx + 3] - data[remIdx + 3];
        }
      }

      // Vertical pass: temp -> data
      for (let x = 0; x < width; x++) {
        let sr = 0;
        let sg = 0;
        let sb = 0;
        let sa = 0;

        for (let k = -r; k <= r; k++) {
          const sy = k < 0 ? 0 : k >= height ? height - 1 : k;
          const idx = (sy * width + x) * 4;
          sr += temp[idx];
          sg += temp[idx + 1];
          sb += temp[idx + 2];
          sa += temp[idx + 3];
        }

        for (let y = 0; y < height; y++) {
          const outIdx = (y * width + x) * 4;
          data[outIdx] = sr / boxSize;
          data[outIdx + 1] = sg / boxSize;
          data[outIdx + 2] = sb / boxSize;
          data[outIdx + 3] = sa / boxSize;

          const removeY = Math.max(0, y - r);
          const addY = Math.min(height - 1, y + r + 1);
          const remIdx = (removeY * width + x) * 4;
          const addIdx = (addY * width + x) * 4;

          sr += temp[addIdx] - temp[remIdx];
          sg += temp[addIdx + 1] - temp[remIdx + 1];
          sb += temp[addIdx + 2] - temp[remIdx + 2];
          sa += temp[addIdx + 3] - temp[remIdx + 3];
        }
      }
    }
  }

  /**
   * 3x3 Laplacian sharpen convolution on RGB channels.
   */
  function applySharpen(data, width, height, amount) {
    if (amount <= 0) return;
    const k = (amount / 100) * 0.85;
    const center = 1 + 4 * k;
    const src = new Uint8ClampedArray(data);
    const stride = width * 4;

    for (let y = 0; y < height; y++) {
      const yUp = y > 0 ? -stride : 0;
      const yDn = y < height - 1 ? stride : 0;

      for (let x = 0; x < width; x++) {
        const idx = y * stride + x * 4;
        const xLt = x > 0 ? -4 : 0;
        const xRt = x < width - 1 ? 4 : 0;

        for (let c = 0; c < 3; c++) {
          const val =
            src[idx + c] * center -
            k * (src[idx + yUp + c] + src[idx + yDn + c] + src[idx + xLt + c] + src[idx + xRt + c]);
          data[idx + c] = clamp255(val);
        }
      }
    }
  }

  /**
   * Deterministic film grain hash in [-1, 1].
   */
  function deterministicNoise(x, y) {
    let n = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
    n = (n ^ (n >> 13)) * 1274126177;
    n = n ^ (n >> 16);
    return ((n & 0xffff) / 32767.5) - 1;
  }

  /**
   * Execute the complete non-destructive pixel pipeline from sourceCanvas onto targetCanvas.
   * @param {HTMLCanvasElement} sourceCanvas
   * @param {HTMLCanvasElement} targetCanvas
   * @param {Object} state
   * @param {number} [blurScale=1] Scale factor when rendering preview vs full-resolution
   */
  function applyPixelPipeline(sourceCanvas, targetCanvas, state, blurScale = 1) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    if (!w || !h) return;

    if (targetCanvas.width !== w || targetCanvas.height !== h) {
      targetCanvas.width = w;
      targetCanvas.height = h;
    }

    const ctx = targetCanvas.getContext('2d', { willReadFrequently: true });
    const adj = state.adjustments;
    const eff = state.effects;
    const filterId = state.filter || 'none';
    const filterIntensity = (state.filterIntensity ?? 100) / 100;

    // Step 1: Pixelate (if enabled) or direct copy
    const pixSize = Math.round((eff.pixelate || 0) * blurScale);
    if (pixSize > 1) {
      const tinyW = Math.max(2, Math.round(w / pixSize));
      const tinyH = Math.max(2, Math.round(h / pixSize));
      const tiny = document.createElement('canvas');
      tiny.width = tinyW;
      tiny.height = tinyH;
      const tCtx = tiny.getContext('2d');
      tCtx.imageSmoothingEnabled = true;
      tCtx.drawImage(sourceCanvas, 0, 0, tinyW, tinyH);

      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(tiny, 0, 0, w, h);
      ctx.imageSmoothingEnabled = true;
    } else {
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(sourceCanvas, 0, 0);
    }

    const needsPixelPass =
      adj.brightness !== 0 ||
      adj.contrast !== 0 ||
      adj.saturation !== 0 ||
      adj.exposure !== 0 ||
      adj.temperature !== 0 ||
      adj.hue !== 0 ||
      adj.blur > 0 ||
      adj.sharpen > 0 ||
      (filterId !== 'none' && filterIntensity > 0) ||
      eff.grain > 0 ||
      eff.fade > 0 ||
      eff.invert;

    if (needsPixelPass) {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // Blur before sharpen/color pass
      if (adj.blur > 0) {
        applyBoxBlur(data, w, h, adj.blur * blurScale);
      }

      const expMul = adj.exposure !== 0 ? Math.pow(2, adj.exposure / 55) : 1;
      const brightAdd = (adj.brightness / 100) * 115;
      const cVal = Math.max(-254, Math.min(254, (adj.contrast / 100) * 254));
      const contrastFactor = (259 * (cVal + 255)) / (255 * (259 - cVal));
      const satFactor = 1 + adj.saturation / 100;
      const tempShift = (adj.temperature / 100) * 46;
      const useHue = adj.hue !== 0;
      const hueMat = useHue ? getHueMatrix(adj.hue) : null;
      const fadeAmt = (eff.fade || 0) / 100;
      const grainAmt = (eff.grain || 0) * 0.55;
      const doInvert = Boolean(eff.invert);

      for (let i = 0, px = 0; i < data.length; i += 4, px++) {
        if (data[i + 3] === 0) continue;

        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Exposure
        if (expMul !== 1) {
          r *= expMul;
          g *= expMul;
          b *= expMul;
        }

        // Brightness
        if (brightAdd !== 0) {
          r += brightAdd;
          g += brightAdd;
          b += brightAdd;
        }

        // Contrast
        if (cVal !== 0) {
          r = contrastFactor * (r - 128) + 128;
          g = contrastFactor * (g - 128) + 128;
          b = contrastFactor * (b - 128) + 128;
        }

        // Temperature
        if (tempShift !== 0) {
          r += tempShift;
          g += tempShift * 0.14;
          b -= tempShift;
        }

        // Saturation
        if (satFactor !== 1) {
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
          r = lum + (r - lum) * satFactor;
          g = lum + (g - lum) * satFactor;
          b = lum + (b - lum) * satFactor;
        }

        // Hue Rotation
        if (useHue) {
          const nr = r * hueMat[0] + g * hueMat[1] + b * hueMat[2];
          const ng = r * hueMat[3] + g * hueMat[4] + b * hueMat[5];
          const nb = r * hueMat[6] + g * hueMat[7] + b * hueMat[8];
          r = nr;
          g = ng;
          b = nb;
        }

        // Filter Preset
        if (filterId !== 'none' && filterIntensity > 0) {
          [r, g, b] = applyPresetToRGB(r, g, b, filterId, filterIntensity);
        }

        // Matte Fade
        if (fadeAmt > 0) {
          r = r * (1 - fadeAmt * 0.24) + fadeAmt * 42;
          g = g * (1 - fadeAmt * 0.24) + fadeAmt * 40;
          b = b * (1 - fadeAmt * 0.22) + fadeAmt * 46;
        }

        // Film Grain
        if (grainAmt > 0) {
          const x = px % w;
          const y = (px - x) / w;
          const noise = deterministicNoise(x, y) * grainAmt;
          r += noise;
          g += noise;
          b += noise;
        }

        // Invert
        if (doInvert) {
          r = 255 - clamp255(r);
          g = 255 - clamp255(g);
          b = 255 - clamp255(b);
        }

        data[i] = clamp255(r);
        data[i + 1] = clamp255(g);
        data[i + 2] = clamp255(b);
      }

      // Sharpen convolution after color pass
      if (adj.sharpen > 0) {
        applySharpen(data, w, h, adj.sharpen);
      }

      ctx.putImageData(imgData, 0, 0);
    }

    // Vignette radial overlay
    if (eff.vignette > 0) {
      const strength = (eff.vignette / 100) * 0.85;
      const cx = w / 2;
      const cy = h / 2;
      const innerR = Math.min(w, h) * 0.25;
      const outerR = Math.hypot(cx, cy);
      const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.55, `rgba(0, 0, 0, ${(strength * 0.3).toFixed(3)})`);
      grad.addColorStop(1, `rgba(0, 0, 0, ${strength.toFixed(3)})`);
      ctx.save();
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }
  }

  /**
   * Generate a mini thumbnail canvas demonstrating a filter preset on the active image.
   * @param {HTMLCanvasElement} sourceCanvas
   * @param {string} filterId
   * @param {number} [thumbW=120]
   * @param {number} [thumbH=75]
   * @returns {HTMLCanvasElement}
   */
  function renderFilterThumbnail(sourceCanvas, filterId, thumbW = 120, thumbH = 75) {
    const srcThumb = document.createElement('canvas');
    srcThumb.width = thumbW;
    srcThumb.height = thumbH;
    const sCtx = srcThumb.getContext('2d');

    if (sourceCanvas && sourceCanvas.width > 0) {
      const scale = Math.max(thumbW / sourceCanvas.width, thumbH / sourceCanvas.height);
      const dw = sourceCanvas.width * scale;
      const dh = sourceCanvas.height * scale;
      sCtx.drawImage(sourceCanvas, (thumbW - dw) / 2, (thumbH - dh) / 2, dw, dh);
    } else {
      const g = sCtx.createLinearGradient(0, 0, thumbW, thumbH);
      g.addColorStop(0, '#6366f1');
      g.addColorStop(0.5, '#ec4899');
      g.addColorStop(1, '#f59e0b');
      sCtx.fillStyle = g;
      sCtx.fillRect(0, 0, thumbW, thumbH);
    }

    const out = document.createElement('canvas');
    applyPixelPipeline(srcThumb, out, {
      adjustments: { ...DEFAULT_ADJUSTMENTS },
      filter: filterId,
      filterIntensity: 100,
      effects: { ...DEFAULT_EFFECTS },
    });
    return out;
  }

  PixelStudio.Filters = {
    DEFAULT_ADJUSTMENTS,
    DEFAULT_EFFECTS,
    FILTER_PRESETS,
    applyPixelPipeline,
    renderFilterThumbnail,
  };
})(window);
