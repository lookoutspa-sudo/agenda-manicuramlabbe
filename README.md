# AGENDA MANICURA

## WhatsApp Session transfer (auth local -> deploy)

This project uses `whatsapp-web.js` with `LocalAuth` to persist an authenticated WhatsApp session on disk. Puppeteer (Chromium) is used to perform the login QR flow. For many hosting providers (e.g. Render) it's easier and safer to authenticate locally and then upload the session folder to the server rather than running the QR flow on the host.

Follow these steps to authenticate locally and transfer the session to the server safely.

1) Authenticate locally and produce session files

- On your local machine, from the project root run:

```bash
# install dependencies and start the server with WhatsApp enabled
cd server
npm install
# Run the server so whatsapp-web.js opens a Chromium and prints a QR in the console
WHATSAPP_ENABLED=true WHATSAPP_SESSION_PATH="./server-whatsapp-session" PORT=10000 node src/index.js
```

- The server will log a QR code (also printed in ASCII when `qrcode-terminal` is available). Scan the QR with the WhatsApp phone that should be the business account. After scanning, `whatsapp-web.js` will persist session files under the folder you passed via `WHATSAPP_SESSION_PATH` (e.g. `server-whatsapp-session`).

2) Verify session works locally

- Stop the server and start it again using the same `WHATSAPP_SESSION_PATH` and `WHATSAPP_ENABLED=true`. The library should reuse the saved session and the client should reach `ready` state without requiring a new QR scan.

3) Prepare the session folder for transfer

- The `LocalAuth` directory contains files and tokens sensitive to authentication. Treat it like a secret. Example folder contents: `server-whatsapp-session/`.
- Optional: compress the session folder to a single archive before transfer:

```bash
tar -czf whatsapp-session.tar.gz -C ./ server-whatsapp-session
```

4) Securely transfer to your server (recommended: S3 or secure artifact store)

- Recommended approach: upload the tar/zip to a private object storage (e.g. S3, DigitalOcean Spaces) and download it from your server during deploy. This avoids committing session files to git.

Example (upload locally, then download from the server):

```bash
# locally
aws s3 cp whatsapp-session.tar.gz s3://my-private-bucket/agenda/whatsapp-session.tar.gz

# on the server (or in a deploy script)
aws s3 cp s3://my-private-bucket/agenda/whatsapp-session.tar.gz /tmp/whatsapp-session.tar.gz
tar -xzf /tmp/whatsapp-session.tar.gz -C /srv/agenda
# make sure ownership and permissions are correct
chown -R <app-user>:<app-user> /srv/agenda/server-whatsapp-session
chmod -R 700 /srv/agenda/server-whatsapp-session
```

If you cannot use S3, you can scp the archive to the server over SSH:

```bash
scp whatsapp-session.tar.gz user@your-server:/tmp/
ssh user@your-server
sudo mv /tmp/whatsapp-session.tar.gz /srv/agenda/
tar -xzf /srv/agenda/whatsapp-session.tar.gz -C /srv/agenda
chown -R <app-user>:<app-user> /srv/agenda/server-whatsapp-session
chmod -R 700 /srv/agenda/server-whatsapp-session
```

5) Configure the server to use the uploaded session

- Ensure the server's environment variables are set to point to the session folder and enable WhatsApp. Examples for Render or similar platforms:

```
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./server-whatsapp-session
PORT=10000
```

- If you used a different path on the server, set `WHATSAPP_SESSION_PATH` accordingly.

6) Ensure a Chromium binary is available

- Puppeteer needs a Chromium/Chrome binary. If your host does not provide it, either:
	- Install system Chromium/Chrome and set `PUPPETEER_EXECUTABLE_PATH` to the binary path; or
	- Download Chromium during deploy (we added a helper that tries `npx playwright install chromium` in `download-and-start.sh`).

Environment example (Render build/ start commands):

```
# During build (optional)
npm ci --prefix server
npx playwright install chromium || true

# Start (example)
WHATSAPP_ENABLED=true WHATSAPP_SESSION_PATH=./server-whatsapp-session PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser node server/src/index.js
```

7) Restart and verify on the server

- Start the server in the deployed environment. The server logs should show the WhatsApp client reaching `ready` and not printing a new QR.
- Test sending a confirmation/cancellation by creating a booking from the client; confirm the phone receives messages.

Security notes

- Never commit the session folder to git. It contains tokens that allow access to your WhatsApp session.
- Store archives in private storage and rotate/delete them when no longer needed.
- Limit who can access the storage and the server.

Troubleshooting

- If you see Puppeteer launch errors on the server, ensure `PUPPETEER_EXECUTABLE_PATH` points to a valid Chrome/Chromium binary or that Playwright/Chromium was installed successfully.
- If the session doesn't appear to load, confirm the `WHATSAPP_SESSION_PATH` is the same path used when creating the session and that file ownership/permissions let the app read the files.

If you want, I can also add a small `docs/WHATSAPP_SESSION.md` with these steps separated into commands and templated Render settings.


## Corrección WhatsApp y recordatorios

Esta versión incluye una corrección para enviar WhatsApp al registrar una reserva y recordatorios automáticos 24 horas y 5 horas antes.

### Campos agregados a reservas

- `whatsappConsent`
- `bookingMessageSent`
- `bookingMessageSentAt`
- `reminder24hSent`
- `reminder24hSentAt`
- `reminder5hSent`
- `reminder5hSentAt`

### Desarrollo local

```bash
npm install
cp .env.example .env
npm run seed
npm start
```

Para activar WhatsApp localmente:

```bash
WHATSAPP_ENABLED=true WHATSAPP_SESSION_PATH=./server-whatsapp-session npm start
```

### Render

Usa `render.yaml` incluido. Para producción con `whatsapp-web.js`, el servicio debe tener disco persistente montado en `/app/storage`.

Revisa también `docs/RENDER_WHATSAPP.md`.
