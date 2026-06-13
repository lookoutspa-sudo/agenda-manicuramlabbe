import { migrate, nowIso, updateData } from "./store.js";

migrate();

const services = [
  {
    id: "esmaltado-permanente-1-color",
    name: "Esmaltado permanente 1 color",
    description:
      "Uñas impecables, brillantes y con tu color favorito intacto por semanas. ¡Olvídate de retocar!",
    durationMinutes: 90,
    priceClp: 15000,
    imageUrl:
      "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "esmaltado-permanente-variedad-tonos",
    name: "Esmaltado permanente variedad de tonos",
    description:
      "¡Elige tu vibración! Disfruta de una infinita variedad de tonos, desde los clásicos elegantes hasta las últimas tendencias, en un esmaltado permanente impecable, brillante e intacto por semanas. ¡Olvídate de retocar y encuentra tu color perfecto!",
    durationMinutes: 90,
    priceClp: 16000,
    imageUrl:
      "https://images.unsplash.com/photo-1610992015732-2449b76344bc?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "kapping-esmaltado-permanente",
    name: "Kapping + esmaltado permanente",
    description:
      "Protegemos tus uñas naturales con una base de kapping para darles máxima resistencia y evitar que se rompan, sumando una increíble variedad de tonos permanentes con brillo espejo para que disfrutes de unas manos perfectas e impecables por semanas.",
    durationMinutes: 90,
    priceClp: 18000,
    imageUrl:
      "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "kapping-poligel-esmaltado-permanente",
    name: "Kapping poligel + esmaltado permanente",
    description:
      "¿Uñas débiles que se doblan fácilmente? El kapping de polygel es el escudo definitivo para mantenerlas firmes e impecables mientras crecen, sellado con el color permanente que elijas. ¡Olvídate de las uñas rotas, luce un brillo espectacular y despreocúpate de retocar por semanas!",
    durationMinutes: 120,
    priceClp: 20000,
    imageUrl:
      "https://images.unsplash.com/photo-1610992235683-e39e19cf98f5?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "soft-gel-esmaltado-permanente",
    name: "Soft gel + esmaltado permanente",
    description:
      "Transformamos tus manos con extensiones de Softgel para un largo perfecto y natural en tiempo récord, selladas con una increíble variedad de tonos permanentes con brillo espejo para que disfrutes de unas uñas impecables e intactas por semanas.",
    durationMinutes: 120,
    priceClp: 24000,
    imageUrl:
      "https://images.unsplash.com/photo-1607779097040-26e80aa78e66?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "esmaltado-permanente-pies",
    name: "Esmaltado permanente para pies",
    description:
      "Dale a tus pies el cuidado que merecen con un esmaltado permanente ultra duradero que no se salta ni pierde el brillo con el roce de los zapatos. ¡Elige tu color favorito, olvídate de retocar por semanas y mantén tus pies listos y perfectos para cualquier ocasión!",
    durationMinutes: 60,
    priceClp: 17000,
    imageUrl:
      "https://images.unsplash.com/photo-1599948128020-9a44505b0d1b?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
  {
    id: "lifting-pestanas",
    name: "Lifting de pestañas",
    description:
      "¿Cansada de usar el encrespador y que tus pestañas se bajen? El lifting es la solución ideal para lucir unas pestañas curvadas, ordenadas y visiblemente más largas por semanas sin dañar tu pelo natural. ¡Olvídate de retocar la mirada y dale un descanso al rímel!",
    durationMinutes: 60,
    priceClp: 16000,
    imageUrl:
      "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80",
    isActive: true,
  },
];

updateData((data) => {
  const now = nowIso();

  for (const service of data.services) {
    service.isActive = false;
    service.updatedAt = now;
  }

  for (const service of services) {
    const existing = data.services.find((item) => item.id === service.id);

    if (existing) {
      Object.assign(existing, service, {
        updatedAt: now,
        createdAt: existing.createdAt || now,
      });
    } else {
      data.services.push({
        ...service,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  return data.services;
});

console.log("Servicios actualizados correctamente.");
console.log(`Servicios activos: ${services.length}`);