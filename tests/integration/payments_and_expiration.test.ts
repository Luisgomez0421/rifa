import { describe, it, expect, beforeEach } from 'vitest';
import {
  getActiveRaffle,
  getRaffleNumbers,
  createReservationAtomic,
  confirmReservationPayment,
  cancelReservationAdmin,
} from '../../src/services/raffleService';

describe('Pruebas Obligatorias de Pagos y Expiración (Sección 16)', () => {
  let raffleId: string;

  beforeEach(async () => {
    localStorage.clear();
    const raffle = await getActiveRaffle();
    raffleId = raffle.id;
    await getRaffleNumbers(raffleId);
  });

  it('una reserva comienza en estado pendiente (reserved)', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Pendiente Test',
      phone: '3001234567',
      numbers: [14],
    });

    expect(res.success).toBe(true);

    const numbers = await getRaffleNumbers(raffleId);
    const num14 = numbers.find((n) => n.number === 14);
    expect(num14?.status).toBe('reserved');
  });

  it('un administrador puede confirmar el pago y pasar los números a pagados (paid)', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Pago Test',
      phone: '3001234567',
      numbers: [21, 22],
    });

    const confirmRes = await confirmReservationPayment(res.reservation_id!);
    expect(confirmRes.success).toBe(true);

    const numbers = await getRaffleNumbers(raffleId);
    const num21 = numbers.find((n) => n.number === 21);
    const num22 = numbers.find((n) => n.number === 22);

    expect(num21?.status).toBe('paid');
    expect(num22?.status).toBe('paid');
  });

  it('cancelar una reserva libera inmediatamente sus números a disponibles (available)', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Cancelar Test',
      phone: '3001234567',
      numbers: [77],
    });

    // Cancelar
    const cancelRes = await cancelReservationAdmin(res.reservation_id!, 'Comprobante no enviado');
    expect(cancelRes.success).toBe(true);

    const numbers = await getRaffleNumbers(raffleId);
    const num77 = numbers.find((n) => n.number === 77);
    expect(num77?.status).toBe('available');
    expect(num77?.reservation_id).toBeNull();
  });

  it('una reserva pendiente expirada libera sus números', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Expira Test',
      phone: '3001234567',
      numbers: [80],
    });

    expect(res.success).toBe(true);

    // Simular que pasaron los 30 minutos manipulando la fecha de expiración en localStorage
    const savedStr = localStorage.getItem('mi_gran_rifa_v2_reservations');
    const reservations = JSON.parse(savedStr!);
    reservations[0].expires_at = new Date(Date.now() - 60000).toISOString(); // 1 minuto en el pasado
    localStorage.setItem('mi_gran_rifa_v2_reservations', JSON.stringify(reservations));

    // Al consultar nuevamente los números, la función de expiración automática debe liberarlo
    const numbers = await getRaffleNumbers(raffleId);
    const num80 = numbers.find((n) => n.number === 80);
    expect(num80?.status).toBe('available');
  });

  it('una reserva pagada NUNCA se libera automáticamente por expiración', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Pagado Inmune Test',
      phone: '3001234567',
      numbers: [95],
    });

    // Confirmar pago
    await confirmReservationPayment(res.reservation_id!);

    // Manipular expiración al pasado
    const savedStr = localStorage.getItem('mi_gran_rifa_v2_reservations');
    const reservations = JSON.parse(savedStr!);
    reservations[0].expires_at = new Date(Date.now() - 60000).toISOString();
    localStorage.setItem('mi_gran_rifa_v2_reservations', JSON.stringify(reservations));

    // Consultar números: debe continuar como PAID
    const numbers = await getRaffleNumbers(raffleId);
    const num95 = numbers.find((n) => n.number === 95);
    expect(num95?.status).toBe('paid');
  });
});
