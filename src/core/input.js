/**
 * Keyboard + mouse input with a named-action layer.
 *
 * Gameplay code asks "is `interact` down?" instead of hardcoding `KeyE`.
 * Bindings are physical `KeyboardEvent.code` values, so they work on any
 * keyboard layout. Mouse buttons use `Mouse0`, `Mouse1`, `Mouse2`.
 */

export const ACTIONS = Object.freeze({
  MOVE_UP: 'move_up',
  MOVE_DOWN: 'move_down',
  MOVE_LEFT: 'move_left',
  MOVE_RIGHT: 'move_right',
  INTERACT: 'interact',
  CONFIRM: 'confirm',
  CANCEL: 'cancel',
  PAUSE: 'pause',
  DODGE: 'dodge',
  FIRE: 'fire',
  COUNTER: 'counter',
});

/** Default bindings. Phase 1+ may extend these without touching consumers. */
export const DEFAULT_BINDINGS = Object.freeze({
  [ACTIONS.MOVE_UP]: ['KeyW', 'ArrowUp'],
  [ACTIONS.MOVE_DOWN]: ['KeyS', 'ArrowDown'],
  [ACTIONS.MOVE_LEFT]: ['KeyA', 'ArrowLeft'],
  [ACTIONS.MOVE_RIGHT]: ['KeyD', 'ArrowRight'],
  [ACTIONS.INTERACT]: ['KeyE'],
  [ACTIONS.CONFIRM]: ['Enter', 'Space'],
  [ACTIONS.CANCEL]: ['Escape', 'Backspace'],
  [ACTIONS.PAUSE]: ['Escape', 'KeyP'],
  [ACTIONS.DODGE]: ['ShiftLeft', 'ShiftRight'],
  [ACTIONS.FIRE]: ['Mouse0'],
  [ACTIONS.COUNTER]: ['Space'],
});

const MOUSE_CODE_PATTERN = /^Mouse(\d+)$/;
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']);

/** True when a DOM target is a text field and should keep its keys. */
export function isEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;
  if (EDITABLE_TAGS.has(target.tagName)) return true;
  return target.isContentEditable === true;
}

function mouseButtonForCode(code) {
  const match = MOUSE_CODE_PATTERN.exec(code);
  return match ? Number(match[1]) : null;
}

export class Input {
  /**
   * @param {Window} target - event source (window for keyboard/mouse)
   * @param {HTMLCanvasElement} [canvas] - used to map pointer coordinates
   */
  constructor(target = window, canvas = null) {
    this.target = target;
    this.canvas = canvas;
    this.bindings = structuredClone(DEFAULT_BINDINGS);
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();

    this.keyCodes = new Set();
    this.buttons = 0;
    this.pointer = { x: 0, y: 0, inside: false };
    this.pointerMap = null;

    this._onKeyDown = (event) => this._handleKeyDown(event);
    this._onKeyUp = (event) => this._handleKeyUp(event);
    this._onPointerDown = (event) => this._handlePointerDown(event);
    this._onPointerUp = (event) => this._handlePointerUp(event);
    this._onPointerMove = (event) => this._handlePointerMove(event);
    this._onPointerLeave = () => {
      this.pointer.inside = false;
    };
    this._onBlur = () => this.releaseAll();
    this._onContextMenu = (event) => {
      if (this.canvas && event.target === this.canvas) event.preventDefault();
    };

    this.target.addEventListener('keydown', this._onKeyDown, { passive: false });
    this.target.addEventListener('keyup', this._onKeyUp);
    this.target.addEventListener('pointerdown', this._onPointerDown);
    this.target.addEventListener('pointerup', this._onPointerUp);
    this.target.addEventListener('pointermove', this._onPointerMove);
    this.target.addEventListener('pointercancel', this._onPointerUp);
    this.target.addEventListener('blur', this._onBlur);
    if (this.canvas) {
      this.canvas.addEventListener('pointerleave', this._onPointerLeave);
      this.canvas.addEventListener('contextmenu', this._onContextMenu);
    }
  }

  /**
   * Install a function that converts canvas-local CSS pixels into game-space
   * coordinates (for example, to undo letterboxing).
   * @param {((point: {x:number,y:number}) => {x:number,y:number}) | null} mapper
   */
  setPointerMap(mapper) {
    this.pointerMap = mapper;
  }

