import QRCode from "qrcode";
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import QRCode from "qrcode";
import bcrypt from "bcryptjs";
import { migrate, nextId, nowIso, readData, updateData } from "./store.js";
import { signToken, requireAdmin } from "./auth.js";
import { getAvailableSlots, ensureSlotAvailable } from "./availability.js";
import { loginSchema, bookingSchema, serviceSchema, servicePatchSchema, statusSchema, parseOrError } from "./validators.js";
import {initWhatsApp, sendBookingConfirmation, sendBookingCancellation, closeWhatsApp, isWhatsAppReady, getLatestWhatsAppQr} from "./whatsapp.js";

migrate();

// Inicializar WhatsApp si está habilitado
if (process.env.WHATSAPP_ENABLED === "true") {
  initWhatsApp().catch((err) => {
    console.error("Error inicializando WhatsApp:", err);
  });
}

const app = express();
const port = Number(process.env.PORT || 4000);
const corsOrigin = process.env.CORS_ORIGIN || [
  "http://localhost:5173",
  "https://agenda-marcela-web.onrender.com",
];

app.use(helmet());
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

function bookingToClient(booking, services) {
  const service = services.find((item) => item.id === booking.serviceId);
  return {
    id: booking.id,
    serviceId: booking.serviceId,
    serviceName: service?.name || "Servicio eliminado",
    clientName: booking.clientName,
    phone: booking.phone,
    email: booking.email || "",
    date: booking.date,
    startTime: booking.startTime,
    endTime: booking.endTime,
    status: booking.status,
    notes: booking.notes || "",
    createdAt: booking.createdAt,
    whatsappConsent: booking.whatsappConsent !== false,
    bookingMessageSent: Boolean(booking.bookingMessageSent),
    reminder24hSent: Boolean(booking.reminder24hSent),
    reminder5hSent: Boolean(booking.reminder5hSent),
  };
}

function publicUser(user) {
  return { id: user.id, email: user.email, name: user.name };
}

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "Marcela Labbé API" });
});

app.get("/api/whatsapp/qr", async (req, res) => {
  try {
    if (process.env.WHATSAPP_ENABLED !== "true") {
      return res.status(400).send("WhatsApp está desactivado.");
    }

    if (isWhatsAppReady()) {
      return res.send("WhatsApp ya está conectado.");
    }

    const qr = getLatestWhatsAppQr();

    if (!qr) {
      return res.send(`
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta http-equiv="refresh" content="5" />
            <title>Esperando QR</title>
          </head>
          <body style="font-family: Arial; text-align: center; padding: 40px;">
            <h1>QR todavía no está listo</h1>
            <p>Esta página se actualizará automáticamente en 5 segundos.</p>
          </body>
        </html>
      `);
    }

    const png = await QRCode.toBuffer(qr, {
      type: "png",
      width: 600,
      margin: 4,
    });

    res.setHeader("Cache-Control", "no-store");
    res.type("png").send(png);
  } catch (error) {
    console.error("Error generando QR WhatsApp:", error.message);
    res.status(500).send("Error generando QR WhatsApp.");
  }
});



app.get("/api/whatsapp/status", requireAdmin, (req, res) => {
  res.json({
    enabled: process.env.WHATSAPP_ENABLED === "true",
    ready: isWhatsAppReady(),
    note: "Si WHATSAPP_ENABLED=true, revisa los logs de Render para ver QR o estado ready.",
  });
});

app.get("/api/brand", (req, res) => {
  res.json(readData().businessSettings);
});

app.post("/api/auth/login", (req, res) => {
  const parsed = parseOrError(loginSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.errors });

  const data = readData();
  const user = data.adminUsers.find((item) => item.email === parsed.data.email);
  if (!user || !bcrypt.compareSync(parsed.data.password, user.passwordHash)) {
    return res.status(401).json({ error: "INVALID_CREDENTIALS" });
  }

  const safeUser = publicUser(user);
  res.json({ token: signToken(safeUser), user: safeUser });
});

app.get("/api/services", (req, res) => {
  const includeInactive = req.query.includeInactive === "true";
  const data = readData();
  const services = includeInactive ? data.services : data.services.filter((item) => item.isActive !== false);
  res.json(services);
});

app.get("/api/availability", (req, res) => {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) return res.status(400).json({ error: "DATE_AND_SERVICE_REQUIRED" });
  const result = getAvailableSlots({ date, serviceId });
  if (!result.service) return res.status(404).json({ error: "SERVICE_NOT_FOUND" });
  res.json({ service: result.service, slots: result.slots });
});

