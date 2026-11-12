/**
 * Pixel Studio — Application Controller
 * Connects DOM controls, canvas pointer interactions, drag-and-drop, clipboard paste,
 * keyboard shortcuts, modals, settings persistence, and live UI synchronization.
 */
(function (global) {
  'use strict';

  const PixelStudio = (global.PixelStudio = global.PixelStudio || {});
  const SETTINGS_KEY = 'pixel_studio_settings_v1';

  document.addEventListener('DOMContentLoaded', () => {
    // -----------------------------------------------------------------------
    // Core Instances
    // -----------------------------------------------------------------------
    const history = new PixelStudio.HistoryManager(35);
    const canvasEl = document.getElementById('editorCanvas');
    const editor = new PixelStudio.Editor(canvasEl, history);

    // -----------------------------------------------------------------------
    // DOM References
    // -----------------------------------------------------------------------
    const els = {
      btnNewProject: document.getElementById('btnNewProject'),
      btnUndo: document.getElementById('btnUndo'),
      btnRedo: document.getElementById('btnRedo'),
      btnCompare: document.getElementById('btnCompare'),
      btnExport: document.getElementById('btnExport'),
      btnSettings: document.getElementById('btnSettings'),
      docFileName: document.getElementById('docFileName'),

      toolButtons: Array.from(document.querySelectorAll('#toolRail .tool-btn')),
      toolPanels: Array.from(document.querySelectorAll('.tool-panel')),

      canvasStage: document.getElementById('canvasStage'),
      canvasViewport: document.getElementById('canvasViewport'),
      canvasFloatingBar: document.getElementById('canvasFloatingBar'),
      btnZoomOut: document.getElementById('btnZoomOut'),
      btnZoomIn: document.getElementById('btnZoomIn'),
      btnZoomFit: document.getElementById('btnZoomFit'),
      btnZoom100: document.getElementById('btnZoom100'),
      btnPanMode: document.getElementById('btnPanMode'),
      floatingZoomReadout: document.getElementById('floatingZoomReadout'),
      compareBadge: document.getElementById('compareBadge'),

      uploadPlaceholder: document.getElementById('uploadPlaceholder'),
      btnPlaceholderUpload: document.getElementById('btnPlaceholderUpload'),
      btnLoadSample: document.getElementById('btnLoadSample'),
      dropOverlay: document.getElementById('dropOverlay'),
      fileInput: document.getElementById('fileInput'),

      // Adjustments
      btnResetAdjustments: document.getElementById('btnResetAdjustments'),

      // Filters
      filterGrid: document.getElementById('filterGrid'),
      filterIntensity: document.getElementById('filterIntensity'),
      numFilterIntensity: document.getElementById('num-filterIntensity'),
      btnResetFilter: document.getElementById('btnResetFilter'),

      // Crop
      cropRatioBtns: Array.from(document.querySelectorAll('#cropRatioGroup .chip-btn')),
      cropDimReadout: document.getElementById('cropDimReadout'),
      cropPosReadout: document.getElementById('cropPosReadout'),
      btnApplyCrop: document.getElementById('btnApplyCrop'),
      btnCancelCrop: document.getElementById('btnCancelCrop'),

      // Rotate
      btnRotateLeft: document.getElementById('btnRotateLeft'),
      btnRotateRight: document.getElementById('btnRotateRight'),
      btnFlipH: document.getElementById('btnFlipH'),
      btnFlipV: document.getElementById('btnFlipV'),
      fineRotateSlider: document.getElementById('fineRotateSlider'),
      numFineRotate: document.getElementById('num-fineRotate'),

      // Resize
      resizeWidth: document.getElementById('resizeWidth'),
      resizeHeight: document.getElementById('resizeHeight'),
      btnLockAspect: document.getElementById('btnLockAspect'),
      scalePresets: Array.from(document.querySelectorAll('.scale-preset')),
      btnApplyResize: document.getElementById('btnApplyResize'),

      // Effects
      btnResetEffects: document.getElementById('btnResetEffects'),
      effInvert: document.getElementById('eff-invert'),

      // Text
      btnAddText: document.getElementById('btnAddText'),
      textLayersList: document.getElementById('textLayersList'),
      textEditorControls: document.getElementById('textEditorControls'),
      textContentInput: document.getElementById('textContentInput'),
      textFontFamily: document.getElementById('textFontFamily'),
      textColorInput: document.getElementById('textColorInput'),
      textColorHex: document.getElementById('textColorHex'),
      textFontSize: document.getElementById('textFontSize'),
      numTextFontSize: document.getElementById('num-textFontSize'),
      textPosX: document.getElementById('textPosX'),
      numTextPosX: document.getElementById('num-textPosX'),
      textPosY: document.getElementById('textPosY'),
      numTextPosY: document.getElementById('num-textPosY'),
      btnTextBold: document.getElementById('btnTextBold'),
      btnTextItalic: document.getElementById('btnTextItalic'),
      btnTextShadow: document.getElementById('btnTextShadow'),
      btnTextCenter: document.getElementById('btnTextCenter'),
      btnDeleteText: document.getElementById('btnDeleteText'),

      // History & Recovery
      historyCount: document.getElementById('historyCount'),
      historyList: document.getElementById('historyList'),
      btnResetAllEdits: document.getElementById('btnResetAllEdits'),
      btnRestoreOriginal: document.getElementById('btnRestoreOriginal'),

      // Status bar
      infoDimensions: document.getElementById('infoDimensions'),
      infoFormat: document.getElementById('infoFormat'),
      infoZoom: document.getElementById('infoZoom'),
      statusHint: document.getElementById('statusHint'),

      // Modals
      newProjectModal: document.getElementById('newProjectModal'),
      btnModalUpload: document.getElementById('btnModalUpload'),
      btnModalSample: document.getElementById('btnModalSample'),
      blankWidth: document.getElementById('blankWidth'),
      blankHeight: document.getElementById('blankHeight'),
      blankBgColor: document.getElementById('blankBgColor'),
      btnCreateBlank: document.getElementById('btnCreateBlank'),

      exportModal: document.getElementById('exportModal'),
      exportFilename: document.getElementById('exportFilename'),
      exportFormatBtns: Array.from(document.querySelectorAll('#exportFormatGroup .chip-btn')),
      exportQuality: document.getElementById('exportQuality'),
      exportQualityVal: document.getElementById('exportQualityVal'),
      exportQualityWrap: document.getElementById('exportQualityWrap'),
      exportFormatNote: document.getElementById('exportFormatNote'),
      exportDimensions: document.getElementById('exportDimensions'),
      exportEstSize: document.getElementById('exportEstSize'),
      btnConfirmExport: document.getElementById('btnConfirmExport'),

      settingsModal: document.getElementById('settingsModal'),
      settingCanvasBg: document.getElementById('settingCanvasBg'),
      settingSmoothing: document.getElementById('settingSmoothing'),
      settingGridGuides: document.getElementById('settingGridGuides'),
      settingHistoryLimit: document.getElementById('settingHistoryLimit'),
      btnResetSettings: document.getElementById('btnResetSettings'),

      toastContainer: document.getElementById('toastContainer'),
    };

    // -----------------------------------------------------------------------
    // Toast Notification Utility
    // -----------------------------------------------------------------------
    function showToast(message, type = 'info') {
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      els.toastContainer.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.25s';
        setTimeout(() => toast.remove(), 260);
      }, 2800);
    }

    // -----------------------------------------------------------------------
    // Modal Helpers
    // -----------------------------------------------------------------------
    function openModal(modalEl) {
      modalEl.classList.remove('hidden');
    }

    function closeModal(modalEl) {
      modalEl.classList.add('hidden');
    }

    document.querySelectorAll('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.closeModal);
        if (target) closeModal(target);
      });
    });

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) closeModal(backdrop);
      });
    });

    // -----------------------------------------------------------------------
    // Settings Persistence
    // -----------------------------------------------------------------------
    function loadSettings() {
      try {
        const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
        editor.settings.canvasBg = saved.canvasBg || 'checker-dark';
        editor.settings.smoothing = saved.smoothing !== undefined ? Boolean(saved.smoothing) : true;
        editor.settings.gridGuides = Boolean(saved.gridGuides);
        const histLimit = Number(saved.historyLimit) || 35;
        history.setMaxSteps(histLimit);

        els.settingCanvasBg.value = editor.settings.canvasBg;
        els.settingSmoothing.checked = editor.settings.smoothing;
        els.settingGridGuides.checked = editor.settings.gridGuides;
        els.settingHistoryLimit.value = String(histLimit);
      } catch (_) {
        // Ignore storage read errors in restricted contexts
      }
    }

    function saveSettings() {
      try {
        localStorage.setItem(
          SETTINGS_KEY,
          JSON.stringify({
            canvasBg: editor.settings.canvasBg,
            smoothing: editor.settings.smoothing,
            gridGuides: editor.settings.gridGuides,
            historyLimit: history.maxSteps,
          })
        );
      } catch (_) {}
    }

    loadSettings();

    // -----------------------------------------------------------------------
    // UI Synchronization
    // -----------------------------------------------------------------------
    const ADJ_KEYS = ['brightness', 'contrast', 'saturation', 'exposure', 'temperature', 'hue', 'blur', 'sharpen'];
    const EFFECT_KEYS = ['vignette', 'grain', 'fade', 'pixelate'];

    function syncAllUI() {
      const loaded = editor.hasImage();

      // Enable/disable controls based on image presence
      els.btnCompare.disabled = !loaded;
      els.btnExport.disabled = !loaded;
      els.btnResetAdjustments.disabled = !loaded;
      els.btnResetFilter.disabled = !loaded;
      els.btnApplyCrop.disabled = !loaded;
      els.btnCancelCrop.disabled = !loaded;
      els.btnRotateLeft.disabled = !loaded;
      els.btnRotateRight.disabled = !loaded;
      els.btnFlipH.disabled = !loaded;
      els.btnFlipV.disabled = !loaded;
      els.resizeWidth.disabled = !loaded;
      els.resizeHeight.disabled = !loaded;
      els.btnApplyResize.disabled = !loaded;
      els.scalePresets.forEach((b) => (b.disabled = !loaded));
      els.btnResetEffects.disabled = !loaded;
      els.btnAddText.disabled = !loaded;
      els.btnResetAllEdits.disabled = !loaded;
      els.btnRestoreOriginal.disabled = !loaded;

      els.uploadPlaceholder.classList.toggle('hidden', loaded);
      els.canvasFloatingBar.classList.toggle('hidden', !loaded);
      els.compareBadge.classList.toggle('hidden', !(loaded && editor.compareMode));
      els.btnCompare.classList.toggle('active', loaded && editor.compareMode);
      els.btnPanMode.classList.toggle('active', editor.panMode);

      if (!loaded) {
        els.docFileName.textContent = 'No image loaded';
        els.infoDimensions.textContent = '—';
        els.infoFormat.textContent = '—';
        els.infoZoom.textContent = '100%';
        return;
      }

      const w = editor.baseCanvas.width;
      const h = editor.baseCanvas.height;
      const zoomPct = `${Math.round(editor.zoom * 100)}%`;

      els.docFileName.textContent = editor.meta.name || 'Untitled';
      els.infoDimensions.textContent = `${w} × ${h} px`;
      els.infoFormat.textContent = editor.meta.format;
      els.infoZoom.textContent = zoomPct;
      els.floatingZoomReadout.textContent = zoomPct;

      // Sync adjustments sliders + numeric fields
      for (const key of ADJ_KEYS) {
        const val = editor.state.adjustments[key] ?? 0;
        const slider = document.getElementById(`adj-${key}`);
        const num = document.getElementById(`num-${key}`);
        if (slider) slider.value = val;
        if (num) num.value = val;
      }

      // Sync effects
      for (const key of EFFECT_KEYS) {
        const val = editor.state.effects[key] ?? 0;
        const slider = document.getElementById(`eff-${key}`);
        const num = document.getElementById(`num-${key}`);
        if (slider) slider.value = val;
        if (num) num.value = val;
      }
      els.effInvert.checked = Boolean(editor.state.effects.invert);

      // Sync fine rotation
      els.fineRotateSlider.value = editor.state.fineRotation;
      els.numFineRotate.value = editor.state.fineRotation;

      // Sync filter selection & intensity
      els.filterIntensity.value = editor.state.filterIntensity;
      els.numFilterIntensity.value = editor.state.filterIntensity;
      document.querySelectorAll('.filter-card').forEach((card) => {
        card.classList.toggle('active', card.dataset.filter === editor.state.filter);
      });

      // Sync crop readouts
      const cr = editor.cropTool.rect;
      els.cropDimReadout.textContent = `${cr.width} × ${cr.height} px`;
      els.cropPosReadout.textContent = `${cr.x}, ${cr.y}`;

      // Sync resize inputs only if not actively editing them
      if (document.activeElement !== els.resizeWidth && document.activeElement !== els.resizeHeight) {
        els.resizeWidth.value = w;
        els.resizeHeight.value = h;
      }

      syncTextInspector(editor.getSelectedTextLayer());
    }

    editor.onStateRender = syncAllUI;
    editor.onImageLoaded = () => {
      buildFilterGrid();
      syncAllUI();
      els.statusHint.textContent = 'Loaded • Scroll to zoom, drag to pan, or pick a tool';
    };

    // -----------------------------------------------------------------------
    // History UI Sync
    // -----------------------------------------------------------------------
    history.onChange = ({ canUndo, canRedo, entries, currentIndex }) => {
      els.btnUndo.disabled = !canUndo;
      els.btnRedo.disabled = !canRedo;
      els.historyCount.textContent = `${entries.length} ${entries.length === 1 ? 'state' : 'states'}`;

      if (!entries.length) {
        els.historyList.innerHTML = '<div class="empty-mini-state">No edits recorded yet</div>';
        return;
      }

      els.historyList.innerHTML = '';
      entries.forEach((entry, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'history-entry';
        if (idx === currentIndex) btn.classList.add('current');
        if (idx > currentIndex) btn.classList.add('future');
        btn.innerHTML = `<span>${idx + 1}. ${entry.label}</span><span>${idx === currentIndex ? '●' : ''}</span>`;
        btn.addEventListener('click', () => {
          const snap = history.jumpTo(idx);
          if (snap) editor.applySnapshot(snap);
        });
        els.historyList.appendChild(btn);
      });
      els.historyList.scrollTop = els.historyList.scrollHeight;
    };

    // -----------------------------------------------------------------------
    // Tool Category Navigation (Left Sidebar)
    // -----------------------------------------------------------------------
    function setActiveTool(toolName) {
      editor.activeTool = toolName;
      els.toolButtons.forEach((b) => b.classList.toggle('active', b.dataset.tool === toolName));
      els.toolPanels.forEach((p) => p.classList.toggle('active', p.dataset.panel === toolName));

      if (toolName === 'crop' && editor.hasImage()) {
        editor.cropTool.init(editor.baseCanvas.width, editor.baseCanvas.height, editor.cropTool.ratioKey);
      }
      if (toolName === 'resize' && editor.hasImage()) {
        els.resizeWidth.value = editor.baseCanvas.width;
        els.resizeHeight.value = editor.baseCanvas.height;
      }
      updateCanvasCursor();
      editor.render(false);
    }

    els.toolButtons.forEach((btn) => {
      btn.addEventListener('click', () => setActiveTool(btn.dataset.tool));
    });

    // -----------------------------------------------------------------------
    // Slider + Number Dual-Binding Helper
    // -----------------------------------------------------------------------
    function bindSliderPair(sliderEl, numEl, onLive, onCommit) {
      const clampVal = (v) => {
        const min = Number(sliderEl.min);
        const max = Number(sliderEl.max);
        return Math.max(min, Math.min(max, Number(v) || 0));
      };

      sliderEl.addEventListener('input', () => {
        const val = Number(sliderEl.value);
        numEl.value = val;
        onLive(val);
      });

      sliderEl.addEventListener('change', () => {
        onCommit(Number(sliderEl.value));
      });

      sliderEl.addEventListener('dblclick', () => {
        const def = Number(sliderEl.dataset.default ?? 0);
        sliderEl.value = def;
        numEl.value = def;
        onLive(def);
        onCommit(def);
      });

      numEl.addEventListener('change', () => {
        const val = clampVal(numEl.value);
        numEl.value = val;
        sliderEl.value = val;
        onLive(val);
        onCommit(val);
      });
    }

    // Bind 8 Adjustment sliders
    for (const key of ADJ_KEYS) {
      const slider = document.getElementById(`adj-${key}`);
      const num = document.getElementById(`num-${key}`);
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      bindSliderPair(
        slider,
        num,
        (val) => {
          if (!editor.hasImage()) return;
          editor.state.adjustments[key] = val;
          editor.render(true);
        },
        () => {
          if (!editor.hasImage()) return;
          editor.commitHistory(`Adjust ${label}`);
          editor.render(false);
        }
      );
    }

    els.btnResetAdjustments.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      editor.state.adjustments = { ...PixelStudio.Filters.DEFAULT_ADJUSTMENTS };
      editor.commitHistory('Reset Adjustments');
      editor.render(false);
      showToast('Adjustments reset');
    });

    // -----------------------------------------------------------------------
    // Filters Panel
    // -----------------------------------------------------------------------
    function buildFilterGrid() {
      els.filterGrid.innerHTML = '';
      const src = editor.hasImage() ? editor.previewProxyCanvas || editor.baseCanvas : null;

      PixelStudio.Filters.FILTER_PRESETS.forEach((preset) => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'filter-card';
        card.dataset.filter = preset.id;
        if (editor.state.filter === preset.id) card.classList.add('active');

        const thumbWrap = document.createElement('div');
        thumbWrap.className = 'filter-thumb';
        const thumbCanvas = PixelStudio.Filters.renderFilterThumbnail(src, preset.id, 130, 82);
        thumbWrap.appendChild(thumbCanvas);

        const title = document.createElement('span');
        title.className = 'filter-name';
        title.textContent = preset.name;

        card.appendChild(thumbWrap);
        card.appendChild(title);

        card.addEventListener('click', () => {
          if (!editor.hasImage()) {
            showToast('Load an image first to apply filters', 'error');
            return;
          }
          editor.state.filter = preset.id;
          editor.commitHistory(`Filter: ${preset.name}`);
          editor.render(false);
        });

        els.filterGrid.appendChild(card);
      });
    }

    buildFilterGrid();

    bindSliderPair(
      els.filterIntensity,
      els.numFilterIntensity,
      (val) => {
        if (!editor.hasImage()) return;
        editor.state.filterIntensity = val;
        editor.render(true);
      },
      () => {
        if (!editor.hasImage()) return;
        editor.commitHistory('Filter Intensity');
        editor.render(false);
      }
    );

    els.btnResetFilter.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      editor.state.filter = 'none';
      editor.state.filterIntensity = 100;
      editor.commitHistory('Clear Filter');
      editor.render(false);
    });

    // -----------------------------------------------------------------------
    // Crop Panel
    // -----------------------------------------------------------------------
    els.cropRatioBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        els.cropRatioBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        editor.cropTool.setRatio(btn.dataset.ratio, true);
        if (editor.activeTool !== 'crop') setActiveTool('crop');
        else editor.render(false);
      });
    });

    els.btnApplyCrop.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      editor.applyCrop();
      buildFilterGrid();
      setActiveTool('adjustments');
      showToast(`Cropped to ${editor.baseCanvas.width} × ${editor.baseCanvas.height} px`, 'success');
    });

    els.btnCancelCrop.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      editor.cropTool.init(editor.baseCanvas.width, editor.baseCanvas.height, editor.cropTool.ratioKey);
      editor.render(false);
    });

    // -----------------------------------------------------------------------
    // Rotate & Flip Panel
    // -----------------------------------------------------------------------
    els.btnRotateLeft.addEventListener('click', () => {
      editor.rotate90(-1);
      buildFilterGrid();
    });

    els.btnRotateRight.addEventListener('click', () => {
      editor.rotate90(1);
      buildFilterGrid();
    });

    els.btnFlipH.addEventListener('click', () => {
      editor.flip('h');
      buildFilterGrid();
    });

    els.btnFlipV.addEventListener('click', () => {
      editor.flip('v');
      buildFilterGrid();
    });

    bindSliderPair(
      els.fineRotateSlider,
      els.numFineRotate,
      (val) => {
        if (!editor.hasImage()) return;
        editor.state.fineRotation = val;
        editor.render(true);
      },
      () => {
        if (!editor.hasImage()) return;
        editor.commitHistory('Straighten Angle');
        editor.render(false);
      }
    );

    // -----------------------------------------------------------------------
    // Resize Panel
    // -----------------------------------------------------------------------
    let lockAspect = true;

    els.btnLockAspect.addEventListener('click', () => {
      lockAspect = !lockAspect;
      els.btnLockAspect.classList.toggle('active', lockAspect);
      els.btnLockAspect.setAttribute('aria-pressed', String(lockAspect));
    });

    els.resizeWidth.addEventListener('input', () => {
      if (!editor.hasImage() || !lockAspect) return;
      const w = Number(els.resizeWidth.value);
      if (w > 0) {
        const ratio = editor.baseCanvas.height / editor.baseCanvas.width;
        els.resizeHeight.value = Math.max(1, Math.round(w * ratio));
      }
    });

    els.resizeHeight.addEventListener('input', () => {
      if (!editor.hasImage() || !lockAspect) return;
      const h = Number(els.resizeHeight.value);
      if (h > 0) {
        const ratio = editor.baseCanvas.width / editor.baseCanvas.height;
        els.resizeWidth.value = Math.max(1, Math.round(h * ratio));
      }
    });

    els.scalePresets.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!editor.hasImage()) return;
        const factor = Number(btn.dataset.scale);
        els.resizeWidth.value = Math.max(1, Math.round(editor.baseCanvas.width * factor));
        els.resizeHeight.value = Math.max(1, Math.round(editor.baseCanvas.height * factor));
      });
    });

    els.btnApplyResize.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      const w = Number(els.resizeWidth.value);
      const h = Number(els.resizeHeight.value);
      if (!w || !h || w < 1 || h < 1 || w > 10000 || h > 10000) {
        showToast('Enter valid dimensions between 1 and 10,000 px', 'error');
        return;
      }
      editor.resizeImage(w, h);
      showToast(`Resized to ${w} × ${h} px`, 'success');
    });

    // -----------------------------------------------------------------------
    // Effects Panel
    // -----------------------------------------------------------------------
    for (const key of EFFECT_KEYS) {
      const slider = document.getElementById(`eff-${key}`);
      const num = document.getElementById(`num-${key}`);
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      bindSliderPair(
        slider,
        num,
        (val) => {
          if (!editor.hasImage()) return;
          editor.state.effects[key] = val;
          editor.render(true);
        },
        () => {
          if (!editor.hasImage()) return;
          editor.commitHistory(`Effect: ${label}`);
          editor.render(false);
        }
      );
    }

    els.effInvert.addEventListener('change', () => {
      if (!editor.hasImage()) return;
      editor.state.effects.invert = els.effInvert.checked;
      editor.commitHistory(els.effInvert.checked ? 'Invert Colors' : 'Disable Invert');
      editor.render(false);
    });

    els.btnResetEffects.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      editor.state.effects = { ...PixelStudio.Filters.DEFAULT_EFFECTS };
      editor.commitHistory('Reset Effects');
      editor.render(false);
      showToast('Effects reset');
    });

    // -----------------------------------------------------------------------
    // Text Tool Panel
    // -----------------------------------------------------------------------
    let textCommitTimer = null;
    function scheduleTextCommit(label = 'Edit Text') {
      clearTimeout(textCommitTimer);
      textCommitTimer = setTimeout(() => {
        editor.commitHistory(label);
      }, 380);
    }

    function syncTextInspector(selectedLayer) {
      const layers = editor.state.textLayers;
      if (!layers.length) {
        els.textLayersList.innerHTML =
          '<div class="empty-mini-state">No text layers yet. Click "+ Add Text" to place typography on your image.</div>';
        els.textEditorControls.classList.add('hidden');
        return;
      }

      els.textLayersList.innerHTML = '';
      layers.forEach((layer) => {
        const item = document.createElement('div');
        item.className = 'text-layer-item';
        if (layer.id === editor.selectedTextId) item.classList.add('active');
        item.innerHTML = `<span class="text-layer-preview">${escapeHtml(layer.text || 'Empty Text')}</span><span class="text-layer-dot" style="background:${layer.color}"></span>`;
        item.addEventListener('click', () => editor.selectTextLayer(layer.id));
        els.textLayersList.appendChild(item);
      });

      const active = selectedLayer || editor.getSelectedTextLayer();
      if (!active) {
        els.textEditorControls.classList.add('hidden');
        return;
      }

      els.textEditorControls.classList.remove('hidden');
      if (document.activeElement !== els.textContentInput) {
        els.textContentInput.value = active.text;
      }
      els.textFontFamily.value = active.fontFamily;
      els.textColorInput.value = active.color;
      els.textColorHex.textContent = active.color.toUpperCase();
      els.textFontSize.value = active.fontSize;
      els.numTextFontSize.value = active.fontSize;
      els.textPosX.value = Math.round(active.xPct);
      els.numTextPosX.value = Math.round(active.xPct);
      els.textPosY.value = Math.round(active.yPct);
      els.numTextPosY.value = Math.round(active.yPct);
      els.btnTextBold.classList.toggle('active', active.bold);
      els.btnTextItalic.classList.toggle('active', active.italic);
      els.btnTextShadow.classList.toggle('active', active.shadow);
    }

    function escapeHtml(str) {
      return str.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }

    editor.onTextSelectionChange = syncTextInspector;

    els.btnAddText.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      editor.addTextLayer('Pixel Studio');
      setActiveTool('text');
      els.textContentInput.focus();
      els.textContentInput.select();
    });

    els.textContentInput.addEventListener('input', () => {
      const layer = editor.getSelectedTextLayer();
      if (!layer) return;
      layer.text = els.textContentInput.value;
      editor.render(true);
      scheduleTextCommit('Update Text');
    });

    els.textFontFamily.addEventListener('change', () => {
      const layer = editor.getSelectedTextLayer();
      if (!layer) return;
      layer.fontFamily = els.textFontFamily.value;
      editor.commitHistory('Change Font');
      editor.render(false);
    });

    els.textColorInput.addEventListener('input', () => {
      const layer = editor.getSelectedTextLayer();
      if (!layer) return;
      layer.color = els.textColorInput.value;
      els.textColorHex.textContent = layer.color.toUpperCase();
      editor.render(true);
    });
    els.textColorInput.addEventListener('change', () => {
      if (!editor.getSelectedTextLayer()) return;
      editor.commitHistory('Text Color');
      editor.render(false);
    });

    bindSliderPair(
      els.textFontSize,
      els.numTextFontSize,
      (val) => {
        const layer = editor.getSelectedTextLayer();
        if (!layer) return;
        layer.fontSize = val;
        editor.render(true);
      },
      () => {
        if (!editor.getSelectedTextLayer()) return;
        editor.commitHistory('Text Size');
        editor.render(false);
      }
    );

    bindSliderPair(
      els.textPosX,
      els.numTextPosX,
      (val) => {
        const layer = editor.getSelectedTextLayer();
        if (!layer) return;
        layer.xPct = val;
        editor.render(true);
      },
      () => {
        if (!editor.getSelectedTextLayer()) return;
        editor.commitHistory('Move Text');
        editor.render(false);
      }
    );

    bindSliderPair(
      els.textPosY,
      els.numTextPosY,
      (val) => {
        const layer = editor.getSelectedTextLayer();
        if (!layer) return;
        layer.yPct = val;
        editor.render(true);
      },
      () => {
        if (!editor.getSelectedTextLayer()) return;
        editor.commitHistory('Move Text');
        editor.render(false);
      }
    );

    els.btnTextBold.addEventListener('click', () => {
      const layer = editor.getSelectedTextLayer();
      if (!layer) return;
      layer.bold = !layer.bold;
      editor.commitHistory('Toggle Bold');
      editor.render(false);
    });

    els.btnTextItalic.addEventListener('click', () => {
      const layer = editor.getSelectedTextLayer();
      if (!layer) return;
      layer.italic = !layer.italic;
      editor.commitHistory('Toggle Italic');
      editor.render(false);
    });

    els.btnTextShadow.addEventListener('click', () => {
      const layer = editor.getSelectedTextLayer();
      if (!layer) return;
      layer.shadow = !layer.shadow;
      editor.commitHistory('Toggle Text Shadow');
      editor.render(false);
    });

    els.btnTextCenter.addEventListener('click', () => {
      const layer = editor.getSelectedTextLayer();
      if (!layer) return;
      layer.xPct = 50;
      layer.yPct = 50;
      editor.commitHistory('Center Text');
      editor.render(false);
    });

    els.btnDeleteText.addEventListener('click', () => {
      editor.deleteSelectedTextLayer();
    });

    // -----------------------------------------------------------------------
    // Top Navigation & Recovery Actions
    // -----------------------------------------------------------------------
    els.btnUndo.addEventListener('click', () => {
      const snap = history.undo();
      if (snap) {
        editor.applySnapshot(snap);
        buildFilterGrid();
      }
    });

    els.btnRedo.addEventListener('click', () => {
      const snap = history.redo();
      if (snap) {
        editor.applySnapshot(snap);
        buildFilterGrid();
      }
    });

    els.btnCompare.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      editor.compareMode = !editor.compareMode;
      editor.render(false);
    });

    els.btnResetAllEdits.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      editor.resetAdjustments();
      showToast('All color adjustments, filters & effects reset');
    });

    els.btnRestoreOriginal.addEventListener('click', () => {
      if (!editor.hasImage()) return;
      editor.restoreOriginal();
      buildFilterGrid();
      showToast('Original image restored', 'success');
    });

    // -----------------------------------------------------------------------
    // Zoom & Pan Controls
    // -----------------------------------------------------------------------
    els.btnZoomIn.addEventListener('click', () => editor.setZoom(editor.zoom * 1.25));
    els.btnZoomOut.addEventListener('click', () => editor.setZoom(editor.zoom / 1.25));
    els.btnZoomFit.addEventListener('click', () => editor.fitToViewport());
    els.btnZoom100.addEventListener('click', () => {
      editor.panX = 0;
      editor.panY = 0;
      editor.setZoom(1);
    });
    els.btnPanMode.addEventListener('click', () => {
      editor.panMode = !editor.panMode;
      updateCanvasCursor();
      syncAllUI();
    });

    // Mouse Wheel Zoom
    els.canvasViewport.addEventListener(
      'wheel',
      (e) => {
        if (!editor.hasImage()) return;
        e.preventDefault();
        const rect = canvasEl.getBoundingClientRect();
        const vx = e.clientX - rect.left;
        const vy = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
        editor.zoomAtViewportPoint(factor, vx, vy);
      },
      { passive: false }
    );

    // -----------------------------------------------------------------------
    // Canvas Pointer Interaction (Crop, Text Drag, Split Compare, Pan)
    // -----------------------------------------------------------------------
    let pointerMode = null; // 'pan' | 'crop' | 'text' | 'compare'
    let dragStartScreen = null;
    let dragStartPan = null;
    let dragTextLayer = null;
    let dragTextOffsetPct = null;
    let spacePressed = false;

    function getViewportCoords(e) {
      const rect = canvasEl.getBoundingClientRect();
      return {
        vx: e.clientX - rect.left,
        vy: e.clientY - rect.top,
      };
    }

    function updateCanvasCursor(vx, vy) {
      if (!editor.hasImage()) {
        canvasEl.style.cursor = 'default';
        return;
      }
      if (spacePressed || editor.panMode) {
        canvasEl.style.cursor = pointerMode === 'pan' ? 'grabbing' : 'grab';
        return;
      }
      if (editor.compareMode) {
        canvasEl.style.cursor = 'ew-resize';
        return;
      }
      if (editor.activeTool === 'crop' && vx !== undefined) {
        const handle = editor.cropTool.hitTest(vx, vy, editor.getScreenTransform());
        canvasEl.style.cursor = handle ? editor.cropTool.getCursorForHandle(handle) : 'default';
        return;
      }
      if (editor.activeTool === 'text' && vx !== undefined) {
        const imgPt = editor.viewportToImageCoords(vx, vy);
        const hit = editor.hitTestTextLayer(imgPt.x, imgPt.y);
        canvasEl.style.cursor = hit ? 'move' : 'default';
        return;
      }
      canvasEl.style.cursor = editor.zoom > editor.fitZoom * 1.03 ? 'grab' : 'default';
    }

    canvasEl.addEventListener('pointerdown', (e) => {
      if (!editor.hasImage()) return;
      const { vx, vy } = getViewportCoords(e);
      canvasEl.setPointerCapture(e.pointerId);

      // Middle click or Space or Pan mode -> Pan
      if (e.button === 1 || spacePressed || editor.panMode) {
        pointerMode = 'pan';
        dragStartScreen = { x: e.clientX, y: e.clientY };
        dragStartPan = { x: editor.panX, y: editor.panY };
        updateCanvasCursor(vx, vy);
        return;
      }

      // Compare Split Slider
      if (editor.compareMode) {
        pointerMode = 'compare';
        const t = editor.getScreenTransform();
        editor.compareSplit = Math.max(0, Math.min(1, (vx - t.offsetX) / t.drawW));
        editor.render(true);
        return;
      }

      // Crop Handle / Box
      if (editor.activeTool === 'crop') {
        const t = editor.getScreenTransform();
        const handle = editor.cropTool.hitTest(vx, vy, t);
        if (handle) {
          pointerMode = 'crop';
          const imgPt = editor.viewportToImageCoords(vx, vy);
          editor.cropTool.beginDrag(handle, imgPt.x, imgPt.y);
          return;
        }
      }

      // Text Layer Drag
      if (editor.activeTool === 'text') {
        const imgPt = editor.viewportToImageCoords(vx, vy);
        const hit = editor.hitTestTextLayer(imgPt.x, imgPt.y);
        if (hit) {
          pointerMode = 'text';
          editor.selectTextLayer(hit.id);
          dragTextLayer = hit;
          const clickXPct = (imgPt.x / editor.baseCanvas.width) * 100;
          const clickYPct = (imgPt.y / editor.baseCanvas.height) * 100;
          dragTextOffsetPct = { dx: hit.xPct - clickXPct, dy: hit.yPct - clickYPct };
          return;
        }
      }

      // Fallback pan when zoomed in
      if (editor.zoom > editor.fitZoom * 1.03) {
        pointerMode = 'pan';
        dragStartScreen = { x: e.clientX, y: e.clientY };
        dragStartPan = { x: editor.panX, y: editor.panY };
        canvasEl.style.cursor = 'grabbing';
      }
    });

    canvasEl.addEventListener('pointermove', (e) => {
      if (!editor.hasImage()) return;
      const { vx, vy } = getViewportCoords(e);

      if (!pointerMode) {
        updateCanvasCursor(vx, vy);
        return;
      }

      if (pointerMode === 'pan') {
        editor.panX = dragStartPan.x + (e.clientX - dragStartScreen.x);
        editor.panY = dragStartPan.y + (e.clientY - dragStartScreen.y);
        editor.render(true);
      } else if (pointerMode === 'compare') {
        const t = editor.getScreenTransform();
        editor.compareSplit = Math.max(0, Math.min(1, (vx - t.offsetX) / t.drawW));
        editor.render(true);
      } else if (pointerMode === 'crop') {
        const imgPt = editor.viewportToImageCoords(vx, vy);
        editor.cropTool.updateDrag(imgPt.x, imgPt.y);
        editor.render(true);
      } else if (pointerMode === 'text' && dragTextLayer) {
        const imgPt = editor.viewportToImageCoords(vx, vy);
        const rawX = (imgPt.x / editor.baseCanvas.width) * 100 + dragTextOffsetPct.dx;
        const rawY = (imgPt.y / editor.baseCanvas.height) * 100 + dragTextOffsetPct.dy;
        dragTextLayer.xPct = Math.max(0, Math.min(100, rawX));
        dragTextLayer.yPct = Math.max(0, Math.min(100, rawY));
        editor.render(true);
      }
    });

    function finishPointerInteraction(e) {
      if (!pointerMode) return;
      if (pointerMode === 'crop') {
        editor.cropTool.endDrag();
        editor.render(false);
      } else if (pointerMode === 'text') {
        editor.commitHistory('Move Text');
        editor.render(false);
      } else if (pointerMode === 'pan' || pointerMode === 'compare') {
        editor.render(false);
      }
      pointerMode = null;
      dragTextLayer = null;
      if (e && canvasEl.hasPointerCapture(e.pointerId)) {
        canvasEl.releasePointerCapture(e.pointerId);
      }
      updateCanvasCursor();
    }

    canvasEl.addEventListener('pointerup', finishPointerInteraction);
    canvasEl.addEventListener('pointercancel', finishPointerInteraction);

    // -----------------------------------------------------------------------
    // File Upload, Drag-and-Drop & Clipboard Paste
    // -----------------------------------------------------------------------
    async function handleSelectedFile(file) {
      if (!file) return;
      try {
        await editor.loadImageFile(file);
        showToast(`Opened ${file.name || 'image'}`, 'success');
      } catch (err) {
        showToast(err.message || 'Could not load image', 'error');
      }
    }

    els.btnPlaceholderUpload.addEventListener('click', () => els.fileInput.click());
    els.btnModalUpload.addEventListener('click', () => {
      closeModal(els.newProjectModal);
      els.fileInput.click();
    });

    els.fileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) handleSelectedFile(file);
      els.fileInput.value = '';
    });

    async function loadSamplePhoto() {
      try {
        await editor.loadImageFromURL('assets/images/sample-photo.png', 'sample-twilight.png', 'PNG');
        showToast('Loaded sample photo', 'success');
      } catch (err) {
        showToast('Could not load sample image', 'error');
      }
    }

    els.btnLoadSample.addEventListener('click', loadSamplePhoto);
    els.btnModalSample.addEventListener('click', () => {
      closeModal(els.newProjectModal);
      loadSamplePhoto();
    });

    // Drag and drop on stage / window
    let dragCounter = 0;
    window.addEventListener('dragenter', (e) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
        dragCounter++;
        els.dropOverlay.classList.remove('hidden');
      }
    });
    window.addEventListener('dragover', (e) => {
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        e.preventDefault();
      }
    });
    window.addEventListener('dragleave', () => {
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) {
        els.dropOverlay.classList.add('hidden');
      }
    });
    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      els.dropOverlay.classList.add('hidden');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleSelectedFile(file);
    });

    // Clipboard Paste (Ctrl+V)
    window.addEventListener('paste', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const blob = item.getAsFile();
          if (blob) {
            const ext = item.type.split('/')[1] || 'png';
            const namedFile = new File([blob], `pasted-image.${ext}`, { type: item.type });
            handleSelectedFile(namedFile);
            e.preventDefault();
            return;
          }
        }
      }
    });

    // -----------------------------------------------------------------------
    // New Project Modal
    // -----------------------------------------------------------------------
    els.btnNewProject.addEventListener('click', () => openModal(els.newProjectModal));

    els.btnCreateBlank.addEventListener('click', () => {
      const w = Number(els.blankWidth.value) || 1280;
      const h = Number(els.blankHeight.value) || 720;
      const bg = els.blankBgColor.value;
      editor.createBlankCanvas(w, h, bg);
      closeModal(els.newProjectModal);
      showToast(`Created ${w} × ${h} canvas`, 'success');
    });

    // -----------------------------------------------------------------------
    // Export Modal
    // -----------------------------------------------------------------------
    let selectedExportFormat = 'image/png';
    let cachedExportCanvas = null;

    async function updateExportEstimate() {
      if (!cachedExportCanvas) return;
      els.exportEstSize.textContent = 'Calculating…';
      try {
        const quality = Number(els.exportQuality.value) / 100;
        const blob = await PixelStudio.Exporter.encodeCanvasToBlob(
          cachedExportCanvas,
          selectedExportFormat,
          quality
        );
        els.exportEstSize.textContent = PixelStudio.Exporter.formatBytes(blob.size);
      } catch (err) {
        els.exportEstSize.textContent = 'Unavailable';
      }
    }

    function openExportModal() {
      if (!editor.hasImage()) return;
      cachedExportCanvas = editor.renderFullResolutionForExport();
      const baseName = (editor.meta.name || 'pixel-studio-edit').replace(/\.[^.]+$/, '');
      els.exportFilename.value = `${baseName}-edited`;
      els.exportDimensions.textContent = `${cachedExportCanvas.width} × ${cachedExportCanvas.height} px`;
      updateExportQualityUI();
      openModal(els.exportModal);
      updateExportEstimate();
    }

    function updateExportQualityUI() {
      const isLossless = selectedExportFormat === 'image/png';
      els.exportQuality.disabled = isLossless;
      els.exportQualityWrap.style.opacity = isLossless ? '0.55' : '1';
      if (selectedExportFormat === 'image/png') {
        els.exportFormatNote.textContent = 'PNG is lossless (quality slider applies to JPG & WEBP).';
      } else if (selectedExportFormat === 'image/webp') {
        const supported = PixelStudio.Exporter.isFormatSupported('image/webp');
        els.exportFormatNote.textContent = supported
          ? 'WEBP offers high quality with smaller file sizes.'
          : 'WEBP encoding is not supported by this browser; PNG fallback will be used.';
      } else {
        els.exportFormatNote.textContent = 'JPG flattens transparency onto a crisp white background.';
      }
    }

    els.btnExport.addEventListener('click', openExportModal);

    els.exportFormatBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        els.exportFormatBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        selectedExportFormat = btn.dataset.format;
        updateExportQualityUI();
        updateExportEstimate();
      });
    });

    els.exportQuality.addEventListener('input', () => {
      els.exportQualityVal.textContent = `${els.exportQuality.value}%`;
    });
    els.exportQuality.addEventListener('change', updateExportEstimate);

    els.btnConfirmExport.addEventListener('click', async () => {
      if (!cachedExportCanvas) return;
      try {
        const { filename, size } = await PixelStudio.Exporter.downloadImage(
          cachedExportCanvas,
          els.exportFilename.value,
          selectedExportFormat,
          Number(els.exportQuality.value)
        );
        closeModal(els.exportModal);
        showToast(`Exported ${filename} (${PixelStudio.Exporter.formatBytes(size)})`, 'success');
      } catch (err) {
        showToast(err.message || 'Export failed', 'error');
      }
    });

    // -----------------------------------------------------------------------
    // Settings Modal
    // -----------------------------------------------------------------------
    els.btnSettings.addEventListener('click', () => openModal(els.settingsModal));

    els.settingCanvasBg.addEventListener('change', () => {
      editor.settings.canvasBg = els.settingCanvasBg.value;
      saveSettings();
      editor.render(false);
    });

    els.settingSmoothing.addEventListener('change', () => {
      editor.settings.smoothing = els.settingSmoothing.checked;
      saveSettings();
      editor.render(false);
    });

    els.settingGridGuides.addEventListener('change', () => {
      editor.settings.gridGuides = els.settingGridGuides.checked;
      saveSettings();
      editor.render(false);
    });

    els.settingHistoryLimit.addEventListener('change', () => {
      history.setMaxSteps(Number(els.settingHistoryLimit.value));
      saveSettings();
    });

    els.btnResetSettings.addEventListener('click', () => {
      editor.settings.canvasBg = 'checker-dark';
      editor.settings.smoothing = true;
      editor.settings.gridGuides = false;
      history.setMaxSteps(35);

      els.settingCanvasBg.value = 'checker-dark';
      els.settingSmoothing.checked = true;
      els.settingGridGuides.checked = false;
      els.settingHistoryLimit.value = '35';

      saveSettings();
      editor.render(false);
      showToast('Settings restored to defaults');
    });

    // -----------------------------------------------------------------------
    // Keyboard Shortcuts & Window Resize
    // -----------------------------------------------------------------------
    window.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      if (e.code === 'Space' && !isTyping && editor.hasImage()) {
        e.preventDefault();
        if (!spacePressed) {
          spacePressed = true;
          updateCanvasCursor();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (isTyping) return;
        e.preventDefault();
        if (e.shiftKey) {
          els.btnRedo.click();
        } else {
          els.btnUndo.click();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        if (isTyping) return;
        e.preventDefault();
        els.btnRedo.click();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (editor.hasImage()) openExportModal();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        editor.fitToViewport();
        return;
      }

      if (isTyping) return;

      if (e.key === '\\' && editor.hasImage()) {
        els.btnCompare.click();
      } else if ((e.key === '+' || e.key === '=') && editor.hasImage()) {
        editor.setZoom(editor.zoom * 1.2);
      } else if (e.key === '-' && editor.hasImage()) {
        editor.setZoom(editor.zoom / 1.2);
      } else if (e.key === 'Enter' && editor.activeTool === 'crop' && editor.hasImage()) {
        els.btnApplyCrop.click();
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop:not(.hidden)').forEach((m) => closeModal(m));
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space') {
        spacePressed = false;
        updateCanvasCursor();
      }
    });

    const resizeObserver = new ResizeObserver(() => {
      editor.render(false);
    });
    resizeObserver.observe(els.canvasViewport);

    syncAllUI();
  });
})(window);
