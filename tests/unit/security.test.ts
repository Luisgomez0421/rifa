import { describe, it, expect } from 'vitest';
import { createReservationAtomic } from '../../src/services/raffleService';
import fs from 'fs';
import path from 'path';

describe('Pruebas de Seguridad y Protección de Datos (Sección 12 y 16)', () => {
  it('no existen claves secretas (service_role, contraseñas) en el código frontend versionado', () => {
    const envExamplePath = path.resolve(__dirname, '../../.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf-8');

    // Comprobar que no contenga claves secretas
    expect(content).not.toContain('service_role');
    expect(content).not.toContain('supabase_service_key');
    expect(content).toContain('VITE_SUPABASE_URL=');
    expect(content).toContain('VITE_SUPABASE_ANON_KEY=');
  });

  it('el formulario rechaza nombres inválidos o vacíos', async () => {
    const res = await createReservationAtomic({
      raffle_id: 'mock-raffle-001',
      full_name: 'A',
      phone: '3001234567',
      numbers: [1],
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('nombre');
  });

  it('el formulario rechaza teléfonos no numéricos o con menos de 7 dígitos', async () => {
    const res = await createReservationAtomic({
      raffle_id: 'mock-raffle-001',
      full_name: 'Juan Perez',
      phone: '123',
      numbers: [1],
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain('teléfono');
  });
});
