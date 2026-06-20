import { google } from "googleapis";

function getGoogleCredentials() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    throw new Error("Falta GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 en el .env");
  }

  const credentialsJson = Buffer.from(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64,
    "base64"
  ).toString("utf8");

  return JSON.parse(credentialsJson);
}

const credentials = getGoogleCredentials();

const auth = new google.auth.JWT({
  email: credentials.client_email,
  key: credentials.private_key,
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar = google.calendar({
  version: "v3",
  auth,
});

export async function createCalendarEvent({
  clientName,
  phone,
  serviceName,
  startDate,
  endDate,
  notes,
}) {
  const event = {
    summary: `${serviceName} - ${clientName}`,
    description: [
      "Reserva creada desde la app de agenda.",
      "",
      `Cliente: ${clientName}`,
      `Teléfono: ${phone}`,
      `Servicio: ${serviceName}`,
      `Notas: ${notes || "Sin notas"}`,
    ].join("\n"),
    start: {
      dateTime: startDate,
      timeZone: process.env.GOOGLE_CALENDAR_TIMEZONE || "America/Santiago",
    },
    end: {
      dateTime: endDate,
      timeZone: process.env.GOOGLE_CALENDAR_TIMEZONE || "America/Santiago",
    },
  };

  const response = await calendar.events.insert({
    calendarId: process.env.GOOGLE_CALENDAR_ID,
    requestBody: event,
  });

  return {
    googleEventId: response.data.id,
    googleEventLink: response.data.htmlLink,
  };
}