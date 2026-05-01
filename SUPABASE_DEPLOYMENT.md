# Guia de Supabase y despliegue para FocusBoard

Esta guia deja FocusBoard funcional con usuarios reales, datos privados por usuario y despliegue en Vercel.

## 1. Crear el proyecto en Supabase

1. Entra en [Supabase](https://supabase.com/dashboard).
2. Crea un proyecto nuevo.
3. Guarda estos datos:
   - `Project URL`: `https://xxxx.supabase.co`
   - `Publishable key`: empieza por `sb_publishable_...`

No uses `service_role`, `sb_secret` ni claves secretas en el frontend. La app solo necesita la publishable key.

## 2. Crear la tabla privada

En Supabase, ve a `SQL Editor`, crea una query nueva y pega el contenido de:

```text
supabase/schema.sql
```

Ejecuta la query completa. Esto crea:

- `public.focusboard_snapshots`
- RLS activado y forzado
- permisos solo para usuarios autenticados
- politicas para que cada usuario lea, inserte, actualice y borre solo su propio tablero
- limite de tamano para el JSON del tablero
- trigger para actualizar `updated_at`

Verificacion rapida en Supabase:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname = 'focusboard_snapshots';
```

Debe salir `rls_enabled = true` y `rls_forced = true`.

## 3. Configurar Auth

En Supabase ve a `Authentication > URL Configuration`.

Configura:

```text
Site URL:
https://TU-DOMINIO.vercel.app
```

Anade en `Redirect URLs`:

```text
http://localhost:3000/**
http://localhost:3005/**
https://TU-DOMINIO.vercel.app/**
https://TU-DOMINIO-PERSONALIZADO.com/**
```

Si todavia no tienes dominio personalizado, deja solo el dominio de Vercel y anade el custom domain despues.

## 4. Configurar registro por email

En `Authentication > Providers > Email`:

- Activa `Email`.
- Para pruebas puedes permitir registro con email y password.
- Para produccion, configura SMTP propio si quieres emails fiables de confirmacion y recuperacion.

Decision recomendada:

- App personal o demo: puedes desactivar confirmacion de email para probar rapido.
- App publica: activa confirmacion de email y configura SMTP.

## 5. Variables de entorno locales

Crea `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Arranca:

```bash
npm run dev -- -p 3005
```

Prueba:

1. Crear cuenta.
2. Crear/editar una tarea.
3. Refrescar navegador.
4. Cerrar sesion e iniciar sesion otra vez.
5. Ver que los datos vuelven.

## 6. Variables de entorno en Vercel

En Vercel:

1. Abre el proyecto.
2. Ve a `Settings > Environment Variables`.
3. Anade:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Marca los entornos `Production`, `Preview` y `Development` si quieres que todos funcionen.

## 7. Desplegar

En Vercel, importa el repositorio y usa:

```text
Framework Preset: Next.js
Build Command: npm run build
Install Command: npm install
Output Directory: .next
```

Despues del primer deploy, copia la URL final de Vercel y vuelve a Supabase para anadirla a `Site URL` y `Redirect URLs`.

## 8. Checklist de seguridad

Antes de publicar:

- No hay `service_role` ni `sb_secret` en el codigo.
- `.env.local` no esta commiteado.
- `focusboard_snapshots` tiene RLS activado.
- Las politicas usan `auth.uid()` y `with check`.
- La tabla no concede permisos a `anon`.
- Los redirects de Supabase incluyen solo tus dominios reales.
- Los enlaces externos se abren con `rel="noreferrer"`.
- La importacion JSON esta controlada si el archivo es invalido.

## 9. Comandos de verificacion

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Tambien es recomendable ejecutar en Supabase:

- `Database > Advisors > Security`
- `Database > Advisors > Performance`

Revisa cualquier aviso antes de publicar.

## 10. Limitaciones actuales

FocusBoard ya es funcional con Supabase, pero todavia guarda el tablero como un snapshot JSON por usuario. Es simple y seguro para esta version, pero si la app crece mucho seria mejor normalizar datos en tablas separadas:

- `tasks`
- `subjects`
- `projects`
- `habits`
- `calendar_events`

Eso permitiria auditoria, busquedas SQL, sincronizacion parcial y mejor rendimiento con muchos datos.
