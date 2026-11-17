# NEXORA · Melgar 2026

Aplicación privada para compartir fotos durante un viaje entre amigos.

## Fase actual

La interfaz ofrece Inicio, Fotos, Subir, Tienda, Coleccionables, Juegos, Perfil y Sobre mí, con diseño adaptable a teléfonos desde 320 px de ancho. Las entradas de secciones y tarjetas tienen animaciones escalonadas que respetan la preferencia de movimiento reducido. La tienda y las compras de marcos usan Supabase; cada integrante recibe 10 NexaCoins por cada intervalo de 10 minutos. Los seis marcos VFX usan los diseños aportados, con efectos animados. Coleccionables muestra las figuritas de la cuenta. Juegos permite escribir un título personalizado y sincroniza el título, los participantes y el resultado de la ruleta entre los celulares del grupo. Perfil permite cambiar el nombre visible y subir o reemplazar la foto usando el almacenamiento privado de Supabase; el nombre no concede permisos. Las fotografías se publican en el álbum privado y el servidor verifica que el marco seleccionado pertenezca a la cuenta. Fotos muestra un ranking privado por cantidad de imágenes aprobadas; Sobre mí presenta al creador e informa sobre aportes voluntarios en efectivo (sin procesarlos ni registrarlos).

La versión anterior se conserva en `legacy.html`. Las carpetas de fotos y los archivos SQL existentes no se borraron.

## Desarrollo local

Requisitos: Node.js 20+ (incluye npm).

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
npm install
npm run dev
```

Abre `http://localhost:3000/viaje/`; no abras `index.html` directamente. Completa `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Nunca uses una clave `service_role` en el navegador.

## Supabase

No borres tablas ni datos para limpiar el SQL Editor: borrar una consulta guardada solo limpia el editor, pero no cambia la base de datos. En un proyecto Supabase nuevo, ejecuta una vez `supabase/nexora_setup.sql` y crea en Storage el bucket privado `nexora-photos`. Después aplica, en este orden, `20261116_nexora_public_album.sql`, `20261120_nexora_private_social.sql`, `20261121_nexora_anonymous_guests.sql`, `20261122_nexora_nexacoins.sql`, `20261123_nexora_collectibles.sql`, `20261124_nexora_delete_own_photos.sql`, `20261125_nexora_shared_roulette.sql`, `20261126_nexora_repair_participant_profiles.sql` y `20261127_nexora_online_presence.sql`. La migración privada de 20261120 debe ejecutarse inmediatamente después de la de álbum público de 20261116 para dejar el acceso del álbum privado. El archivo inicial ya incluye el esquema de mercado, así que no ejecutes además `20261115_nexora_market.sql` ni su copia `20261115_nexora_market copy.sql`. En un proyecto existente, no vuelvas a ejecutar `nexora_setup.sql`: aplica únicamente migraciones que falten. La migración de 20261126 repara fichas de participante ausentes y permite que cada cuenta autenticada recupere solo su propia ficha. La migración de 20261127 añade el contador de personas activas y solo devuelve una cantidad; no revela las identidades. El ranking cuenta fotos aprobadas y solo muestra nombres y cantidades, nunca las imágenes privadas. La migración de 20261125 sincroniza el título personalizado, participantes y resultado de la ruleta entre celulares; después de aplicar una migración, recarga la página.

Las 16 ilustraciones iniciales están en `public/images/collectibles/` como `figurita-01.jpg` a `figurita-16.jpg`. La tienda las carga automáticamente en sus respectivas tarjetas.

## GitHub Pages

El despliegue usa `.github/workflows/deploy.yml`. En **Settings → Pages**, selecciona **GitHub Actions** como origen. Agrega `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` en **Settings → Secrets and variables → Actions**, ya sea como variables o como secretos (el flujo acepta ambos).

Para subir el proyecto, usa Git desde la carpeta del proyecto; no arrastres `node_modules` ni `dist` a la página web de GitHub. Esas carpetas se generan localmente y están excluidas por `.gitignore`. En una terminal:

```sh
git add .
git commit -m "Preparar sitio para GitHub Pages"
git push origin main
```

El botón **Actions** permite revisar el resultado del flujo **Deploy NEXORA to GitHub Pages**. Si también aparece **pages build and deployment**, cambia el origen de Pages a **GitHub Actions** para que no se intente publicar desde la rama a la vez.
