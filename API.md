# API Marcela Labbé

Base local: `http://localhost:4000/api`

## Público

### GET `/health`
Verifica que la API esté activa.

### GET `/services`
Lista servicios activos.

### GET `/availability?date=YYYY-MM-DD&serviceId=ID`
Devuelve horas disponibles para un servicio en una fecha.

### POST `/bookings`
Crea una reserva pendiente.

```json
{
  "serviceId": "esmaltado-permanente",
  "clientName": "Nombre Clienta",
  "phone": "+56 9 1234 5678",
  "email": "correo@ejemplo.cl",
  "date": "2026-06-04",
  "startTime": "10:00",
  "notes": "Color rojo oscuro",
  "whatsappConsent": true
}
```

## Admin

Todas las rutas admin usan `Authorization: Bearer TOKEN`.

### POST `/auth/login`

```json
{
  "email": "admin@marcela-labbe.cl",
  "password": "Cambiar123"
}
```

### GET `/admin/bookings`
Lista reservas.

### PATCH `/admin/bookings/:id/status`
Cambia estado.

```json
{ "status": "confirmed" }
```

Estados válidos: `pending`, `confirmed`, `cancelled`.

### DELETE `/admin/bookings/:id`
Elimina una reserva.

### POST `/admin/services`
Crea un servicio.

### PATCH `/admin/services/:id`
Actualiza un servicio.


### GET `/whatsapp/status`
Ruta admin. Devuelve si WhatsApp está habilitado y si el cliente está listo.

```json
{
  "enabled": true,
  "ready": true
}
```
