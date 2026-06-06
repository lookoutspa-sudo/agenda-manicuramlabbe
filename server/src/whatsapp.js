import fs from "node:fs";
import cron from "node-cron";
import { readData, updateData, nowIso } from "./store.js";

const TIME_ZONE = process.env.APP_TIMEZONE || "America/Santiago";
const REMINDER_CRON = process.env.REMINDER_CRON || "*/5 * * * *";
const REMINDER_WINDOW_MINUTES = Number(process.env.REMINDER_WINDOW_MINUTES || 30);

let client = null;
let isReady = false;
let reminderCronStarted = false;

function whatsappEnabled() {
  return process.env.WHATSAPP_ENABLED === "true";
}

function firstExistingPath(paths) {
  return paths.find((item) => item && fs.existsSync(item));
}

function getChromeExecutablePath() {
  return process.env.PUPPETEER_EXECUTABLE_PATH
    || process.env.CHROME_BIN
    || firstExistingPath([
      "/usr/bin/google-chrome-stable",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
    ]);
}

export async function initWhatsApp() {
  if (!whatsappEnabled()) {
    console.log("WhatsApp deshabilitado. Define WHATSAPP_ENABLED=true para activarlo.");
    return;
  }

  if (client) return;

  let Client;
  let LocalAuth;
  try {
    const pkg = await import("whatsapp-web.js");
    Client = pkg.Client || pkg.default?.Client;
    LocalAuth = pkg.LocalAuth || pkg.default?.LocalAuth;
    if (!Client || !LocalAuth) throw new Error("No se pudo cargar Client/LocalAuth desde whatsapp-web.js");
  } catch (error) {
    console.error("Error importando whatsapp-web.js:", error.message);
    return;
  }

  const sessionPath = process.env.WHATSAPP_SESSION_PATH || "./server-whatsapp-session";
  const executablePath = getChromeExecutablePath();

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: sessionPath }),
    puppeteer: {
      headless: true,
      ...(executablePath ? { executablePath } : {}),
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
      ],
    },
    userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  });

  client.on("qr", (qr) => {
    console.log("QR_RECEIVED:", qr);
    import("qrcode-terminal")
      .then((qrcode) => (qrcode.default || qrcode).generate(qr, { small: true }))
      .catch(() => {});
  });

  client.on("authenticated", () => {
    console.log("Sesión de WhatsApp autenticada");
  });

  client.on("ready", () => {
    isReady = true;
    console.log("Cliente de WhatsApp conectado y listo");
    startReminderCron();
  });

  client.on("auth_failure", (msg) => {
    isReady = false;
    console.error("Error de autenticación de WhatsApp:", msg);
  });

  client.on("disconnected", (reason) => {
    isReady = false;
    console.warn("Cliente de WhatsApp desconectado:", reason);
  });

  try {
    await client.initialize();
  } catch (error) {
    isReady = false;
    console.error("Error inicializando WhatsApp:", error.message);
  }
}

function formatPhoneForWhatsApp(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  let normalized = digits;

  if (normalized.startsWith("00")) normalized = normalized.slice(2);
  if (normalized.startsWith("9") && normalized.length === 9) normalized = `56${normalized}`;
  if (normalized.length === 8) normalized = `569${normalized}`;

  if (!/^\d{10,15}$/.test(normalized)) {
    throw new Error(`Teléfono inválido para WhatsApp: ${phone}`);
  }

  return `${normalized}@c.us`;
}

