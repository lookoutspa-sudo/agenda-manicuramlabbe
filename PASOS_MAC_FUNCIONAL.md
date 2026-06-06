# Agenda manicura: pasos rápidos en Mac

Esta versión está preparada para trabajar fácil en Mac + Visual Studio Code.

## 1. Abrir carpeta

Descomprime el ZIP, abre la carpeta en Visual Studio Code y abre una terminal.

```bash
cd ~/Downloads/agenda_manicura_mac_funcional
```

Si la carpeta tiene espacios en el nombre, renómbrala:

```bash
cd ~/Downloads
mv "agenda_manicura_mac_funcional 2" agenda_manicura_mac_funcional
cd agenda_manicura_mac_funcional
```

## 2. Preparar todo

```bash
npm run setup:mac
```

Este comando hace lo siguiente:

- Evita que Puppeteer descargue Chromium.
- Crea `.env` si no existe.
- Crea `client/.env.local` apuntando al backend local.
- Instala dependencias del backend.
- Instala dependencias del frontend.
- Inicializa la base JSON.

## 3. Ejecutar app completa local

```bash
npm run dev
```

Esto levanta:

- API: http://localhost:4000/api/health
- Web: http://localhost:5173

## 4. Probar reserva sin WhatsApp

Primero deja en `.env`:

```env
WHATSAPP_ENABLED=false
```

Abre http://localhost:5173 y crea una reserva.

## 5. Activar WhatsApp

Instala Google Chrome si no lo tienes.

Luego cambia en `.env`:

```env
WHATSAPP_ENABLED=true
PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

Reinicia:

```bash
npm run dev
```

Escanea el QR que aparece en la terminal.

## 6. Flujo de mensajes

La app envía WhatsApp cuando:

- El cliente agenda una hora.
- Falta 1 día para una reserva confirmada.
- Faltan 5 horas para una reserva confirmada.

Para evitar duplicados usa estos campos en cada reserva:

- `bookingMessageSent`
- `reminder24hSent`
- `reminder5hSent`

## 7. Deploy recomendado

Para probar: Mac + Visual Studio Code.

Para producción con `whatsapp-web.js`: Render con plan que tenga disco persistente en `/app/storage`.

Para producción más estable: WhatsApp Cloud API oficial. No necesita QR ni navegador.
