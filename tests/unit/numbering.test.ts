import { describe, it, expect, beforeEach } from 'vitest';
import { getRaffleNumbers, getActiveRaffle } from '../../src/services/raffleService';
import { formatTwoDigits } from '../../src/utils/formatters';

describe('Pruebas Obligatorias de Numeración y Visualización (Sección 16)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('existen exactamente los 100 números en la rifa', async () => {
    const raffle = await getActiveRaffle();
    const numbers = await getRaffleNumbers(raffle.id);

    expect(numbers).toHaveLength(100);
  });

  it('todos los números están entre 0 y 99 sin duplicados', async () => {
    const raffle = await getActiveRaffle();
    const numbers = await getRaffleNumbers(raffle.id);

    const values = numbers.map((n) => n.number);
    const uniqueValues = new Set(values);

    // Sin duplicados
    expect(uniqueValues.size).toBe(100);

    // Contiene el número 0 y el 99
    expect(values).toContain(0);
    expect(values).toContain(99);

    // Todos en rango
    values.forEach((v) => {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(99);
    });
  });

  it('se muestran correctamente los números con dos dígitos (00, 09, 99)', async () => {
    const raffle = await getActiveRaffle();
    const numbers = await getRaffleNumbers(raffle.id);

    const formattedStrings = numbers.map((n) => formatTwoDigits(n.number));

    expect(formattedStrings).toContain('00');
    expect(formattedStrings).toContain('01');
    expect(formattedStrings).toContain('09');
    expect(formattedStrings).toContain('10');
    expect(formattedStrings).toContain('25');
    expect(formattedStrings).toContain('99');

    formattedStrings.forEach((s) => {
      expect(s).toHaveLength(2);
      expect(/^[0-9]{2}$/.test(s)).toBe(true);
    });
  });

  it('el precio configurado por defecto es $10.000 COP', async () => {
    const raffle = await getActiveRaffle();
    expect(raffle.price_cop).toBe(10000);
  });
});