  /** Replace some action bindings. Values are arrays of key/mouse codes. */
  setBindings(overrides = {}) {
    for (const [action, codes] of Object.entries(overrides)) {
      if (!Array.isArray(codes) || codes.length === 0) {
        throw new Error(`Input binding for "${action}" must be a non-empty array.`);
      }
      this.bindings[action] = [...codes];
    }
    this._refresh();
  }

  /** All bindings currently assigned to an action. */
  getBindings(action) {
    return [...(this.bindings[action] ?? [])];
  }

  isDown(action) {
    return this.down.has(action);
  }

  wasPressed(action) {
    return this.pressed.has(action);
  }

  wasReleased(action) {
    return this.released.has(action);
  }

  /** -1..1 from two actions (for example MOVE_LEFT / MOVE_RIGHT). */
  getAxis(negativeAction, positiveAction) {
    return (this.isDown(positiveAction) ? 1 : 0) - (this.isDown(negativeAction) ? 1 : 0);
  }

  /** Normalised movement vector; diagonal movement is not faster. */
  getMoveVector() {
    const x = this.getAxis(ACTIONS.MOVE_LEFT, ACTIONS.MOVE_RIGHT);
    const y = this.getAxis(ACTIONS.MOVE_UP, ACTIONS.MOVE_DOWN);
    if (x === 0 && y === 0) return { x: 0, y: 0 };
    const length = Math.hypot(x, y);
    return { x: x / length, y: y / length };
  }

  /** True when any bound action is currently down. */
  anyDown() {
    return this.down.size > 0;
  }

  /** Call once per rendered frame, after game logic has read pressed/released. */
  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  /** Clear every held key/button (used on blur and pause). */
  releaseAll() {
    this.keyCodes.clear();
    this.buttons = 0;
    this.pointer.inside = false;
    this._refresh();
  }

  destroy() {
    this.target.removeEventListener('keydown', this._onKeyDown);
    this.target.removeEventListener('keyup', this._onKeyUp);
    this.target.removeEventListener('pointerdown', this._onPointerDown);
    this.target.removeEventListener('pointerup', this._onPointerUp);
    this.target.removeEventListener('pointermove', this._onPointerMove);
    this.target.removeEventListener('pointercancel', this._onPointerUp);
    this.target.removeEventListener('blur', this._onBlur);
    if (this.canvas) {
      this.canvas.removeEventListener('pointerleave', this._onPointerLeave);
      this.canvas.removeEventListener('contextmenu', this._onContextMenu);
    }
  }

  _handleKeyDown(event) {
    if (isEditableTarget(event.target)) return;
    if (this._codeHasBinding(event.code)) event.preventDefault();
    if (event.repeat) return;
    this.keyCodes.add(event.code);
    this._refresh();
  }

  _handleKeyUp(event) {
    this.keyCodes.delete(event.code);
    this._refresh();
  }

  _handlePointerDown(event) {
    if (isEditableTarget(event.target)) return;
    this.buttons |= 1 << event.button;
    this._updatePointer(event);
    this._refresh();
  }

  _handlePointerUp(event) {
    this.buttons &= ~(1 << event.button);
    this._updatePointer(event);
    this._refresh();
  }

  _handlePointerMove(event) {
    this.pointer.inside =
      !!this.canvas && (event.target === this.canvas || this.canvas.contains(event.target));
    this._updatePointer(event);
  }

  _updatePointer(event) {
    if (!this.canvas) {
      this.pointer.x = event.clientX;
      this.pointer.y = event.clientY;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    let point = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    if (this.pointerMap) {
      const mapped = this.pointerMap(point);
      if (mapped) point = mapped;
    }
    this.pointer.x = point.x;
    this.pointer.y = point.y;
  }

  _codeHasBinding(code) {
    for (const codes of Object.values(this.bindings)) {
      if (codes.includes(code)) return true;
    }
    return false;
  }

  _isCodeDown(code) {
    const button = mouseButtonForCode(code);
    if (button !== null) return (this.buttons & (1 << button)) !== 0;
    return this.keyCodes.has(code);
  }

  _refresh() {
    const next = new Set();
    for (const [action, codes] of Object.entries(this.bindings)) {
      if (codes.some((code) => this._isCodeDown(code))) next.add(action);
    }

    for (const action of next) {
      if (!this.down.has(action)) this.pressed.add(action);
    }
    for (const action of this.down) {
      if (!next.has(action)) this.released.add(action);
    }
    this.down = next;
  }
}
