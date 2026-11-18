import type { Env } from "../../_lib/auth";

const ALLOWED_SPEAKERS = ["sirio", "nestor", "alvaro", "javier", "aquila"];

async function hashIp(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "POST") {
    return new Response("Método no permitido", { status: 405, headers: { Allow: "POST" } });
  }
  if (!env.AI) {
    return Response.json({ error: "Workers AI no está conectado al proyecto NEXORA." }, { status: 503 });
  }

  let input: { text?: unknown; speaker?: unknown };
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Solicitud JSON inválida." }, { status: 400 });
  }

  const text = typeof input.text === "string" ? input.text.trim() : "";
  const speaker = typeof input.speaker === "string" && ALLOWED_SPEAKERS.includes(input.speaker)
    ? input.speaker
    : "sirio";

  if (!text) return Response.json({ error: "Escribe el diálogo que quieres convertir en voz." }, { status: 400 });
  if (text.length > 1000) return Response.json({ error: "El límite público es de 1,000 caracteres por generación." }, { status: 413 });

  // Límite por IP con hash para reducir abuso de la cuota pública de Workers AI.
  const ip = request.headers.get("CF-Connecting-IP");
  if (!ip) return Response.json({ error: "No se pudo verificar el origen de la solicitud." }, { status: 400 });
  try {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS animate_voice_limits (ip_hash TEXT PRIMARY KEY, window_start INTEGER NOT NULL, request_count INTEGER NOT NULL)").run();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare("DELETE FROM animate_voice_limits WHERE window_start < ?").bind(now - 86400).run();
    const key = await hashIp(ip);
    await env.DB.prepare(
      "INSERT INTO animate_voice_limits (ip_hash, window_start, request_count) VALUES (?, ?, 1) ON CONFLICT(ip_hash) DO UPDATE SET window_start = CASE WHEN ? - window_start >= 3600 THEN ? ELSE window_start END, request_count = CASE WHEN ? - window_start >= 3600 THEN 1 ELSE request_count + 1 END"
    ).bind(key, now, now, now, now).run();
    const rate = await env.DB.prepare("SELECT request_count FROM animate_voice_limits WHERE ip_hash = ?").bind(key).first<{ request_count: number }>();
    if (!rate || rate.request_count > 6) {
      return Response.json({ error: "Límite alcanzado: puedes generar hasta 6 voces por hora desde esta conexión. Inténtalo más tarde." }, { status: 429 });
    }
  } catch (error) {
    console.error("NEXORA public voice rate limit failed:", error);
    return Response.json({ error: "No se pudo validar el límite de uso. Inténtalo más tarde." }, { status: 503 });
  }

  try {
    const audio = await env.AI.run("@cf/deepgram/aura-2-es", { text, speaker, encoding: "mp3" });
    if (!audio) return Response.json({ error: "Workers AI no devolvió audio." }, { status: 502 });
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": 'inline; filename="nexora-dialogo.mp3"',
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    console.error("NEXORA public voice generation failed:", error);
    return Response.json({ error: "No se pudo generar el MP3. Comprueba la cuota de Workers AI e inténtalo más tarde." }, { status: 502 });
  }
};
