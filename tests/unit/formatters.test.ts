import { describe, it, expect } from 'vitest';
import { formatTwoDigits, formatCOP, getMinutesAndSecondsLeft } from '../../src/utils/formatters';

describe('Formatters Utility Suite', () => {
  describe('formatTwoDigits (Requisito estricto de dos dígitos 00-99)', () => {
    it('formatea 0 como "00"', () => {
      expect(formatTwoDigits(0)).toBe('00');
    });

    it('formatea 7 como "07"', () => {
      expect(formatTwoDigits(7)).toBe('07');
    });

    it('formatea 9 como "09"', () => {
      expect(formatTwoDigits(9)).toBe('09');
    });

    it('formatea 10 como "10"', () => {
      expect(formatTwoDigits(10)).toBe('10');
    });

    it('formatea 25 como "25"', () => {
      expect(formatTwoDigits(25)).toBe('25');
    });

    it('formatea 99 como "99"', () => {
      expect(formatTwoDigits(99)).toBe('99');
    });

    it('nunca devuelve un número sin ceros iniciales si es menor a 10', () => {
      for (let i = 0; i < 10; i++) {
        const formatted = formatTwoDigits(i);
        expect(formatted).toHaveLength(2);
        expect(formatted.startsWith('0')).toBe(true);
      }
    });

    it('maneja cadenas numéricas de entrada', () => {
      expect(formatTwoDigits('5')).toBe('05');
      expect(formatTwoDigits('42')).toBe('42');
    });
  });

  describe('formatCOP (Moneda Colombiana)', () => {
    it('formatea correctamente 10.000 COP', () => {
      const result = formatCOP(10000);
      expect(result).toContain('10.000');
      expect(result).toContain('COP');
    });

    it('formatea múltiplos de 10.000 COP', () => {
      expect(formatCOP(30000)).toContain('30.000');
      expect(formatCOP(100000)).toContain('100.000');
    });
  });

  describe('getMinutesAndSecondsLeft', () => {
    it('calcula minutos y segundos restantes si no ha expirado', () => {
      const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const res = getMinutesAndSecondsLeft(future);
      expect(res.isExpired).toBe(false);
      expect(res.minutes).toBeGreaterThanOrEqual(9);
    });

    it('indica expiración si la fecha está en el pasado', () => {
      const past = new Date(Date.now() - 5000).toISOString();
      const res = getMinutesAndSecondsLeft(past);
      expect(res.isExpired).toBe(true);
      expect(res.minutes).toBe(0);
      expect(res.seconds).toBe(0);
    });
  });
});
