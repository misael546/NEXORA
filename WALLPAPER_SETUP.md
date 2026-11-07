# NEXORA Wallpaper

Galería pública: `/wallpaper.html`. Usa la base D1 existente `nexora-content` mediante la conexión `DB`.

## Configuración

1. En Cloudflare D1 → `nexora-content`, ejecuta `wallpaper-schema.sql` una sola vez.
2. En Cloudflare Pages → `nexora` → Settings → Functions → Environment variables, configura `WALLPAPER_INGEST_TOKEN` como Production secret.
3. En GitHub → `misael546/NEXORA` → Settings → Secrets and variables → Actions, configura:
   - `WALLPAPER_INGEST_URL` = `https://nexora-ey8.pages.dev/api/admin/wallpapers`
   - `WALLPAPER_INGEST_TOKEN` = el mismo token configurado en Cloudflare.
4. Si la aplicación de Cloudflare Access protege la ruta de la API, crea un Service Token y una política **Service Auth** para ese token en la aplicación correspondiente.
5. En GitHub Actions agrega:
   - `WALLPAPER_ACCESS_CLIENT_ID` = Client ID del Service Token.
   - `WALLPAPER_ACCESS_CLIENT_SECRET` = Client Secret del mismo token.
6. Ejecuta manualmente **NEXORA Wallpaper weekly collection** desde GitHub Actions para iniciar una tanda.

No publiques ni subas los valores de los secretos al repositorio o al chat.

## Importador y catálogo

- El importador combina Wikimedia Commons y Openverse. Busca en múltiples temas visuales, pagina los resultados y conserva el cursor para continuar en la siguiente ejecución.
- Acepta fondos horizontales y verticales para PC y Android, a partir de 700 px en el lado corto y 1000 px en el lado largo.
- Guarda autor, proveedor, fuente original y licencia reportada por cada catálogo. Openverse se consulta mediante su API oficial y se limita a CC0, Public Domain Mark, CC BY y CC BY-SA.
- Evita repetir identificadores de ambas fuentes y almacena el avance de búsqueda en `.github/data/wallpaper-import-state.json`.
- Las consultas respetan pausas y reintentos cuando Wikimedia aplica límites de velocidad.
- La tarea programada se ejecuta cada lunes a las 15:00 UTC.

## Objetivo de 100.000 wallpapers

El objetivo del catálogo es llegar a 100.000 fondos reales. La base de datos y el API utilizan paginación; las ejecuciones semanales incorporan tandas incrementales. No se crean registros ficticios ni se cuenta una imagen como cargada hasta que D1 confirma su inserción. Las imágenes permanecen vinculadas a su fuente y licencia original. Openverse advierte que la información de licencias procede de sus proveedores y debe revisarse antes de cualquier reutilización.
