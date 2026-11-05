# Activar el panel privado de NEXORA

El código del CMS ya está en el repositorio, pero **no se debe considerar activo** hasta completar estos pasos en Cloudflare. El panel utiliza Cloudflare Access para autenticar al administrador y D1 para guardar artículos.

## 1. Crear la base de datos D1

1. Abre Cloudflare Dashboard → **Workers & Pages → D1 SQL Database**.
2. Crea una base de datos llamada `nexora-content`.
3. Abre la consola SQL de esa base y ejecuta todo el contenido de `schema.sql`.
4. Entra a Workers & Pages → Pages → `nexora-ey8` → Settings → Functions → D1 database bindings.
5. Añade el binding con variable **DB** y selecciona `nexora-content`.
6. Guarda y vuelve a desplegar el proyecto para que la Function reciba el binding.

## 2. Configurar Cloudflare Access

Crea dos aplicaciones **Self-hosted** en Zero Trust → Access → Applications. Usa el hostname `nexora-ey8.pages.dev`.

### Aplicación A: interfaz privada
- Path: `/admin*`
- Política: Allow
- Include: Emails
- Valor: únicamente tu correo de administrador.

### Aplicación B: API administrativa
- Path: `/api/admin/*`
- Política: Allow
- Include: el mismo correo de administrador.

No uses una regla pública tipo Everyone. La API también verifica la firma del JWT de Cloudflare Access, el emisor, la audiencia y el correo autorizado.

## 3. Añadir variables de entorno a Pages

En Pages → Settings → Environment variables, configura para **Production**:

- `ACCESS_TEAM_DOMAIN`: tu dominio de equipo de Access, con formato `https://TU-EQUIPO.cloudflareaccess.com`.
- `ACCESS_AUD`: el Audience (AUD) Tag de la aplicación B, la de la API.
- `ADMIN_EMAIL`: el mismo correo autorizado en las dos políticas.

No publiques estos valores en archivos HTML/JS ni en el repositorio. Son configuración del servidor. No compartas aquí tokens ni contraseñas.

## 4. Probar

1. Vuelve a desplegar Pages.
2. Abre `https://nexora-ey8.pages.dev/admin/`.
3. Cloudflare Access debe pedir autenticación y permitir solo el correo autorizado.
4. Crea un artículo de prueba en estado Borrador.
5. Comprueba que aparece en la lista y que no aparece en la portada pública.
6. Cambia el estado a Publicado y confirma que aparece en la portada y se puede leer desde su enlace.
7. Elimina el artículo de prueba.

## Qué hace el CMS

- Crear artículos, editar y eliminar.
- Estados Borrador y Publicado.
- Categorías NEXORA AI, NEXORA GAMING y NEXORA TECH.
- Contenido guardado como texto y renderizado con escape de HTML para evitar inyección de scripts.
- La portada consulta los artículos publicados en `/api/articles`.
- La API administrativa requiere JWT válido de Cloudflare Access y correo exacto autorizado.

## Límites actuales

- Este repositorio no puede crear por sí solo la base D1, el binding, las aplicaciones Access ni las variables de entorno de tu cuenta.
- No hay recuperación de contraseña propia: el acceso se administra desde Cloudflare Access.
- El sitemap estático actual contiene las páginas editoriales iniciales; al publicar nuevos artículos desde el CMS, añade sus URLs al sitemap cuando sea posible.
- El formulario de contacto y newsletter todavía no guardan envíos.
- Mantén la base de datos y las Functions en Production. No actives el panel sin las dos aplicaciones Access configuradas.
