'use strict';

/**
 * SIM-001 "Sala Livre" — serviço em memória de reserva de salas de reunião.
 *
 * API:
 *   createBooking({ roomId, userId, start, end, price })
 *   cancelBooking({ bookingId, userId, userRole, now })
 *   listBookings(roomId)
 *
 * Datas são aceitas como Date ou string/number aceitos pelo construtor Date.
 */

const LATE_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;
const LATE_CANCEL_FEE_RATE = 0.20;

function toDate(value, fieldName) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for "${fieldName}"`);
  }
  return date;
}

function createBookingService() {
  const bookings = new Map();
  let nextId = 1;

  /**
   * REQ-SIM-001 / REQ-SIM-003 — cria uma reserva, rejeitando sobreposição
   * de horários na mesma sala (BR-SIM-003).
   */
  function createBooking({ roomId, userId, start, end, price }) {
    if (!roomId) throw new Error('roomId is required');
    if (!userId) throw new Error('userId is required');
    if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
      throw new Error('price must be a non-negative number');
    }

    const startDate = toDate(start, 'start');
    const endDate = toDate(end, 'end');
    if (startDate.getTime() >= endDate.getTime()) {
      throw new Error('start must be before end');
    }

    // BR-SIM-003: uma sala não pode ter duas reservas ativas sobrepostas.
    for (const booking of bookings.values()) {
      if (booking.roomId !== roomId || booking.status !== 'active') continue;
      const overlaps =
        startDate.getTime() < booking.end.getTime() &&
        endDate.getTime() > booking.start.getTime();
      if (overlaps) {
        throw new Error(
          `Room "${roomId}" already booked between ` +
            `${booking.start.toISOString()} and ${booking.end.toISOString()}`
        );
      }
    }

    const booking = {
      id: `BKG-${nextId++}`,
      roomId,
      userId,
      start: startDate,
      end: endDate,
      price,
      status: 'active',
      cancellation: null,
    };
    bookings.set(booking.id, booking);
    return booking;
  }

  /**
   * REQ-SIM-002 — cancela uma reserva ativa. Cancelamentos com menos de 24h
   * de antecedência do início da reserva estão sujeitos a taxa sobre o valor.
   */
  function cancelBooking({ bookingId, userId, userRole, now }) {
    const booking = bookings.get(bookingId);
    if (!booking) {
      throw new Error(`Booking "${bookingId}" not found`);
    }
    if (booking.status !== 'active') {
      throw new Error(`Booking "${bookingId}" is not active`);
    }

    const nowDate = toDate(now !== undefined ? now : new Date(), 'now');

    const msUntilStart = booking.start.getTime() - nowDate.getTime();
    const isLateCancellation = msUntilStart < LATE_CANCEL_WINDOW_MS;
    const fee = isLateCancellation
      ? Math.round(booking.price * LATE_CANCEL_FEE_RATE * 100) / 100
      : 0;

    booking.status = 'cancelled';
    booking.cancellation = {
      cancelledBy: userId,
      cancelledByRole: userRole || 'user',
      cancelledAt: nowDate,
      lateCancellation: isLateCancellation,
      fee,
    };

    return { bookingId: booking.id, status: booking.status, fee };
  }

  /**
   * REQ-SIM-004 — lista as reservas ativas de uma sala.
   */
  function listBookings(roomId) {
    const result = [];
    for (const booking of bookings.values()) {
      if (booking.roomId === roomId && booking.status === 'active') {
        result.push(booking);
      }
    }
    return result;
  }

  return { createBooking, cancelBooking, listBookings };
}

module.exports = { createBookingService };