app.post("/api/bookings", (req, res) => {
  const parsed = parseOrError(bookingSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.errors });

  const payload = parsed.data;
  const available = ensureSlotAvailable({ date: payload.date, serviceId: payload.serviceId, startTime: payload.startTime });
  if (!available.ok) return res.status(409).json({ error: available.reason });

  const booking = updateData((data) => {
    const stillExists = data.services.find((item) => item.id === payload.serviceId && item.isActive !== false);
    if (!stillExists) return null;

    const conflict = data.bookings.some((item) =>
      item.date === payload.date &&
      item.startTime === payload.startTime &&
      ["pending", "confirmed"].includes(item.status)
    );
    if (conflict) return "CONFLICT";

    const newBooking = {
      id: nextId(data, "bookings"),
      serviceId: payload.serviceId,
      clientName: payload.clientName.trim(),
      phone: payload.phone.trim(),
      email: payload.email || "",
      date: payload.date,
      startTime: payload.startTime,
      endTime: available.slot.endTime,
      status: "pending",
      notes: payload.notes || "",
      whatsappConsent: payload.whatsappConsent !== false,
      bookingMessageSent: false,
      reminder24hSent: false,
      reminder5hSent: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    data.bookings.push(newBooking);
    return newBooking;
  });

  if (!booking) return res.status(404).json({ error: "SERVICE_NOT_FOUND" });
  if (booking === "CONFLICT") return res.status(409).json({ error: "SLOT_ALREADY_BOOKED" });

  const data = readData();
  const service = data.services.find((s) => s.id === booking.serviceId);
  
  // Enviar confirmación por WhatsApp (si está habilitado).
  // No bloquea la respuesta de la API; si se envía correctamente, se marca en la reserva.
  if (process.env.WHATSAPP_ENABLED === "true" && service && booking.whatsappConsent !== false) {
    sendBookingConfirmation(booking, service)
      .then((sent) => {
        if (!sent) return;
        updateData((data) => {
          const item = data.bookings.find((entry) => entry.id === booking.id);
          if (!item) return null;
          item.bookingMessageSent = true;
          item.bookingMessageSentAt = nowIso();
          item.updatedAt = nowIso();
          return item;
        });
      })
      .catch((err) => {
        console.error("Error enviando confirmación WhatsApp:", err.message);
      });
  }
  
  res.status(201).json(bookingToClient(booking, data.services));
});

app.get("/api/admin/bookings", requireAdmin, (req, res) => {
  const { date, status } = req.query;
  const data = readData();
  let bookings = [...data.bookings];
  if (date) bookings = bookings.filter((item) => item.date === date);
  if (status) bookings = bookings.filter((item) => item.status === status);
  bookings.sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
  res.json(bookings.map((booking) => bookingToClient(booking, data.services)));
});

app.patch("/api/admin/bookings/:id/status", requireAdmin, (req, res) => {
  const parsed = parseOrError(statusSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.errors });

  const booking = updateData((data) => {
    const item = data.bookings.find((entry) => entry.id === Number(req.params.id));
    if (!item) return null;
    item.status = parsed.data.status;
    item.updatedAt = nowIso();
    return item;
  });
  if (!booking) return res.status(404).json({ error: "BOOKING_NOT_FOUND" });

  const data = readData();
  const service = data.services.find((s) => s.id === booking.serviceId);
  
  // Enviar notificación de cancelación por WhatsApp si el estado es cancelled
  if (process.env.WHATSAPP_ENABLED === "true" && parsed.data.status === "cancelled" && service) {
    sendBookingCancellation(booking, service).catch((err) => {
      console.error("Error enviando cancelación WhatsApp:", err);
    });
  }
  
  res.json(bookingToClient(booking, data.services));
});

app.delete("/api/admin/bookings/:id", requireAdmin, (req, res) => {
  // Obtener datos de la reserva antes de eliminarla (para enviar notificación)
  const data = readData();
  const bookingToDelete = data.bookings.find((item) => item.id === Number(req.params.id));
  const service = bookingToDelete ? data.services.find((s) => s.id === bookingToDelete.serviceId) : null;
  
  const removed = updateData((data) => {
    const before = data.bookings.length;
    data.bookings = data.bookings.filter((item) => item.id !== Number(req.params.id));
    return before !== data.bookings.length;
  });
  if (!removed) return res.status(404).json({ error: "BOOKING_NOT_FOUND" });
  
  // Enviar notificación de cancelación por WhatsApp si está habilitado
  if (process.env.WHATSAPP_ENABLED === "true" && bookingToDelete && service) {
    sendBookingCancellation(bookingToDelete, service).catch((err) => {
      console.error("Error enviando cancelación WhatsApp:", err);
    });
  }
  
  res.status(204).send();
});

app.post("/api/admin/services", requireAdmin, (req, res) => {
  const parsed = parseOrError(serviceSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.errors });
  const payload = parsed.data;

  const service = updateData((data) => {
    if (data.services.some((item) => item.id === payload.id)) return "EXISTS";
    const item = {
      id: payload.id,
      name: payload.name,
      description: payload.description,
      durationMinutes: payload.durationMinutes,
      priceClp: payload.priceClp,
      imageUrl: payload.imageUrl,
      isActive: payload.isActive !== false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    data.services.push(item);
    return item;
  });

  if (service === "EXISTS") return res.status(409).json({ error: "SERVICE_EXISTS" });
  res.status(201).json(service);
});

app.patch("/api/admin/services/:id", requireAdmin, (req, res) => {
  const parsed = parseOrError(servicePatchSchema, req.body);
  if (!parsed.ok) return res.status(400).json({ error: "VALIDATION_ERROR", details: parsed.errors });

  const service = updateData((data) => {
    const item = data.services.find((entry) => entry.id === req.params.id);
    if (!item) return null;
    if (typeof parsed.data.name !== "undefined") item.name = parsed.data.name;
    if (typeof parsed.data.description !== "undefined") item.description = parsed.data.description;
    if (typeof parsed.data.durationMinutes !== "undefined") item.durationMinutes = parsed.data.durationMinutes;
    if (typeof parsed.data.priceClp !== "undefined") item.priceClp = parsed.data.priceClp;
    if (typeof parsed.data.imageUrl !== "undefined") item.imageUrl = parsed.data.imageUrl;
    if (typeof parsed.data.isActive !== "undefined") item.isActive = parsed.data.isActive;
    item.updatedAt = nowIso();
    return item;
  });

  if (!service) return res.status(404).json({ error: "SERVICE_NOT_FOUND" });
  res.json(service);
});

app.use((req, res) => res.status(404).json({ error: "NOT_FOUND" }));

const server = app.listen(port, () => {
  console.log(`Marcela Labbé API escuchando en http://localhost:${port}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\nCerrando servidor...");
  server.close(async () => {
    await closeWhatsApp();
    process.exit(0);
  });
});
