import { migrate, updateData } from "./store.js";

migrate();

const availability = [
  {
    weekday: 0,
    isOpen: false,
    startTime: "10:00",
    endTime: "14:00",
    breakStart: null,
    breakEnd: null,
  },
  {
    weekday: 1,
    isOpen: true,
    startTime: "10:00",
    endTime: "18:00",
    breakStart: "14:00",
    breakEnd: "15:30",
  },
  {
    weekday: 2,
    isOpen: true,
    startTime: "10:00",
    endTime: "18:00",
    breakStart: "11:40",
    breakEnd: "15:30",
  },
  {
    weekday: 3,
    isOpen: true,
    startTime: "10:00",
    endTime: "18:00",
    breakStart: "14:00",
    breakEnd: "15:30",
  },
  {
    weekday: 4,
    isOpen: true,
    startTime: "10:00",
    endTime: "18:00",
    breakStart: "11:40",
    breakEnd: "15:30",
  },
  {
    weekday: 5,
    isOpen: true,
    startTime: "10:00",
    endTime: "18:00",
    breakStart: "14:00",
    breakEnd: "15:30",
  },
  {
    weekday: 6,
    isOpen: true,
    startTime: "10:00",
    endTime: "14:00",
    breakStart: null,
    breakEnd: null,
  },
];

updateData((data) => {
  data.availability = availability;
  return data.availability;
});

console.log("Horarios actualizados correctamente.");
console.log("Lunes, miércoles y viernes: 10:00-14:00 / 15:30-18:00");
console.log("Martes y jueves: 10:00-11:40 / 15:30-18:00");
console.log("Sábado: 10:00-14:00");
console.log("Domingo: cerrado");