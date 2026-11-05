# NEXORA

Portal editorial en español sobre inteligencia artificial, videojuegos y tecnología.

## Publicación

- Sitio público: https://nexora-ey8.pages.dev/
- Repositorio: https://github.com/misael546/NEXORA (privado)
- Alojamiento previsto: Cloudflare Pages conectado a la rama `main`.
- Tipo de proyecto: sitio estático; no necesita comando de compilación.
- Directorio de salida: `/`.

Cada commit en `main` debería iniciar una nueva implementación en Cloudflare Pages si la integración continúa conectada.

## Estructura actual

- `index.html`: portada, categorías, buscador y enlaces editoriales.
- `styles.css`: diseño responsive y estilos de artículos.
- `script.js`: menú móvil, año automático y búsqueda local.
- `articulo-ia.html`: guía de herramientas de inteligencia artificial.
- `articulo-android-gaming.html`: guía para instalar juegos en Android.
- `articulo-pc.html`: mantenimiento básico de Windows.
- `acerca.html`, `contacto.html`: información del proyecto.
- `privacidad.html`, `cookies.html`: políticas informativas.
- `robots.txt`, `sitemap.xml`: rastreo e indexación.\n- `feed.xml`: novedades mediante RSS.\n- `404.html`: página de error personalizada.
- `favicon.svg`: icono del sitio.

## Desarrollo y publicación

Abre `index.html` en un navegador o utiliza un servidor estático local. En Cloudflare Pages, configura la rama `main`, deja vacío el comando de compilación y usa `/` como directorio de salida.

## Panel editorial\n\nEl CMS se encuentra en preparación técnica. Sigue los pasos de [ADMIN_SETUP.md](ADMIN_SETUP.md) para crear la base D1, proteger las rutas con Cloudflare Access y configurar las variables de entorno. No habilites el panel antes de completar esa configuración.\n\n## Estado y límites

Esta es una primera versión editorial estática. El buscador filtra los artículos disponibles en el navegador. Las páginas legales describen las funciones que existen actualmente.

Todavía no hay panel de administración privado, CMS, autenticación, base de datos, formulario de contacto funcional, newsletter, analítica integrada ni integración de AdSense. No se deben introducir claves, contraseñas ni credenciales en archivos públicos del frontend.

Los espacios publicitarios no deben activarse hasta que exista una cuenta aprobada y se hayan revisado las políticas, el consentimiento aplicable y la configuración de privacidad. La aprobación y los ingresos de AdSense no están garantizados.

## Publicar un artículo nuevo

1. Crear una página HTML individual a partir de la estructura de los artículos existentes.
2. Añadir título, descripción, canonical, metadatos sociales y datos estructurados adecuados.
3. Añadir una tarjeta enlazada al artículo en `index.html`.
4. Añadir la URL a `sitemap.xml`.
5. Revisar los enlaces y publicar el commit en `main`.
