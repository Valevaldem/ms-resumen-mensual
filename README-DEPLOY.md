# MS · Resumen Mensual automático 📊

Manda solo, el **día 1 de cada mes a las 00:01** (hora de Monterrey), un correo a
`leslievaldez96@gmail.com` desde `valeria@mariasalinas.mx` con:

- El **resumen escrito** del mes que cerró (en el cuerpo del correo)
- El **Excel detallado** adjunto (Resumen General + Cuentas Pendientes + una pestaña por asesora)

Todo se alimenta solo de la API de Hike. Tú no haces nada cada mes.

---

## Lo que vas a necesitar (cuentas)

- **Vercel** (donde ya deploys tus apps)
- **Neon** (la misma base que ya usas para Charlotte sirve, o una nueva)
- **Resend** (para enviar el correo — cuenta gratis, 1 reporte al mes está muy dentro del free tier)
- Tu **App Secret** y **refresh_token** de Hike (del `hike-tokens.json` que generaste)

---

## Pasos (de una sola vez)

### 1. Subir el proyecto
Mete esta carpeta a un repo nuevo y conéctalo a un proyecto nuevo en Vercel
(tu `git add . && git commit && git push` de siempre). **No deploys todavía** —
primero pon las variables (paso 4).

### 2. Crear la tabla de tokens en Neon
En la consola SQL de Neon, corre el contenido de **`db.sql`** (crea una tabla
`hike_tokens`). Es una sola vez.

### 3. Configurar Resend
1. Crea cuenta en resend.com.
2. **Verifica tu dominio** `mariasalinas.mx`: Resend te da unos registros DNS
   (TXT/MX) que agregas donde administras tu dominio. Esto es lo que permite
   enviar *desde* `valeria@mariasalinas.mx`. (Tarda unos minutos en validar.)
3. Crea un **API key** y guárdalo.

### 4. Variables de entorno en Vercel
En tu proyecto → Settings → Environment Variables, agrega (ver `.env.example`):

| Variable | Qué poner |
|---|---|
| `HIKE_CLIENT_ID` | `MS_Resumen_Mensual-dfa9db59bf` |
| `HIKE_CLIENT_SECRET` | tu App Secret |
| `HIKE_INITIAL_REFRESH_TOKEN` | el `refresh_token` de tu `hike-tokens.json` |
| `DATABASE_URL` | tu connection string de Neon |
| `RESEND_API_KEY` | el API key de Resend |
| `MAIL_FROM` | `Reportes Maria Salinas <valeria@mariasalinas.mx>` |
| `MAIL_TO` | `leslievaldez96@gmail.com` |
| `CRON_SECRET` | un texto largo y aleatorio que tú inventes |

> El `refresh_token` solo se usa la **primera vez**: el sistema lo guarda en Neon y
> de ahí en adelante se renueva solo. Nunca tienes que volver a tocarlo.

### 5. Deploy
Ahora sí, deploya (push). Vercel instala todo y deja el cron programado.

### 6. Probar SIN esperar al día 1
Abre en el navegador (cambia `TU_CRON_SECRET`):

- **Solo ver números (no manda correo):**
  `https://tu-proyecto.vercel.app/api/cron/resumen-mensual?secret=TU_CRON_SECRET&month=2026-05&dryrun=1`
  → te regresa totales, órdenes y pendientes de mayo. Si ves números, ¡la conexión jala!

- **Mandar el correo de prueba de un mes:**
  `https://tu-proyecto.vercel.app/api/cron/resumen-mensual?secret=TU_CRON_SECRET&month=2026-05`
  → te debe llegar el correo con su Excel a `leslievaldez96@gmail.com`.

Cuando el correo te llegue bien, ya está. **El día 1 de cada mes corre solo.**

---

## Notas

- **Horario:** programado a las 00:01 de Monterrey (06:01 UTC). En el plan gratis de
  Vercel el disparo puede variar hasta ~1 hora; para un reporte mensual no importa.
- **Si algo falla:** la ruta regresa un mensaje de error claro (por ejemplo, si el
  refresh del token o Resend fallan). Puedes correr el `?dryrun=1` cuando quieras
  para checar sin mandar correo.
- **Refresh del token (Step 4 de Hike):** está armado con el estándar OAuth
  (`grant_type=refresh_token`). El `?dryrun=1` lo confirma en la primera prueba; si
  Hike pidiera algo distinto, es un ajuste de una línea en `lib/hike.js`.
- **Cambiar destinatario / día:** `MAIL_TO` y el horario (`vercel.json`) se editan
  cuando quieras.
