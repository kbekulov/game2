type PointerHandler = (locked: boolean) => void;

export class InputManager {
  private readonly keys = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();
  private readonly pointerHandlers = new Set<PointerHandler>();
  private mouseDown = false;
  private mousePressed = false;
  private dx = 0;
  private dy = 0;

  constructor(private readonly canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("mousemove", this.onMouseMove);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
  }

  destroy(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("pointerlockchange", this.onPointerLockChange);
  }

  beginFrame(): void {
    this.dx = 0;
    this.dy = 0;
    this.pressed.clear();
    this.released.clear();
    this.mousePressed = false;
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }

  wasPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  wasReleased(code: string): boolean {
    return this.released.has(code);
  }

  isMouseDown(): boolean {
    return this.mouseDown;
  }

  wasMousePressed(): boolean {
    return this.mousePressed;
  }

  getLookDelta(): { dx: number; dy: number } {
    return { dx: this.dx, dy: this.dy };
  }

  isPointerLocked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  requestPointerLock(): void {
    void this.canvas.requestPointerLock();
  }

  onPointerLock(handler: PointerHandler): void {
    this.pointerHandlers.add(handler);
  }

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (!this.keys.has(event.code)) this.pressed.add(event.code);
    this.keys.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    this.released.add(event.code);
  };

  private readonly onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    if (!this.mouseDown) this.mousePressed = true;
    this.mouseDown = true;
  };

  private readonly onMouseUp = (event: MouseEvent): void => {
    if (event.button !== 0) return;
    this.mouseDown = false;
  };

  private readonly onMouseMove = (event: MouseEvent): void => {
    if (!this.isPointerLocked()) return;
    this.dx += event.movementX;
    this.dy += event.movementY;
  };

  private readonly onPointerLockChange = (): void => {
    const locked = this.isPointerLocked();
    for (const handler of this.pointerHandlers) handler(locked);
  };
}
