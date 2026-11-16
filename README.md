# NEXORA · álbum privado de Melgar

Aplicación web para los integrantes del viaje. Usa Vite en el frontend y Supabase Auth, Postgres y Storage privado para sesiones anónimas, perfiles, recuerdos, misiones, inventario y NR Coins. El navegador contiene solo la publishable key; saldo, compras y recompensas se validan en funciones SQL con permisos.

## Desarrollo local

Requisitos: Node.js 20+ y npm.

```sh
npm install
cp .env.example .env
npm run dev
```

Abre la dirección que muestra Vite (con esta configuración: `http://localhost:3000/viajemelgar/`); no abras `index.html` directamente ni uses un servidor estático, porque la app necesita que Vite lea `.env`.

Completa `.env` con `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. No pongas nunca una secret/service-role key en variables `VITE_`.

## Configurar Supabase

En un proyecto nuevo, sigue este orden desde **SQL Editor**:

1. Ejecuta `supabase/nexora_setup.sql` una sola vez.
2. Crea el bucket `nexora-photos` en **Storage** con **Public** desactivado.
3. Si ya habías ejecutado `20261116_nexora_public_album.sql`, déjalo como está y ejecuta después `supabase/migrations/20261120_nexora_private_social.sql`; esta última vuelve a cerrar el acceso público. Si nunca ejecutaste la migración pública, ejecuta igualmente la migración privada después de `nexora_setup.sql`.
4. Ejecuta `supabase/migrations/20261121_nexora_anonymous_guests.sql`. En **Authentication → Sign In / Providers**, habilita **Allow anonymous sign-ins**. Sin esa opción, Supabase rechazará la creación automática de invitados.

Cada visitante recibe una sesión anónima de Supabase y un UUID; el servidor crea su perfil `Invitado NNN` y su billetera en la misma transacción. El saldo inicial usa el valor predeterminado de `profiles.coin_balance` (0 NR). El token de sesión se conserva en el navegador para que las visitas siguientes recuperen el mismo usuario; el perfil, las fotos, la tienda y el saldo permanecen en Supabase y protegidos por RLS. El alcance es por navegador/dispositivo: el código de recuperación entre dispositivos todavía no está habilitado.

Las cuentas de correo existentes no se convierten ni se borran, pero la interfaz ya no muestra login o registro tradicional. El contenido del bucket permanece privado; las fotos solo se muestran con enlaces temporales a sesiones autenticadas.

## Funciones conectadas

- Creación automática de sesión anónima, persistencia del invitado por navegador, edición de nombre, descripción, aura y avatar.
- Álbum privado con subida desde archivo o cámara, aprobación de publicaciones, favoritos, reacciones, comentarios y paginación.
- Tienda con vendedor ilustrado, seis marcos, saldo e inventario sincronizados.
- Recompensa de 20 NR por cada 10 minutos acreditada por Supabase, no por el reloj del navegador.
- Misiones, XP y ranking desde la base de datos.
- Sincronización periódica para reflejar cambios de otros miembros.

## GitHub Pages

El proyecto debe publicarse desde la raíz con el workflow `.github/workflows/deploy.yml`, no desde la carpeta antigua `viaje/`. En el repositorio, añade las variables de Actions **VITE_SUPABASE_URL** y **VITE_SUPABASE_PUBLISHABLE_KEY** en **Settings → Secrets and variables → Actions → Variables**. Deben contener la URL del proyecto y su publishable (o anon pública) key. En **Settings → Pages → Build and deployment**, el origen debe ser **GitHub Actions**. Después de subir los cambios a `main`, comprueba que termine correctamente **Deploy NEXORA to GitHub Pages** y abre `https://nicocalderonsilva2010-arch.github.io/viajemelgar/`.

Localmente, usa `.env`; Git lo excluye. Para compilar y previsualizar:

```sh
npm run build
npm run preview
```

Con `base` configurado para GitHub Pages, la vista previa local queda en `http://localhost:4173/viajemelgar/`. No se considera publicado hasta que el workflow de GitHub Pages finalice correctamente.
