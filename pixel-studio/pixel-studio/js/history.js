/**
 * Pixel Studio — Editing History Manager
 * Manages non-destructive undo/redo state snapshots with memory-efficient
 * canvas reference sharing for non-geometric edits.
 */
(function (global) {
  'use strict';

  const PixelStudio = (global.PixelStudio = global.PixelStudio || {});

  class HistoryManager {
    constructor(maxSteps = 35) {
      this.maxSteps = maxSteps;
      this.entries = [];
      this.index = -1;
      this.onChange = null;
    }

    /**
     * Update maximum number of retained undo steps.
     * @param {number} limit
     */
    setMaxSteps(limit) {
      this.maxSteps = Math.max(5, Number(limit) || 35);
      while (this.entries.length > this.maxSteps && this.index > 0) {
        this.entries.shift();
        this.index--;
      }
      this._emit();
    }

    /**
     * Deep-clone serializable editor state while sharing immutable baseCanvas references.
     * @param {Object} snapshot
     * @returns {Object}
     */
    _cloneSnapshot(snapshot) {
      return {
        baseCanvas: snapshot.baseCanvas,
        adjustments: { ...snapshot.adjustments },
        filter: snapshot.filter,
        filterIntensity: snapshot.filterIntensity,
        effects: { ...snapshot.effects },
        fineRotation: snapshot.fineRotation,
        textLayers: snapshot.textLayers.map((layer) => ({ ...layer })),
      };
    }

    /**
     * Push a new editing state onto the history stack, discarding any redo branch.
     * @param {Object} snapshot
     * @param {string} label
     */
    push(snapshot, label) {
      if (this.index < this.entries.length - 1) {
        this.entries = this.entries.slice(0, this.index + 1);
      }

      this.entries.push({
        label: label || 'Edit',
        timestamp: Date.now(),
        snapshot: this._cloneSnapshot(snapshot),
      });

      if (this.entries.length > this.maxSteps) {
        this.entries.shift();
      } else {
        this.index++;
      }
      this.index = this.entries.length - 1;
      this._emit();
    }

    canUndo() {
      return this.index > 0;
    }

    canRedo() {
      return this.index >= 0 && this.index < this.entries.length - 1;
    }

    /**
     * Step backward one history state and return a cloned snapshot.
     * @returns {Object|null}
     */
    undo() {
      if (!this.canUndo()) return null;
      this.index--;
      this._emit();
      return this._cloneSnapshot(this.entries[this.index].snapshot);
    }

    /**
     * Step forward one history state and return a cloned snapshot.
     * @returns {Object|null}
     */
    redo() {
      if (!this.canRedo()) return null;
      this.index++;
      this._emit();
      return this._cloneSnapshot(this.entries[this.index].snapshot);
    }

    /**
     * Jump directly to a specific history entry index.
     * @param {number} targetIndex
     * @returns {Object|null}
     */
    jumpTo(targetIndex) {
      if (targetIndex < 0 || targetIndex >= this.entries.length || targetIndex === this.index) {
        return null;
      }
      this.index = targetIndex;
      this._emit();
      return this._cloneSnapshot(this.entries[this.index].snapshot);
    }

    clear() {
      this.entries = [];
      this.index = -1;
      this._emit();
    }

    getEntries() {
      return this.entries;
    }

    getCurrentIndex() {
      return this.index;
    }

    _emit() {
      if (typeof this.onChange === 'function') {
        this.onChange({
          canUndo: this.canUndo(),
          canRedo: this.canRedo(),
          entries: this.entries,
          currentIndex: this.index,
        });
      }
    }
  }

  PixelStudio.HistoryManager = HistoryManager;
})(window);
