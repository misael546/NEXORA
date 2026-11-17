/* NEXORA ANIMATE — secuencia de fotogramas (flipbook).
 *
 * La idea del motor es simple: el usuario sube sus imágenes como fotogramas
 * en orden y el motor las anima. No hay rig ni esqueleto aquí: cada imagen
 * es un fotograma y el tiempo decide cuál se dibuja.
 *
 * - fps: fotogramas por segundo (1 a 60).
 * - loop: "loop" (repetir), "once" (una vez y quedarse en el último) o
 *   "pingpong" (ir y venir: 1, 2, 3, 2, 1, 2, 3...).
 * - onionSkin: si es true, al dibujar también se dibuja el fotograma
 *   anterior con poca opacidad, para ver el movimiento (piel de cebolla).
 */
(() => {
  "use strict";
  const LOOP_MODES = ["loop", "once", "pingpong"];
  class FrameSequence {
    constructor({ fps = 12, loop = "loop", onionSkin = false } = {}) {
      this.frames = [];
      this.setFps(fps);
      this.setLoop(loop);
      this.onionSkin = !!onionSkin;
    }
    setFps(fps) {
      const rate = Math.floor(fps);
      if (!Number.isFinite(rate) || rate < 1 || rate > 60)
        throw new Error("Los fps deben estar entre 1 y 60");
      this.fps = rate;
      return this.fps;
    }
    setLoop(loop) {
      if (!LOOP_MODES.includes(loop))
        throw new Error("Modo de repetición no válido: " + loop);
      this.loop = loop;
      return this.loop;
    }
    // Añade una imagen ya cargada (HTMLImageElement, ImageBitmap o canvas).
    // Se guarda tal cual; el motor no la copia ni la reescala.
    addImage(image, name = "") {
      if (
        !image ||
        !Number.isFinite(image.width) ||
        !Number.isFinite(image.height)
      )
        throw new Error("El fotograma debe ser una imagen con ancho y alto");
      const frame = {
        id:
          "frame_" +
          Date.now().toString(36) +
          "_" +
          Math.random().toString(36).slice(2, 8),
        image,
        name: String(name || "Fotograma " + (this.frames.length + 1)),
        width: image.width,
        height: image.height,
      };
      this.frames.push(frame);
      return frame;
    }
    // Carga archivos de imagen (File / Blob) del selector de archivos.
    // Usa createImageBitmap cuando existe y si no, un <img> con object URL.
    async addFiles(files) {
      const added = [];
      for (const file of files || []) {
        if (!file || !String(file.type || "").startsWith("image/")) continue;
        let image = null;
        if (typeof createImageBitmap === "function") {
          image = await createImageBitmap(file);
        } else {
          const url = URL.createObjectURL(file);
          try {
            image = await new Promise((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = () =>
                reject(new Error("No se pudo cargar " + file.name));
              img.src = url;
            });
          } finally {
            URL.revokeObjectURL(url);
          }
        }
        added.push(this.addImage(image, file.name || ""));
      }
      return added;
    }
    remove(index) {
      if (index < 0 || index >= this.frames.length) return false;
      this.frames.splice(index, 1);
      return true;
    }
    // Corta una hoja de sprites: una sola imagen con los fotogramas en
    // rejilla (cols columnas x rows filas), de izquierda a derecha y de
    // arriba abajo. Cada celda se añade como un fotograma, sin perder
    // resolución: el corte es exacto, celda a celda. makeCanvas es
    // inyectable para poder probarlo sin DOM.
    addSpriteSheet(image, cols, rows, makeCanvas) {
      if (
        !image ||
        !Number.isFinite(image.width) ||
        !Number.isFinite(image.height)
      )
        throw new Error("La hoja debe ser una imagen con ancho y alto");
      const columns = Math.floor(cols);
      const lines = Math.floor(rows);
      if (
        !Number.isFinite(columns) ||
        columns < 1 ||
        !Number.isFinite(lines) ||
        lines < 1
      )
        throw new Error("Columnas y filas deben ser 1 o más");
      const cellWidth = Math.floor(image.width / columns);
      const cellHeight = Math.floor(image.height / lines);
      if (cellWidth < 1 || cellHeight < 1)
        throw new Error("La hoja es demasiado pequeña para esa rejilla");
      const create = makeCanvas || (() => document.createElement("canvas"));
      const added = [];
      for (let row = 0; row < lines; row++) {
        for (let col = 0; col < columns; col++) {
          const canvas = create();
          canvas.width = cellWidth;
          canvas.height = cellHeight;
          const cellCtx = canvas.getContext("2d");
          cellCtx.drawImage(
            image,
            col * cellWidth,
            row * cellHeight,
            cellWidth,
            cellHeight,
            0,
            0,
            cellWidth,
            cellHeight,
          );
          added.push(this.addImage(canvas, "Hoja " + (added.length + 1)));
        }
      }
      return added;
    }
    move(index, direction) {
      const target = index + direction;
      if (
        index < 0 ||
        index >= this.frames.length ||
        target < 0 ||
        target >= this.frames.length
      )
        return false;
      const [frame] = this.frames.splice(index, 1);
      this.frames.splice(target, 0, frame);
      return true;
    }
    clear() {
      this.frames = [];
    }
    get count() {
      return this.frames.length;
    }
    duration() {
      return this.frames.length ? this.frames.length / this.fps : 0;
    }
    // Índice del fotograma que toca en el tiempo t (segundos).
    frameIndexAt(time) {
      const n = this.frames.length;
      if (!n) return -1;
      const position = Math.max(0, time) * this.fps;
      if (this.loop === "once") return Math.min(Math.floor(position), n - 1);
      if (this.loop === "pingpong") {
        if (n === 1) return 0;
        const cycle = 2 * (n - 1);
        const step = Math.floor(position) % cycle;
        return step < n ? step : cycle - step;
      }
      return Math.floor(position) % n;
    }
    frameAt(time) {
      const index = this.frameIndexAt(time);
      return index < 0 ? null : this.frames[index];
    }
    // Dibuja el fotograma que toca en el tiempo t, centrado y ajustado al
    // lienzo sin deformarlo. Devuelve el índice dibujado, o -1 si no hay.
    draw(ctx, time, width, height) {
      const index = this.frameIndexAt(time);
      if (index < 0 || !ctx) return -1;
      if (this.onionSkin && index > 0) {
        const previous = this.frames[index - 1];
        ctx.save();
        ctx.globalAlpha = 0.3;
        this.drawFrame(ctx, previous, width, height);
        ctx.restore();
      }
      this.drawFrame(ctx, this.frames[index], width, height);
      return index;
    }
    drawFrame(ctx, frame, width, height) {
      const scale = Math.min(width / frame.width, height / frame.height, 1);
      const w = frame.width * scale;
      const h = frame.height * scale;
      ctx.drawImage(frame.image, (width - w) / 2, (height - h) / 2, w, h);
    }
  }
  window.NexoraFrameSequence = { FrameSequence, LOOP_MODES };
})();
