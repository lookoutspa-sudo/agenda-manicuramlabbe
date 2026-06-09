import cron from "node-cron";
import { readData, updateData, nowIso } from "./store.js";

const TIME_ZONE = process.env.APP_TIMEZONE || "America/Santiago";
const REMINDER_CRON = process.env.REMINDER_CRON || "*/5 * * * *";
const REMINDER_WINDOW_MINUTES = Number(process.env.REMINDER_WINDOW_MINUTES || 30);

let isReady = false;
let reminderCronStarted = false;

function whatsappEnabled() {
  return process.env.WHATSAPP_ENABLED === "true";
}

function getCloudConfig() {
  return {
    token: process.env.WHATSAPP_CLOUD_TOKEN || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION || "v20.0",
    confirmationTemplate: process.env.WHATSAPP_TEMPLATE_CONFIRMATION || "reserva_confirmacion",
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "es_CL",
  };
}

function cloudConfigured() {
  const config = getCloudConfig();
  return Boolean(config.token && config.phoneNumberId);
}

function formatPhoneForCloud(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  let normalized = digits;

  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2);
  }

  if (normalized.startsWith("9") && normalized.length === 9) {
    normalized = `56${normalized}`;
  }

  if (normalized.length === 8) {
    normalized = `569${normalized}`;
  }

  if (!/^\d{10,15}$/.test(normalized)) {
    throw new Error(`Teléfono inválido para WhatsApp Cloud API: ${phone}`);
  }

  return normalized;
}

function formatDate(date) {
  const [year, month, day] = String(date).split("-");
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

async function sendCloudRequest(payload) {
  const config = getCloudConfig();

  if (!config.token || !config.phoneNumberId) {
    throw new Error("Falta WHATSAPP_CLOUD_TOKEN o WHATSAPP_PHONE_NUMBER_ID.");
  }

  const url = `https://graph.facebook.com/${config.graphVersion}/${config.phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = { raw: text };
  }

  if (!response.ok) {
    const message = body?.error?.message || body?.raw || `HTTP ${response.status}`;
    throw new Error(`WhatsApp Cloud API rechazó el envío: ${message}`);
  }

  return body;
}

async function sendCloudTemplateMessage(phone, templateName, languageCode, parameters = []) {
  const to = formatPhoneForCloud(phone);

  return sendCloudRequest({
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: "body",
          parameters: parameters.map((value) => ({
            type: "text",
            text: String(value ?? ""),
          })),
        },
      ],
    },
  });
}

function shouldSendToBooking(booking) {
  return booking?.whatsappConsent !== false && booking?.phone;
}

export async function initWhatsApp() {
  if (!whatsappEnabled()) {
    isReady = false;
    console.log("WhatsApp deshabilitado. Define WHATSAPP_ENABLED=true para activarlo.");
    return;
  }

  if (!cloudConfigured()) {
    isReady = false;
    console.error("WhatsApp Cloud API no configurado. Falta token o phone number id.");
    return;
  }

  isReady = true;
  console.log("WhatsApp Cloud API configurado y listo. Producción con plantillas.");
  startReminderCron();
}

export async function sendBookingConfirmation(booking, service) {
  if (!shouldSendToBooking(booking)) return false;

  const config = getCloudConfig();

  await sendCloudTemplateMessage(booking.phone, config.confirmationTemplate, config.language, [
    booking.clientName,
    service.name,
    formatDate(booking.date),
    `${booking.startTime} - ${booking.endTime}`,
  ]);

  console.log(`Confirmación de registro enviada a ${booking.phone}`);
  return true;
}

export async function sendBookingCancellation(booking, service) {
  console.log(
    `Cancelación WhatsApp omitida para ${booking?.phone || "sin teléfono"}: falta plantilla de cancelación aprobada.`
  );
  return false;
}

async function sendReminder24h(booking, service) {
  console.log(
    `Recordatorio 24h omitido para ${booking?.phone || "sin teléfono"}: falta plantilla recordatorio_24h aprobada.`
  );
  return false;
}

async function sendReminder5h(booking, service) {
  console.log(
    `Recordatorio 5h omitido para ${booking?.phone || "sin teléfono"}: falta plantilla recordatorio_5h aprobada.`
  );
  return false;
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

  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );

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
    const actualAsUtc = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    );
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
  if (!isReady) return;

  const data = readData();

  for (const booking of data.bookings) {
    if (booking.status !== "confirmed") continue;
    if (booking.whatsappConsent === false) continue;

    const service = data.services.find((item) => item.id === booking.serviceId);
    if (!service) continue;

    const minutesLeft = minutesUntilBooking(booking);
    if (minutesLeft <= 0) continue;

    if (
      !booking.reminder24hSent &&
      minutesLeft <= 24 * 60 &&
      minutesLeft > 24 * 60 - REMINDER_WINDOW_MINUTES
    ) {
      try {
        const sent = await sendReminder24h(booking, service);
        if (sent) {
          markBooking(booking.id, {
            reminder24hSent: true,
            reminder24hSentAt: nowIso(),
          });
        }
      } catch (error) {
        console.error(`Error enviando recordatorio 24h reserva ${booking.id}:`, error.message);
      }
    }

    if (
      !booking.reminder5hSent &&
      minutesLeft <= 5 * 60 &&
      minutesLeft > 5 * 60 - REMINDER_WINDOW_MINUTES
    ) {
      try {
        const sent = await sendReminder5h(booking, service);
        if (sent) {
          markBooking(booking.id, {
            reminder5hSent: true,
            reminder5hSentAt: nowIso(),
          });
        }
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
  isReady = false;
  reminderCronStarted = false;
}

export function isWhatsAppReady() {
  return whatsappEnabled() && cloudConfigured() && isReady;
}

export function getLatestWhatsAppQr() {
  return null;
}