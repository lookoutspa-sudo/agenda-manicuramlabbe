# Render + WhatsApp para Agenda Manicura

Este proyecto usa `whatsapp-web.js`, por lo que necesita guardar una sesión de WhatsApp en disco. En Render, eso requiere un servicio con disco persistente. No uses el plan Free para producción con recordatorios, porque el servicio puede dormir y el almacenamiento no es persistente.

## Variables recomendadas en Render

```env
PORT=10000
NODE_ENV=production
DATA_DIR=/app/storage
APP_TIMEZONE=America/Santiago
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=/app/storage/whatsapp-session
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
JWT_SECRET=crea_un_valor_largo_y_secreto
ADMIN_EMAIL=admin@marcela-labbe.cl
ADMIN_PASSWORD=cambia_la_clave
CORS_ORIGIN=https://TU-WEB.onrender.com
```

## Flujo de uso

1. Despliega el backend en Render.
2. Revisa los logs del servicio.
3. Si WhatsApp no tiene sesión guardada, aparecerá un QR en logs.
4. Escanea el QR con el WhatsApp que usará la agenda.
5. Cuando el log diga `Cliente de WhatsApp conectado y listo`, las notificaciones quedan activas.

## Recordatorios implementados

- Mensaje inmediato al crear reserva, si el cliente aceptó WhatsApp.
- Recordatorio 24 horas antes, solo si la reserva está `confirmed`.
- Recordatorio 5 horas antes, solo si la reserva está `confirmed`.
- Cada mensaje queda marcado en la reserva para evitar duplicados.

## Importante

La base JSON y la sesión de WhatsApp se guardan en `/app/storage`. Ese path debe estar montado como disco persistente en Render.
