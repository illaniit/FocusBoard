# FocusBoard

Dashboard personal de productividad visual construido con Next.js, Tailwind CSS, shadcn/ui, Framer Motion y Supabase.

## Desarrollo local

```bash
npm install
npm run dev -- -p 3005
```

Abre [http://localhost:3005](http://localhost:3005).

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

Usa solo la publishable key de Supabase. No pongas `service_role`, `sb_secret` ni claves privadas en variables `NEXT_PUBLIC_*`.

## Supabase

La guía completa está en [SUPABASE_DEPLOYMENT.md](./SUPABASE_DEPLOYMENT.md).

Resumen:

1. Crea un proyecto en Supabase.
2. Ejecuta `supabase/schema.sql` en el SQL Editor.
3. Configura Auth con las URLs de localhost y Vercel.
4. Añade las variables de entorno en local y en Vercel.
5. Despliega en Vercel.

## Comprobaciones

```bash
npm run lint
npx tsc --noEmit
npm run build
```

En este workspace `npm run build` puede necesitar permisos del entorno local, pero debe ejecutarse en Vercel durante el despliegue.
