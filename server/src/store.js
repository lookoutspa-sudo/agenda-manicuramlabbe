import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_DATA_DIR = process.env.DATA_DIR
  || (process.env.RENDER ? "/app/storage" : path.join(__dirname, "../data"));

export const dbPath = process.env.DB_PATH || path.join(DEFAULT_DATA_DIR, "db.json");

function defaultData() {
  return {
    services: [],
    availability: [],
    blockedSlots: [],
    bookings: [],
    adminUsers: [],
    businessSettings: {
      businessName: "Marcela Labbé - Nails Recovery",
      brandRed: "#990E0E",
      brandBlack: "#000000",
      brandWhite: "#FFFFFF",
      tagline: "Belleza. Salud. Confianza.",
    },
    counters: {
      bookings: 1,
      blockedSlots: 1,
      adminUsers: 1,
    },
  };
}

function ensureDbDir() {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function normalizeData(data) {
  const base = defaultData();
  const normalized = {
    ...base,
    ...data,
    services: Array.isArray(data?.services) ? data.services : [],
    availability: Array.isArray(data?.availability) ? data.availability : [],
    blockedSlots: Array.isArray(data?.blockedSlots) ? data.blockedSlots : [],
    bookings: Array.isArray(data?.bookings) ? data.bookings : [],
    adminUsers: Array.isArray(data?.adminUsers) ? data.adminUsers : [],
    businessSettings: {
      ...base.businessSettings,
      ...(data?.businessSettings || {}),
    },
    counters: {
      ...base.counters,
      ...(data?.counters || {}),
    },
  };

  const maxBookingId = normalized.bookings.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  const maxBlockedId = normalized.blockedSlots.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);
  const maxAdminId = normalized.adminUsers.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0);

  normalized.counters.bookings = Math.max(Number(normalized.counters.bookings) || 1, maxBookingId + 1);
  normalized.counters.blockedSlots = Math.max(Number(normalized.counters.blockedSlots) || 1, maxBlockedId + 1);
  normalized.counters.adminUsers = Math.max(Number(normalized.counters.adminUsers) || 1, maxAdminId + 1);

  for (const booking of normalized.bookings) {
    booking.whatsappConsent = booking.whatsappConsent !== false;
    booking.bookingMessageSent = Boolean(booking.bookingMessageSent);
    booking.reminder24hSent = Boolean(booking.reminder24hSent);
    booking.reminder5hSent = Boolean(booking.reminder5hSent);
    booking.updatedAt = booking.updatedAt || booking.createdAt || nowIso();
  }

  return normalized;
}

export function readData() {
  try {
    ensureDbDir();
    if (!fs.existsSync(dbPath)) {
      const initial = defaultData();
      writeData(initial);
      return initial;
    }

    const raw = fs.readFileSync(dbPath, "utf-8");
    return normalizeData(JSON.parse(raw));
  } catch (error) {
    console.error("Error leyendo base JSON:", error.message);
    return defaultData();
  }
}

export function writeData(data) {
  ensureDbDir();
  const normalized = normalizeData(data || {});
  const temp = `${dbPath}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(normalized, null, 2));
  fs.renameSync(temp, dbPath);
}

export function updateData(mutator) {
  const data = readData();
  const result = mutator(data);
  if (result !== null && result !== "CONFLICT" && result !== "EXISTS") {
    writeData(data);
  } else {
    writeData(data);
  }
  return result;
}

export function nextId(data, collection) {
  if (!data.counters) data.counters = {};
  const value = Number(data.counters[collection]) || 1;
  data.counters[collection] = value + 1;
  return value;
}

export function nowIso() {
  return new Date().toISOString();
}

export function migrate() {
  const data = readData();
  writeData(data);
  console.log(`Base JSON lista: ${dbPath}`);
}
