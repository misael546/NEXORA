# Motor público de NEXORA ANIMATE

Copia pública (sin login) de `admin/animate-engine/`. Contiene el mismo motor
2D/3D, pero **no** incluye el puente del estudio de administración
(`studio-bridge.js`), ni acceso a D1 ni a Cloudflare Access.

La página pública que lo usa es `/animar.html`: todo el render y la
exportación ocurren en el navegador del visitante; nada se sube al servidor.

Si se cambia el motor en `admin/animate-engine/`, hay que copiar los archivos
aquí para mantener ambas versiones iguales.