function formatDate(date) {
  const [year, month, day] = String(date).split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

async function sendMessage(phone, message) {
  if (!whatsappEnabled()) return false;
  if (!isReady || !client) throw new Error("WhatsApp todavía no está listo");

  const chatId = formatPhoneForWhatsApp(phone);
  await client.sendMessage(chatId, message.trim());
  return true;
}

function shouldSendToBooking(booking) {
  return booking?.whatsappConsent !== false && booking?.phone;
}

export async function sendBookingConfirmation(booking, service) {
  if (!shouldSendToBooking(booking)) return false;

  const message = `
🎉 *Reserva registrada*

Hola ${booking.clientName}, recibimos tu solicitud de hora.

📋 *Detalles:*
• Servicio: ${service.name}
• Fecha: ${formatDate(booking.date)}
• Hora: ${booking.startTime} - ${booking.endTime}
• Profesional: Marcela Labbé

Te avisaremos si existe algún cambio.

Belleza. Salud. Confianza. 💅
`;

  await sendMessage(booking.phone, message);
  console.log(`Confirmación de registro enviada a ${booking.phone}`);
  return true;
}

export async function sendBookingCancellation(booking, service) {
  if (!shouldSendToBooking(booking)) return false;

  const message = `
❌ *Reserva cancelada*

Hola ${booking.clientName}, tu reserva fue cancelada.

📋 *Detalles:*
• Servicio: ${service.name}
• Fecha: ${formatDate(booking.date)}
• Hora: ${booking.startTime}

Si deseas reprogramar, contáctanos.

Belleza. Salud. Confianza. 💅
`;

  await sendMessage(booking.phone, message);
  console.log(`Cancelación enviada a ${booking.phone}`);
  return true;
}

async function sendReminder24h(booking, service) {
  if (!shouldSendToBooking(booking)) return false;

  const message = `
⏰ *Recordatorio de cita*

Hola ${booking.clientName}, te recordamos que mañana tienes una hora agendada.

📋 *Detalles:*
• Servicio: ${service.name}
• Fecha: ${formatDate(booking.date)}
• Hora: ${booking.startTime}
• Profesional: Marcela Labbé

Si necesitas cancelar o reprogramar, avísanos con tiempo.

Belleza. Salud. Confianza. 💅
`;

  await sendMessage(booking.phone, message);
  console.log(`Recordatorio 24h enviado a ${booking.phone}`);
  return true;
}

async function sendReminder5h(booking, service) {
  if (!shouldSendToBooking(booking)) return false;

  const message = `
⏰ *Recordatorio de cita*

Hola ${booking.clientName}, te recordamos que hoy tienes una hora agendada en aproximadamente 5 horas.

📋 *Detalles:*
• Servicio: ${service.name}
• Fecha: ${formatDate(booking.date)}
• Hora: ${booking.startTime}
• Profesional: Marcela Labbé

Te esperamos.

Belleza. Salud. Confianza. 💅
`;

  await sendMessage(booking.phone, message);
  console.log(`Recordatorio 5h enviado a ${booking.phone}`);
  return true;
}

function getTimeZoneParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const values = Object.fromEntries(formatter.formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function zonedDateTimeToUtc(dateString, timeString, timeZone = TIME_ZONE) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = timeString.split(":").map(Number);

  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);

  for (let i = 0; i < 3; i += 1) {
    const parts = getTimeZoneParts(new Date(utcMs), timeZone);
    const actualAsUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    utcMs += desiredAsUtc - actualAsUtc;
  }

  return new Date(utcMs);
}

function minutesUntilBooking(booking) {
  const bookingDate = zonedDateTimeToUtc(booking.date, booking.startTime);
  return Math.round((bookingDate.getTime() - Date.now()) / 60000);
}

function markBooking(id, fields) {
  updateData((data) => {
    const booking = data.bookings.find((item) => item.id === id);
    if (!booking) return null;
    Object.assign(booking, fields, { updatedAt: nowIso() });
    return booking;
  });
}

async function processReminderQueue() {
  if (!isReady || !client) return;

  const data = readData();

  for (const booking of data.bookings) {
    if (booking.status !== "confirmed") continue;
    if (booking.whatsappConsent === false) continue;

    const service = data.services.find((item) => item.id === booking.serviceId);
    if (!service) continue;

    const minutesLeft = minutesUntilBooking(booking);
    if (minutesLeft <= 0) continue;

    if (!booking.reminder24hSent && minutesLeft <= 24 * 60 && minutesLeft > (24 * 60 - REMINDER_WINDOW_MINUTES)) {
      try {
        const sent = await sendReminder24h(booking, service);
        if (sent) markBooking(booking.id, { reminder24hSent: true, reminder24hSentAt: nowIso() });
      } catch (error) {
        console.error(`Error enviando recordatorio 24h reserva ${booking.id}:`, error.message);
      }
    }

    if (!booking.reminder5hSent && minutesLeft <= 5 * 60 && minutesLeft > (5 * 60 - REMINDER_WINDOW_MINUTES)) {
      try {
        const sent = await sendReminder5h(booking, service);
        if (sent) markBooking(booking.id, { reminder5hSent: true, reminder5hSentAt: nowIso() });
      } catch (error) {
        console.error(`Error enviando recordatorio 5h reserva ${booking.id}:`, error.message);
      }
    }
  }
}

function startReminderCron() {
  if (reminderCronStarted) return;
  reminderCronStarted = true;

  cron.schedule(REMINDER_CRON, processReminderQueue, { timezone: TIME_ZONE });
  console.log(`Tarea de recordatorios iniciada: ${REMINDER_CRON} (${TIME_ZONE})`);

  processReminderQueue().catch((error) => {
    console.error("Error ejecutando recordatorios iniciales:", error.message);
  });
}

export async function closeWhatsApp() {
  if (!client) return;

  try {
    await client.destroy();
  } catch (error) {
    console.error("Error cerrando WhatsApp:", error.message);
  } finally {
    client = null;
    isReady = false;
    reminderCronStarted = false;
  }
}

export function isWhatsAppReady() {
  return isReady;
}
