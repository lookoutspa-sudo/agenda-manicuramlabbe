import "dotenv/config";
import bcrypt from "bcryptjs";
import { dbPath, migrate, nextId, updateData } from "./store.js";

migrate();

const services = [
  {
    id: "manicure",
    name: "Manicure",
    description: "Cuidado y embellecimiento de uñas y cutículas.",
    durationMinutes: 60,
    priceClp: 12000,
    imageUrl: "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "pedicure",
    name: "Pedicure",
    description: "Cuidado completo para uñas y pies.",
    durationMinutes: 75,
    priceClp: 18000,
    imageUrl: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "esmaltado-permanente",
    name: "Esmaltado Permanente",
    description: "Color intenso y brillo duradero hasta 3 semanas.",
    durationMinutes: 90,
    priceClp: 17000,
    imageUrl: "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "unas-acrilicas",
    name: "Uñas Acrílicas",
    description: "Extensión y diseño para uñas fuertes y elegantes.",
    durationMinutes: 150,
    priceClp: 30000,
    imageUrl: "https://images.unsplash.com/photo-1610992235683-e39e19cf98f5?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "soft-gel",
    name: "Soft Gel",
    description: "Sistema ligero, flexible y natural con acabado perfecto.",
    durationMinutes: 120,
    priceClp: 28000,
    imageUrl: "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "nails-recovery",
    name: "Nails Recovery",
    description: "Tratamiento intensivo para uñas dañadas y debilitadas.",
    durationMinutes: 80,
    priceClp: 22000,
    imageUrl: "https://images.unsplash.com/photo-1599948128020-9a44505b0d1b?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
];

const email = process.env.ADMIN_EMAIL || "admin@marcela-labbe.cl";
const password = process.env.ADMIN_PASSWORD || "Cambiar123";

updateData((data) => {
  for (const service of services) {
    const index = data.services.findIndex((item) => item.id === service.id);
    if (index >= 0) data.services[index] = { ...data.services[index], ...service, updatedAt: new Date().toISOString() };
    else data.services.push({ ...service, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
  }

  data.availability = [];
  for (let weekday = 0; weekday <= 6; weekday++) {
    data.availability.push({
      weekday,
      isOpen: weekday !== 0,
      startTime: "09:00",
      endTime: "19:00",
      breakStart: weekday === 0 ? null : "14:00",
      breakEnd: weekday === 0 ? null : "15:00",
    });
  }

  data.businessSettings = {
    businessName: "Marcela Labbé - Nails Recovery",
    brandRed: "#990E0E",
    brandBlack: "#000000",
    brandWhite: "#FFFFFF",
    tagline: "Belleza. Salud. Confianza.",
  };

  const admin = data.adminUsers.find((item) => item.email === email);
  if (!admin) {
    data.adminUsers.push({
      id: nextId(data, "adminUsers"),
      email,
      passwordHash: bcrypt.hashSync(password, 10),
      name: "Marcela Labbé",
      createdAt: new Date().toISOString(),
    });
  }
});

console.log(`Base de datos JSON lista: ${dbPath}`);
console.log(`Admin inicial: ${email}`);
