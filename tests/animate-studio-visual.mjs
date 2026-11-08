import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputDir = path.join(repoRoot, "artifacts", "nexora-2d-visual-qa");
fs.mkdirSync(outputDir, { recursive: true });

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
    const relative = pathname === "/" ? "/admin/animate-studio.html" : pathname;
    const target = path.resolve(repoRoot, "." + relative);
    if (target !== repoRoot && !target.startsWith(repoRoot + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    fs.stat(target, (statError, stat) => {
      const file = !statError && stat.isDirectory() ? path.join(target, "index.html") : target;
      fs.readFile(file, (readError, data) => {
        if (readError) {
          res.writeHead(404).end("Not found");
          return;
        }
        res.writeHead(200, {
          "content-type": mime[path.extname(file).toLowerCase()] || "application/octet-stream",
          "cache-control": "no-store"
        });
        res.end(data);
      });
    });
  } catch (error) {
    res.writeHead(400).end("Bad request");
  }
});

await new Promise((resolve, reject) => {
  server.once("error", reject);
  server.listen(4173, "127.0.0.1", resolve);
});

let browser;
let page;
const pageErrors = [];
const failedRequests = [];
const results = [];

async function readCanvasMetrics(canvas) {
  return canvas.evaluate((el) => {
    const ctx = el.getContext("2d");
    if (!ctx) throw new Error("El lienzo 2D no pudo obtener su contexto.");
    const image = ctx.getImageData(0, 0, el.width, el.height);
    const pixels = image.data;
    const background = [pixels[0], pixels[1], pixels[2]];
    let painted = 0;
    let minX = el.width, minY = el.height, maxX = -1, maxY = -1;
    const colors = new Set();
    let hash = 2166136261;
    for (let y = 0; y < el.height; y++) {
      for (let x = 0; x < el.width; x++) {
        const i = (y * el.width + x) * 4;
        const high = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        const low = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
        // Count saturated character colors, not the dark gradient and floor grid behind them.
        if (high > 88 && high - low > 28) {
          painted++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
        if ((x + y * 3) % 11 === 0) {
          colors.add(
            ((pixels[i] >> 3) << 10) |
            ((pixels[i + 1] >> 3) << 5) |
            (pixels[i + 2] >> 3)
          );
        }
        hash = Math.imul(hash ^ pixels[i], 16777619);
        hash = Math.imul(hash ^ pixels[i + 1], 16777619);
        hash = Math.imul(hash ^ pixels[i + 2], 16777619);
      }
    }
    return {
      width: el.width,
      height: el.height,
      paintedPixels: painted,
      sampledColors: colors.size,
      hash: (hash >>> 0).toString(16),
      bounds: maxX < 0 ? null : { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 }
    };
  });
}

async function setAction(actor, action, timeRatio) {
  await page.locator("#nvCharacterType").selectOption(actor);
  await page.locator("#nmPreset").selectOption(action);
  const duration = await page.locator("#nmDuration").inputValue();
  const value = Math.max(0.03, Number(duration || 2) * timeRatio);
  await page.locator("#nmTime").evaluate((el, time) => {
    el.value = String(time);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, value);
  await page.waitForTimeout(90);
}

async function capture(name) {
  const canvas = page.locator("#nvCanvas");
  const metrics = await readCanvasMetrics(canvas);
  assert.ok(metrics.bounds, name + ": el lienzo no contiene dibujo visible.");
  assert.ok(metrics.paintedPixels > 500, name + ": el personaje parece estar ausente o casi invisible.");
  assert.ok(metrics.sampledColors > 18, name + ": el dibujo tiene muy poca variación de color.");
  const file = path.join(outputDir, name + ".png");
  await canvas.screenshot({ path: file, animations: "disabled" });
  results.push({ name, file: path.relative(repoRoot, file), metrics });
  return metrics;
}

try {
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("requestfailed", request => { if (!/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(request.url())) failedRequests.push(request.url() + " :: " + request.failure()?.errorText); });
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("https://fonts.gstatic.com/**", route => route.abort());
  await page.addInitScript(() => {
    window.__nexoraWebGLRequests = 0;
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type, ...args) {
      if (typeof type === "string" && /^webgl/i.test(type)) window.__nexoraWebGLRequests++;
      return original.call(this, type, ...args);
    };
  });

  const response = await page.goto("http://127.0.0.1:4173/admin/animate-studio.html", { waitUntil: "domcontentloaded" });
  assert.equal(response?.status(), 200, "El estudio 2D no respondió correctamente.");
  await page.waitForFunction(() => Boolean(window.NEXORA_ANIMATE_ENGINE?.visual), { timeout: 15000 });
  await page.locator("#nvCanvas").waitFor({ state: "visible" });
  await page.waitForTimeout(250);

  const hidden3D = await page.locator("#n3dHiddenTools").evaluate(el => el.hidden && el.getAttribute("aria-hidden") === "true");
  assert.equal(hidden3D, true, "El panel 3D debe permanecer oculto.");
  const webglRequests = await page.evaluate(() => window.__nexoraWebGLRequests);
  assert.equal(webglRequests, 0, "El modo 2D intentó inicializar WebGL.");
  await page.locator("#nvCharacterType").selectOption("worker");
  await page.locator("#nmPreset").selectOption("worker-idle");
  const workerIdle = await capture("worker-idle");

  await setAction("worker", "worker-walk", 0.01);
  const workerWalkStart = await capture("worker-walk-start");
  await setAction("worker", "worker-walk", 0.37);
  const workerWalk = await capture("worker-walk-motion");
  assert.notEqual(workerWalk.hash, workerWalkStart.hash, "La caminata del trabajador no produjo cambios visibles entre fotogramas.");

  assert.ok(workerWalk.bounds.width < 235, "The worker stride spreads the silhouette too far horizontally.");
  await setAction("worker", "worker-run", 0.31);
  const workerRunStart = await capture("worker-run-start");
  await setAction("worker", "worker-run", 0.42);
  const workerRun = await capture("worker-run-motion");
  assert.notEqual(workerRun.hash, workerRunStart.hash, "La carrera del trabajador no produjo movimiento visible.");
  await setAction("worker", "worker-hammer", 0.26);
  const hammerRaise = await capture("worker-hammer-raise");
  await setAction("worker", "worker-hammer", 0.60);
  const hammerStrike = await capture("worker-hammer-strike");
  await setAction("worker", "worker-hammer", 0.76);
  const hammerSettle = await capture("worker-hammer-settle");
  assert.notEqual(hammerSettle.hash, hammerStrike.hash, "The worker should visibly settle after the hammer impact.");
  await setAction("worker", "worker-hammer", 0.90);
  const hammerRecover = await capture("worker-hammer-recover");
  assert.notEqual(hammerRaise.hash, hammerStrike.hash, "The hammer must visibly move from the raised pose into the strike.");
  assert.notEqual(hammerStrike.hash, hammerRecover.hash, "The hammer must visibly return to its resting pose.");
  await setAction("worker", "worker-carry", 0.42);
  const workerCarry = await capture("worker-carry-motion");
  assert.notEqual(workerCarry.hash, workerIdle.hash, "The worker carry action did not change the rendered pose.");
  await setAction("worker", "worker-dig", 0.38);
  const workerDig = await capture("worker-dig-motion");
  assert.notEqual(workerDig.hash, workerIdle.hash, "The worker dig action did not change the rendered pose.");
  await setAction("worker", "worker-lift", 0.45);
  await capture("worker-lift-motion");
  await setAction("worker", "worker-wave", 0.42);
  await capture("worker-wave-motion");

  await setAction("dinosaur", "dino-idle", 0.01);
  const dinoIdle = await capture("dinosaur-idle");
  await setAction("dinosaur", "dino-walk", 0.01);
  const dinoWalkStart = await capture("dinosaur-walk-start");
  await setAction("dinosaur", "dino-walk", 0.37);
  const dinoWalk = await capture("dinosaur-walk-motion");
  assert.notEqual(dinoWalk.hash, dinoWalkStart.hash, "La caminata del dinosaurio no produjo cambios visibles entre fotogramas.");
  await setAction("dinosaur", "dino-run", 0.31);
  const dinoRunStart = await capture("dinosaur-run-start");
  await setAction("dinosaur", "dino-run", 0.42);
  const dinoRun = await capture("dinosaur-run-motion");
  assert.notEqual(dinoRun.hash, dinoRunStart.hash, "La carrera del dinosaurio no produjo movimiento visible.");

  await setAction("dinosaur", "dino-roar", 0.52);
  const dinoRoar = await capture("dinosaur-roar-motion");
  assert.notEqual(dinoRoar.hash, dinoIdle.hash, "The dinosaur roar did not visibly change its pose.");
  await setAction("dinosaur", "dino-tail-swipe", 0.52);
  const dinoTailSwipe = await capture("dinosaur-tail-swipe-motion");
  assert.notEqual(dinoTailSwipe.hash, dinoIdle.hash, "The dinosaur tail swipe did not visibly change the rendered pose.");
  await setAction("dinosaur", "dino-tail-swipe", 0.74);
  const dinoTailFollowThrough = await capture("dinosaur-tail-follow-through");
  assert.notEqual(dinoTailFollowThrough.hash, dinoTailSwipe.hash, "The tail should keep settling after the main swipe.");
  await setAction("dinosaur", "dino-bite", 0.5);
  const dinoBite = await capture("dinosaur-bite-motion");
  assert.notEqual(dinoBite.hash, dinoIdle.hash, "The dinosaur bite did not visibly change the rendered pose.");
  await setAction("dinosaur", "dino-bite", 0.76);
  await capture("dinosaur-bite-recovery");
  await setAction("dinosaur", "dino-crouch", 0.45);
  await capture("dinosaur-crouch-motion");

  // Review the static character-design pass independently from animation.
  const designPage = await page.goto("http://127.0.0.1:4173/admin/animate-engine/designs/preview.html", { waitUntil: "domcontentloaded" });
  assert.equal(designPage?.status(), 200, "La hoja de diseño no respondió correctamente.");
  await page.locator("#worker-card img").waitFor({ state: "visible" });
  await page.locator("#coelo-card img").waitFor({ state: "visible" });
  const designAssets = await page.locator(".card img").evaluateAll(images => images.map(image => ({
    src: image.getAttribute("src"),
    loaded: image.complete && image.naturalWidth > 0,
    width: image.naturalWidth,
    height: image.naturalHeight
  })));
  assert.equal(designAssets.length, 2, "La hoja debe contener ambos personajes.");
  assert.ok(designAssets.every(item => item.loaded), "Uno o más dibujos SVG no pudieron cargarse.");
  const detailAssets = await page.locator(".detail-crop img").evaluateAll(images => images.map(image => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let paintedPixels = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 12) paintedPixels++;
    return {
      src: image.getAttribute("src"),
      loaded: image.complete && image.naturalWidth > 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
      paintedPixels
    };
  }));
  assert.equal(detailAssets.length, 4, "La hoja debe contener cuatro acercamientos de detalle.");
  assert.ok(detailAssets.every(item => item.loaded && item.paintedPixels > 600), "Uno o más acercamientos están vacíos o no pudieron cargar su ilustración interna: " + JSON.stringify(detailAssets));
  const expressionAssets = await page.locator(".expression-card img").evaluateAll(images => images.map(image => {
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let paintedPixels = 0;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 12) paintedPixels++;
    return {
      src: image.getAttribute("src"),
      loaded: image.complete && image.naturalWidth > 0,
      width: image.naturalWidth,
      height: image.naturalHeight,
      paintedPixels
    };
  }));
  assert.equal(expressionAssets.length, 2, "La hoja debe contener dos estudios de expresión.");
  assert.ok(expressionAssets.every(item => item.loaded && item.paintedPixels > 2500), "Uno o más estudios de expresión están incompletos o vacíos: " + JSON.stringify(expressionAssets));
  const designReviewPath = path.join(outputDir, "character-design-review.png");
  await page.screenshot({ path: designReviewPath, fullPage: true, animations: "disabled" });
  results.push({ name: "character-design-review", file: path.relative(repoRoot, designReviewPath), assets: designAssets });
  assert.deepEqual(pageErrors, [], "El navegador encontró errores de JavaScript: " + pageErrors.join(" | "));
  assert.equal(await page.evaluate(() => window.__nexoraWebGLRequests), 0, "WebGL se inicializó durante la prueba 2D.");

  fs.writeFileSync(
    path.join(outputDir, "report.json"),
    JSON.stringify({ status: "passed", hidden3D, webglRequests, pageErrors, failedRequests, results }, null, 2)
  );
  console.log("NEXORA_VISUAL_QA_RESULT=" + JSON.stringify({
    status: "passed",
    hidden3D,
    webglRequests,
    pageErrors,
    failedRequests,
    frames: results.map(item => ({ name: item.name, metrics: item.metrics }))
  }));
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
