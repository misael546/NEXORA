/* NEXORA ANIMATE — movimiento de cámara sobre una foto.
 *
 * El modo "Foto con cámara" convierte una sola imagen en un vídeo: la
 * cámara se mueve sobre la foto (acercar, alejar, desplazar o derivar)
 * y el motor graba ese movimiento. No se inventa movimiento del
 * personaje: la foto es la misma, lo que se mueve es la cámara.
 *
 * - computeView es puro y se puede probar sin DOM: dada la foto, el
 *   lienzo, el movimiento y el tiempo, devuelve el rectángulo destino
 *   (x, y, w, h) con ajuste de cobertura: la imagen siempre cubre el
 *   lienzo entero, nunca se ven bordes ni fondo.
 * - draw dibuja la foto con la vista que toca en el tiempo t.
 * - El progreso usa una suavización de entrada y salida para que el
 *   movimiento arranque y termine despacio, como una cámara de verdad.
 */
(() => {
  "use strict";
  const MOVES = ["zoom-in", "zoom-out", "pan-left", "pan-right", "drift"];
  function easeInOut(p) {
    if (p < 0.5) return 2 * p * p;
    return 1 - Math.pow(-2 * p + 2, 2) / 2;
  }
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }
  // Rectángulo destino en el lienzo para la foto en el tiempo t (segundos).
  function computeView(imageW, imageH, canvasW, canvasH, move, t, duration) {
    if (!MOVES.includes(move)) {
      throw new Error("Movimiento de cámara no válido: " + move);
    }
    if (
      !(imageW > 0) ||
      !(imageH > 0) ||
      !(canvasW > 0) ||
      !(canvasH > 0)
    ) {
      throw new Error("Las dimensiones deben ser mayores que 0");
    }
    const total = Number(duration);
    if (!Number.isFinite(total) || total <= 0) {
      throw new Error("La duración debe ser mayor que 0");
    }
    const p = easeInOut(clamp(Number(t) / total, 0, 1));
    // Escala base de cobertura: la foto cubre el lienzo aunque sobre.
    const baseScale = Math.max(canvasW / imageW, canvasH / imageH);
    let zoom;
    let ox = 0;
    let oy = 0;
    if (move === "zoom-in") {
      zoom = 1 + 0.3 * p;
    } else if (move === "zoom-out") {
      zoom = 1.3 - 0.3 * p;
    } else if (move === "pan-left") {
      zoom = 1.15;
      ox = 1 - 2 * p;
    } else if (move === "pan-right") {
      zoom = 1.15;
      ox = -1 + 2 * p;
    } else {
      zoom = 1 + 0.2 * p;
      ox = -0.6 + 1.2 * p;
      oy = -0.5 + 1.0 * p;
    }
    const w = imageW * baseScale * zoom;
    const h = imageH * baseScale * zoom;
    const maxOx = Math.max(0, (w - canvasW) / 2);
    const maxOy = Math.max(0, (h - canvasH) / 2);
    const x = (canvasW - w) / 2 + ox * maxOx;
    const y = (canvasH - h) / 2 + oy * maxOy;
    return { x, y, w, h };
  }
  // Dibuja la foto con el movimiento de cámara que toca en el tiempo t.
  function draw(ctx, image, move, t, duration, width, height) {
    if (!ctx || !image) {
      throw new Error("Falta el lienzo o la imagen");
    }
    const view = computeView(
      image.width,
      image.height,
      width,
      height,
      move,
      t,
      duration,
    );
    ctx.drawImage(image, view.x, view.y, view.w, view.h);
    return view;
  }
  window.NexoraCameraMove = { CameraMove: { MOVES, computeView, draw }, MOVES };
})();
