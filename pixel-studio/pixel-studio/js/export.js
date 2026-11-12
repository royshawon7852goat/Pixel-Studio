/**
 * Pixel Studio — Image Export System
 * Handles PNG, JPG, and WEBP encoding from the full-resolution edited canvas,
 * live file size estimation, and browser download triggers.
 */
(function (global) {
  'use strict';

  const PixelStudio = (global.PixelStudio = global.PixelStudio || {});

  const EXTENSION_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };

  /**
   * Check whether the current browser supports encoding the requested MIME type.
   * @param {string} mimeType
   * @returns {boolean}
   */
  function isFormatSupported(mimeType) {
    if (mimeType === 'image/png' || mimeType === 'image/jpeg') return true;
    const probe = document.createElement('canvas');
    probe.width = 2;
    probe.height = 2;
    try {
      const dataUrl = probe.toDataURL(mimeType);
      return dataUrl.startsWith(`data:${mimeType}`);
    } catch (_) {
      return false;
    }
  }

  /**
   * Flatten canvas onto a solid white background when exporting to JPEG (no alpha channel).
   * @param {HTMLCanvasElement} sourceCanvas
   * @param {string} mimeType
   * @returns {HTMLCanvasElement}
   */
  function prepareExportCanvas(sourceCanvas, mimeType) {
    if (mimeType !== 'image/jpeg') return sourceCanvas;
    const flat = document.createElement('canvas');
    flat.width = sourceCanvas.width;
    flat.height = sourceCanvas.height;
    const ctx = flat.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(sourceCanvas, 0, 0);
    return flat;
  }

  /**
   * Convert a canvas into a Blob for the given format and quality [0..1].
   * @param {HTMLCanvasElement} canvas
   * @param {string} mimeType
   * @param {number} quality01
   * @returns {Promise<Blob>}
   */
  function encodeCanvasToBlob(canvas, mimeType, quality01) {
    return new Promise((resolve, reject) => {
      const exportCanvas = prepareExportCanvas(canvas, mimeType);
      const q = mimeType === 'image/png' ? undefined : Math.max(0.1, Math.min(1, quality01));
      exportCanvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`Failed to encode image as ${mimeType}`));
            return;
          }
          resolve(blob);
        },
        mimeType,
        q
      );
    });
  }

  /**
   * Format bytes into human-readable KB/MB string.
   * @param {number} bytes
   * @returns {string}
   */
  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  /**
   * Trigger a file download from the exported Blob.
   * @param {HTMLCanvasElement} fullResCanvas
   * @param {string} filenameBase
   * @param {string} mimeType
   * @param {number} qualityPct 10..100
   * @returns {Promise<{ size: number, filename: string }>}
   */
  async function downloadImage(fullResCanvas, filenameBase, mimeType, qualityPct) {
    const safeName = (filenameBase || 'pixel-studio-edit')
      .trim()
      .replace(/[<>:"/\\|?*]+/g, '-')
      .replace(/\.[^.]+$/, '');
    const ext = EXTENSION_MAP[mimeType] || 'png';
    const finalName = `${safeName || 'pixel-studio-edit'}.${ext}`;

    const blob = await encodeCanvasToBlob(fullResCanvas, mimeType, qualityPct / 100);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = finalName;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1500);

    return { size: blob.size, filename: finalName };
  }

  PixelStudio.Exporter = {
    isFormatSupported,
    encodeCanvasToBlob,
    formatBytes,
    downloadImage,
  };
})(window);
