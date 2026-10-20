import { describe, it, expect, beforeEach } from 'vitest';
import {
  getActiveRaffle,
  getRaffleNumbers,
  createReservationAtomic,
} from '../../src/services/raffleService';

describe('Pruebas de Concurrencia y Bloqueo de Números (Sección 16)', () => {
  let raffleId: string;

  beforeEach(async () => {
    localStorage.clear();
    const raffle = await getActiveRaffle();
    raffleId = raffle.id;
    await getRaffleNumbers(raffleId);
  });

  it('dos participantes intentan reservar el mismo número simultáneamente: solo uno tiene éxito', async () => {
    const targetNumber = 37;

    // Disparar ambas promesas concurrentemente
    const request1 = createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Participante A',
      phone: '3001111111',
      numbers: [targetNumber],
    });

    const request2 = createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Participante B',
      phone: '3002222222',
      numbers: [targetNumber],
    });

    const [result1, result2] = await Promise.all([request1, request2]);

    const successes = [result1, result2].filter((r) => r.success);
    const failures = [result1, result2].filter((r) => !r.success);

    // Exactamente una solicitud tiene éxito
    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);

    // La fallida recibe un mensaje comprensible
    expect(failures[0].message).toContain('ya no están disponibles');

    // El número 37 queda asociado a una sola reserva
    const numbers = await getRaffleNumbers(raffleId);
    const num37 = numbers.find((n) => n.number === targetNumber);
    expect(num37?.status).toBe('reserved');
  });

  it('un participante no puede reservar números compartidos si otro participante ya tomó uno de ellos', async () => {
    // Solicitud 1: toma números [10, 11]
    const res1 = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Usuario 1',
      phone: '3001234567',
      numbers: [10, 11],
    });
    expect(res1.success).toBe(true);

    // Solicitud 2: intenta tomar [11, 12, 13] donde 11 ya está reservado
    const res2 = await createReservationAtomic({
      raffle_id: raffleId,
      full_name: 'Usuario 2',
      phone: '3007654321',
      numbers: [11, 12, 13],
    });

    expect(res2.success).toBe(false);
    expect(res2.message).toContain('ya no están disponibles');

    // Comprobar que 12 y 13 quedan DISPONIBLES y no fueron afectados
    const numbers = await getRaffleNumbers(raffleId);
    const num12 = numbers.find((n) => n.number === 12);
    const num13 = numbers.find((n) => n.number === 13);
    expect(num12?.status).toBe('available');
    expect(num13?.status).toBe('available');
  });
});
