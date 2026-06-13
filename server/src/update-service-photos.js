import { migrate, nowIso, updateData } from "./store.js";

migrate();

const photosByServiceId = {
  "esmaltado-permanente-1-color":
    "https://agenda-manicura-web.onrender.com/assets/services/esmaltado-permanente-1-color.jpg",

  "esmaltado-permanente-variedad-tonos":
    "https://agenda-manicura-web.onrender.com/assets/services/esmaltado-permanente-variedad-tonos.jpg",

  "kapping-esmaltado-permanente":
    "https://agenda-manicura-web.onrender.com/assets/services/kapping-esmaltado-permanente.jpg",

  "kapping-poligel-esmaltado-permanente":
    "https://agenda-manicura-web.onrender.com/assets/services/kapping-poligel-esmaltado-permanente.jpg",

  "soft-gel-esmaltado-permanente":
    "https://agenda-manicura-web.onrender.com/assets/services/soft-gel-esmaltado-permanente.jpg",

  "esmaltado-permanente-pies":
    "https://agenda-manicura-web.onrender.com/assets/services/esmaltado-permanente-pies.jpg",

  "lifting-pestanas":
    "https://agenda-manicura-web.onrender.com/assets/services/lifting-pestanas.jpg",
};

updateData((data) => {
  const now = nowIso();

  for (const service of data.services) {
    const imageUrl = photosByServiceId[service.id];

    if (imageUrl) {
      service.imageUrl = imageUrl;
      service.updatedAt = now;
    }
  }

  return data.services;
});

console.log("Fotos de servicios actualizadas correctamente.");
console.log(`Fotos configuradas: ${Object.keys(photosByServiceId).length}`);