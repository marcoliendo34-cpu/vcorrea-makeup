# Correos de cuenta (Supabase Auth + Resend)

Plantillas en español con la marca, para pegar en Supabase → Authentication → Emails → Templates:

| Plantilla de Supabase | Asunto | Archivo |
|---|---|---|
| Confirm signup | Confirma tu cuenta · Verónica Correa Makeup | `confirmar-cuenta.html` |
| Reset password | Crea tu nueva contraseña · Verónica Correa Makeup | `restablecer-contrasena.html` |

Pasos (necesitan un dominio verificado en Resend):

1. Resend → Domains → Add domain (ej. `correo.dominio.com`), cargar los DNS y esperar "Verified".
2. Resend → API Keys → Create (Sending access, solo ese dominio).
3. Supabase → Authentication → Emails → SMTP Settings → Enable custom SMTP:
   host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña = la llave de Resend,
   remitente `no-responder@correo.dominio.com`, nombre `Verónica Correa Makeup`.
4. Supabase → Authentication → Rate Limits: subir los correos por hora (empieza en 30).
5. Supabase → Authentication → URL Configuration: Site URL de la web y Redirect URLs `https://…/**`.
6. Pegar las dos plantillas.
7. Supabase → Authentication → Sign In / Providers → Email → activar "Confirm email".
8. En `js/config.js`: `correos: { activos: true }` (si no, "¿Olvidaste tu contraseña?" sigue mandando a WhatsApp).
