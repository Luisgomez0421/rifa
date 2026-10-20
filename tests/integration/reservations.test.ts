import { describe, it, expect, beforeEach } from 'vitest';
import {
  getActiveRaffle,
  getRaffleNumbers,
  createReservationAtomic,
  getReservationByCode,
} from '../../src/services/raffleService';

describe('Pruebas Obligatorias de Reservas (Sección 16)', () => {
  let raffleId: string;

  beforeEach(async () => {
    localStorage.clear();
    const raffle = await getActiveRaffle();
    raffleId = raffle.id;
    await getRaffleNumbers(raffleId); // ensure initial 100 numbers
  });

  it('una persona puede reservar un número disponible', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Carlos Pérez',
      phone: '3001234567',
      numbers: [7],
    });

    expect(res.success).toBe(true);
    expect(res.public_code).toBeDefined();
    expect(res.quantity).toBe(1);
    expect(res.total_price_cop).toBe(10000);

    const numbers = await getRaffleNumbers(raffleId);
    const num7 = numbers.find((n) => n.number === 7);
    expect(num7?.status).toBe('reserved');
  });

  it('una persona puede reservar varios números disponibles a la vez', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Ana Gómez',
      phone: '3119876543',
      numbers: [12, 45, 88],
    });

    expect(res.success).toBe(true);
    expect(res.quantity).toBe(3);
    expect(res.total_price_cop).toBe(30000);

    const numbers = await getRaffleNumbers(raffleId);
    const reservedNums = numbers.filter((n) => [12, 45, 88].includes(n.number));
    expect(reservedNums).toHaveLength(3);
    reservedNums.forEach((n) => expect(n.status).toBe('reserved'));
  });

  it('no se puede reservar una lista vacía de números', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'David Ortiz',
      phone: '3205556677',
      numbers: [],
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('al menos un número');
  });

  it('no se puede reservar el mismo número dos veces en la misma solicitud', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'David Ortiz',
      phone: '3205556677',
      numbers: [5, 5],
    });

    // Validated in service or RPC
    expect(res.success).toBe(false);
  });

  it('no se aceptan números negativos ni superiores a 99', async () => {
    const resNegative = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Error Test',
      phone: '3001112233',
      numbers: [-1],
    });
    expect(resNegative.success).toBe(false);

    const resOver = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Error Test',
      phone: '3001112233',
      numbers: [100],
    });
    expect(resOver.success).toBe(false);
  });

  it('el precio se calcula exclusivamente en base al precio unitario del servidor ($10.000 COP)', async () => {
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Seguridad Precio',
      phone: '3009998877',
      numbers: [30, 31, 32, 33],
    });

    expect(res.success).toBe(true);
    // 4 números * $10.000 COP = $40.000 COP
    expect(res.total_price_cop).toBe(40000);
  });

  it('una reserva fallida no deja números parcialmente reservados', async () => {
    // Primero reservar el número 50
    await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Primer Comprador',
      phone: '3001112222',
      numbers: [50],
    });

    // Intentar reservar [51, 50, 52] donde 50 ya no está disponible
    const res = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Segundo Comprador',
      phone: '3003334444',
      numbers: [51, 50, 52],
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('ya no están disponibles');

    // Verificar que 51 y 52 SIGUEN DISPONIBLES (sin reservas parciales)
    const numbers = await getRaffleNumbers(raffleId);
    const num51 = numbers.find((n) => n.number === 51);
    const num52 = numbers.find((n) => n.number === 52);

    expect(num51?.status).toBe('available');
    expect(num52?.status).toBe('available');
  });

  it('se puede consultar una reserva válida mediante su public_code', async () => {
    const createRes = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Consulta Test',
      phone: '3007778899',
      numbers: [66],
    });

    expect(createRes.public_code).toBeDefined();

    const found = await getReservationByCode(createRes.public_code!);
    expect(found).not.toBeNull();
    expect(found?.public_code).toBe(createRes.public_code);
    expect(found?.status).toBe('reserved');
    expect(found?.total_price_cop).toBe(10000);
  });
});
