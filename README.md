# NEXORA ESTUDIO & SAUSALITOZ Z9

Álbum digital para documentar el viaje a Melgar, Colombia.

## Requisitos

- Node.js 18+
- npm

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

La app estará disponible en `http://localhost:3000`.

En escritorio, la navegación usa una barra lateral de cristal con cuatro vistas independientes: Álbum, Galería, Tienda y Sobre nosotros. En celular, esas vistas pasan a un panel inferior compacto y el botón `+` central abre el selector para subir fotos o videos.

## Producción

```bash
npm run build
npm run preview
```

## Variables de entorno

Copia `.env.example` a `.env` y completa los valores del proyecto.

```bash
cp .env.example .env
```

Variables reservadas para futuras integraciones (el modo actual no requiere configurarlas):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (o `VITE_SUPABASE_ANON_KEY` si el proyecto usa la clave legacy)
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_NAME`

## Datos y cuentas

Supabase todavía no está integrado. El álbum, las misiones y NEXORA COINS funcionan en modo local con `localStorage`; sus datos existen solo en este navegador, no son cuentas autenticadas y no se sincronizan con otros dispositivos. Los perfiles Persona 1–10 y `manchi` son datos iniciales de muestra. El propietario no recibe privilegios administrativos mientras no exista autenticación segura. No guardes datos sensibles en este modo.

`.env.example` deja en blanco las variables futuras de Supabase; no contiene credenciales. `supabase/nexora_setup.sql` reúne el esquema inicial del market y las tablas RLS del álbum. Ejecútalo una sola vez y solo en un proyecto nuevo, después de revisar que no haya tablas de aplicación existentes. La app todavía requiere conectar su cliente para empezar a leer o escribir estos datos.

### Qué falta para conectar Supabase

1. Crea un proyecto en Supabase y copia su **Project URL** y su **publishable key** (o la clave pública `anon` en proyectos antiguos).
2. Para desarrollo local, copia `.env.example` a `.env` y pega esos dos valores en `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. Para GitHub Pages, añade esos mismos valores como Actions Variables en `Settings → Secrets and variables → Actions`, y configura el workflow para exponerlos al build.
4. En **SQL Editor → New query**, pega el contenido completo de `supabase/nexora_setup.sql` y ejecuta una sola vez en el proyecto nuevo. Después crea en **Storage** un bucket privado llamado `nexora-photos`; no marques Public. El SQL prepara políticas para ese bucket.
5. No uses la `service_role` key ni una secret key en el navegador, en `.env` de Vite ni en GitHub Pages.

Tener las variables no conecta por sí solo la app: aún hay que implementar autenticación, tablas y sincronización en el cliente. No compartas claves privadas; la publishable/anon key está diseñada para uso público y debe quedar protegida por políticas RLS.

La pantalla de bienvenida muestra la identidad de NEXORA y una barra de progreso durante 10 segundos antes de entrar al álbum.

El mercader se dibuja como SVG dentro de la página, no necesita descargas de imágenes ni archivos adicionales. El logo y la fotografía de perfil se sirven desde `public/images/`.

## GitHub Pages

Vite usa `base: '/viajemelgar/'` para este repositorio. El workflow `.github/workflows/deploy.yml` construye `dist` y lo publica cuando hay un push a `main`. En GitHub, configura **Settings → Pages → Build and deployment → Source: GitHub Actions**. La web no está confirmada como publicada hasta que la ejecución del workflow termine correctamente.

La app actual es JavaScript y Vite, no React. Su navegación interna usa anchors `#...`, por lo que no requiere un fallback de rutas SPA.

## Estructura

```text
/
├─ index.html
├─ src/
│  ├─ main.js
│  └─ styles.css
├─ public/
│  └─ images/
│     ├─ logo-nexora/       # Logo oficial de Nexora
│     ├─ nosotros/
│     │  └─ foto/           # Foto para la sección Nosotros
│     └─ team/
│        └─ elmanxy.png
├─ .env.example
├─ .env
├─ package.json
├─ vite.config.js
└─ README.md
```
