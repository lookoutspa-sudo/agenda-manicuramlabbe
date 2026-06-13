import { readData } from "./store.js";
import { getWeekday, minutesToTime, overlaps, timeToMinutes } from "./time.js";

const SLOT_STEP_MINUTES = 30;
const BOOKING_BUFFER_MINUTES = Number(process.env.BOOKING_BUFFER_MINUTES || 15);

export function getAvailableSlots({ date, serviceId }) {
  const data = readData();
  const service = data.services.find((item) => item.id === serviceId && item.isActive !== false);
  if (!service) return { service: null, slots: [] };

  const weekday = getWeekday(date);
  const availability = data.availability.find((item) => item.weekday === weekday);
  if (!availability || availability.isOpen !== true) return { service, slots: [] };

  const start = timeToMinutes(availability.startTime);
  const end = timeToMinutes(availability.endTime);
  const breakStart = availability.breakStart ? timeToMinutes(availability.breakStart) : null;
  const breakEnd = availability.breakEnd ? timeToMinutes(availability.breakEnd) : null;

  const booked = data.bookings
    .filter((item) => item.date === date && ["pending", "confirmed"].includes(item.status))
    .map((item) => ({
      start: timeToMinutes(item.startTime) - BOOKING_BUFFER_MINUTES,
      end: timeToMinutes(item.endTime) + BOOKING_BUFFER_MINUTES,
    }));

  const blocked = data.blockedSlots
    .filter((item) => item.date === date)
    .map((item) => ({
      start: timeToMinutes(item.startTime),
      end: timeToMinutes(item.endTime),
    }));

  const conflicts = [...booked, ...blocked];
  const slots = [];

  for (let slotStart = start; slotStart + service.durationMinutes <= end; slotStart += SLOT_STEP_MINUTES) {
    const slotEnd = slotStart + service.durationMinutes;

    const crossesBreak =
      breakStart !== null &&
      breakEnd !== null &&
      overlaps(slotStart, slotEnd, breakStart, breakEnd);

    const hasConflict = conflicts.some((item) =>
      overlaps(slotStart, slotEnd, item.start, item.end)
    );

    if (!crossesBreak && !hasConflict) {
      slots.push({
        startTime: minutesToTime(slotStart),
        endTime: minutesToTime(slotEnd),
      });
    }
  }

  return { service, slots };
}

export function ensureSlotAvailable({ date, serviceId, startTime }) {
  const result = getAvailableSlots({ date, serviceId });
  if (!result.service) return { ok: false, reason: "SERVICE_NOT_FOUND" };

  const slot = result.slots.find((item) => item.startTime === startTime);
  if (!slot) return { ok: false, reason: "SLOT_NOT_AVAILABLE" };

  return { ok: true, service: result.service, slot };
}