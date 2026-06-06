 # WHATSAPP_SESSION — Commands

Instrucciones y comandos listos para copiar para autenticar `whatsapp-web.js` localmente, preparar la carpeta `LocalAuth` (session), y transferirla de forma segura al servidor.

ADVERTENCIA: la carpeta de sesión contiene credenciales sensibles. No la agregues a git y mantenla en almacenamiento privado.

1) Autenticar localmente y crear la carpeta de sesión

```bash
# desde la raíz del repo
cd server
npm install

# iniciar servidor para que whatsapp-web.js abra Chromium y muestre QR
# sustituye ./server-whatsapp-session por la carpeta destino que prefieras
WHATSAPP_ENABLED=true WHATSAPP_SESSION_PATH="./server-whatsapp-session" PORT=10000 node src/index.js
```

— Escanea la QR desde la app de WhatsApp del número que usarás. Cuando esté autenticado, se crearán archivos en `./server-whatsapp-session`.

2) Verificar la sesión localmente

```bash
# detener el proceso anterior (Ctrl+C) y volver a iniciar usando la misma ruta
WHATSAPP_ENABLED=true WHATSAPP_SESSION_PATH="./server-whatsapp-session" PORT=10000 node src/index.js

# en los logs debería aparecer que el cliente está `ready` y no solicitar otra QR
```

3) Empaquetar la carpeta de sesión

```bash
# desde la raíz
tar -czf whatsapp-session.tar.gz -C ./ server-whatsapp-session
# o zip
zip -r whatsapp-session.zip server-whatsapp-session
```

4) Transferir el archivo al servidor (recomendado: S3/Spaces)

Opción A — Subir a S3 y descargar desde el servidor (recomendado):

```bash
# subir (local)
aws s3 cp whatsapp-session.tar.gz s3://my-private-bucket/agenda/whatsapp-session.tar.gz

# en el servidor (deploy script o shell remoto)
aws s3 cp s3://my-private-bucket/agenda/whatsapp-session.tar.gz /tmp/whatsapp-session.tar.gz
mkdir -p /srv/agenda
tar -xzf /tmp/whatsapp-session.tar.gz -C /srv/agenda
mv /srv/agenda/server-whatsapp-session ./server-whatsapp-session || true
chown -R <app-user>:<app-user> ./server-whatsapp-session
chmod -R 700 ./server-whatsapp-session
```

Opción B — SCP directo (si tienes acceso SSH):

```bash
# desde local
scp whatsapp-session.tar.gz user@your-server:/tmp/

# en servidor
ssh user@your-server
mkdir -p /srv/agenda
tar -xzf /tmp/whatsapp-session.tar.gz -C /srv/agenda
mv /srv/agenda/server-whatsapp-session ./server-whatsapp-session || true
chown -R <app-user>:<app-user> ./server-whatsapp-session
chmod -R 700 ./server-whatsapp-session
```

5) Configurar variables de entorno en el servidor

Usa las mismas rutas que en local (o ajusta según donde extraigas la carpeta):

```
WHATSAPP_ENABLED=true
WHATSAPP_SESSION_PATH=./server-whatsapp-session
PORT=10000
# opcional: si tu host tiene Chrome en otra ruta
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
```

6) Asegurarse de que exista Chromium/Chrome en el servidor

Si el servidor no tiene Chromium, instala una versión del sistema o usa Playwright en el build step:

```bash
# ejemplo: instalar Playwright browsers (build step)
npm ci --prefix server
npx playwright install chromium || true
```

7) Iniciar el servidor en producción y verificar

```bash
# desde la raíz del repo (si añadiste el script root)
npm run download-and-start

# o iniciar directamente en server
cd server
WHATSAPP_ENABLED=true WHATSAPP_SESSION_PATH="./server-whatsapp-session" PORT=10000 node src/index.js
```

Verifica en los logs que el cliente alcance el estado `ready`. Luego prueba crear una reserva en la app para comprobar que se envía el mensaje WhatsApp.

8) Buenas prácticas y seguridad

- No subir `server-whatsapp-session` a git.
- Mantener el archivo tar/zip en almacenamiento privado y eliminarlo después del deploy.
- Restringir acceso a la bucket o máquina que almacena la sesión.

9) Troubleshooting rápido

- Puppeteer no arranca: confirma `PUPPETEER_EXECUTABLE_PATH` o instala Chromium en el host.
- Permisos: si la app no puede leer la sesión, verifica `chown` y `chmod` (usuario bajo el que corre el proceso).

Si quieres, puedo crear un script `deploy/fetch-whatsapp-session.sh` que descargue desde S3 y lo deje en la ruta correcta.
