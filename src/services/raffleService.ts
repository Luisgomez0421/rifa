import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  Raffle,
  RaffleNumber,
  Reservation,
  ReservationRequest,
  ReservationResponse,
  DashboardMetrics,
} from '../types';

const STORAGE_KEY_RAFFLE = 'mi_gran_rifa_v2_raffle';
const STORAGE_KEY_NUMBERS = 'mi_gran_rifa_v2_numbers';
const STORAGE_KEY_RESERVATIONS = 'mi_gran_rifa_v2_reservations';

// Default initial active raffle
const DEFAULT_RAFFLE: Raffle = {
  id: 'mock-raffle-001',
  name: 'Mi Gran Rifa',
  description: 'Sorteo oficial de 100 números con verificación transparente de pagos.',
  prize_description: 'Premio pendiente de configuración por el administrador.',
  price_cop: 10000,
  status: 'active',
  hold_duration_minutes: 30,
};

// Initialize 100 numbers (0 to 99) in mock mode
const initMockNumbers = (raffleId: string): RaffleNumber[] => {
  const numbers: RaffleNumber[] = [];
  for (let i = 0; i < 100; i++) {
    numbers.push({
      id: `mock-num-${i}`,
      raffle_id: raffleId,
      number: i,
      status: 'available',
      reservation_id: null,
      updated_at: new Date().toISOString(),
    });
  }
  return numbers;
};

// 1. Obtener la Rifa Activa
export const getActiveRaffle = async (): Promise<Raffle> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return data as Raffle;
      }
    } catch (e) {
      console.warn('Fallo al obtener rifa de Supabase, usando almacenamiento local:', e);
    }
  }

  // Local fallback
  const saved = localStorage.getItem(STORAGE_KEY_RAFFLE);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  localStorage.setItem(STORAGE_KEY_RAFFLE, JSON.stringify(DEFAULT_RAFFLE));
  return DEFAULT_RAFFLE;
};

// 2. Obtener los 100 Números de la Rifa
export const getRaffleNumbers = async (raffleId: string): Promise<RaffleNumber[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      // Liberar expirados primero
      try {
        await supabase.rpc('expire_pending_reservations', { p_raffle_id: raffleId });
      } catch {}

      const { data, error } = await supabase
        .from('raffle_numbers')
        .select('*')
        .eq('raffle_id', raffleId)
        .order('number', { ascending: true });

      if (!error && data && data.length > 0) {
        return data as RaffleNumber[];
      }
    } catch (e) {
      console.warn('Fallo al obtener números de Supabase:', e);
    }
  }

  // Local fallback
  const saved = localStorage.getItem(STORAGE_KEY_NUMBERS);
  let numbers: RaffleNumber[] = [];
  if (saved) {
    try {
      numbers = JSON.parse(saved);
    } catch {}
  }

  if (numbers.length !== 100) {
    numbers = initMockNumbers(raffleId);
    localStorage.setItem(STORAGE_KEY_NUMBERS, JSON.stringify(numbers));
  } else {
    // Check local expirations
    const now = Date.now();
    const savedReservationsStr = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
    if (savedReservationsStr) {
      try {
        const reservations: Reservation[] = JSON.parse(savedReservationsStr);
        let changed = false;

        reservations.forEach((res) => {
          if (res.status === 'reserved' && new Date(res.expires_at).getTime() < now) {
            res.status = 'cancelled';
            changed = true;
            // Free associated numbers
            numbers = numbers.map((n) =>
              n.reservation_id === res.id ? { ...n, status: 'available', reservation_id: null } : n
            );
          }
        });

        if (changed) {
          localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));
          localStorage.setItem(STORAGE_KEY_NUMBERS, JSON.stringify(numbers));
        }
      } catch {}
    }
  }

  return numbers;
};

// Mutex to simulate database row-level locking (SELECT ... FOR UPDATE) in asynchronous mock environment
let mockReservationLock = Promise.resolve();

const acquireMockLock = async (): Promise<() => void> => {
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const currentLock = mockReservationLock;
  mockReservationLock = mockReservationLock.then(() => nextLock);
  await currentLock;
  return release!;
};

// 3. Crear Reserva Atómica (Múltiples Números, Protección de Concurrencia)
export const createReservationAtomic = async (
  req: ReservationRequest
): Promise<ReservationResponse> => {
  // 1. Validaciones inmediatas de entrada (iguales al RPC de PostgreSQL)
  const cleanName = (req.full_name || '').trim();
  const cleanPhone = (req.phone || '').replace(/[^0-9+]/g, '');

  if (cleanName.length < 3) {
    return { success: false, message: 'Por favor ingresa un nombre completo válido.' };
  }

  if (cleanPhone.length < 7 || cleanPhone.length > 15) {
    return { success: false, message: 'Por favor ingresa un número de teléfono válido.' };
  }

  if (!req.numbers || req.numbers.length === 0) {
    return { success: false, message: 'Debes seleccionar al menos un número disponible.' };
  }

  for (const num of req.numbers) {
    if (num < 0 || num > 99) {
      return { success: false, message: 'Los números deben estar entre 00 y 99.' };
    }
  }

  if (new Set(req.numbers).size !== req.numbers.length) {
    return {
      success: false,
      message: 'No puedes incluir el mismo número más de una vez en tu solicitud.',
    };
  }

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('create_reservation_atomic', {
        p_raffle_id: req.raffle_id,
        p_full_name: cleanName,
        p_phone: cleanPhone,
        p_numbers: req.numbers,
      });

      if (error) {
        return {
          success: false,
          message: error.message || 'Error al procesar la reserva en la base de datos.',
        };
      }

      return data as ReservationResponse;
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Error de red o comunicación con Supabase.',
      };
    }
  }

  // ================= Local Mock Simulator (Serialized with Row-Lock Equivalent) =================
  const releaseLock = await acquireMockLock();
  try {
    const numbersStr = localStorage.getItem(STORAGE_KEY_NUMBERS);
    let numbers: RaffleNumber[] = numbersStr ? JSON.parse(numbersStr) : initMockNumbers(req.raffle_id);

    // Verify all requested numbers are available
    for (const num of req.numbers) {
      const found = numbers.find((n) => n.number === num);
      if (!found || found.status !== 'available') {
        return {
          success: false,
          message: 'Uno o varios números ya no están disponibles. Actualiza la cuadrícula e inténtalo nuevamente.',
        };
      }
    }

    const raffle = await getActiveRaffle();
    const unitPrice = raffle.price_cop;
    const totalPrice = unitPrice * req.numbers.length;
    const holdMinutes = raffle.hold_duration_minutes || 30;
    const expiresAt = new Date(Date.now() + holdMinutes * 60 * 1000).toISOString();
    const publicCode = 'R-' + Math.random().toString(36).substring(2, 10).toUpperCase();
    const reservationId = 'res-' + Math.random().toString(36).substring(2, 10);

    const newReservation: Reservation = {
      id: reservationId,
      public_code: publicCode,
      participant_id: 'part-' + Math.random().toString(36).substring(2, 10),
      raffle_id: req.raffle_id,
      status: 'reserved',
      quantity: req.numbers.length,
      unit_price_cop: unitPrice,
      total_price_cop: totalPrice,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      participants: {
        id: 'part-' + Math.random().toString(36).substring(2, 10),
        full_name: cleanName,
        phone: cleanPhone,
      },
      numbers: req.numbers.map((n) => n.toString().padStart(2, '0')),
    };

    // Update numbers
    numbers = numbers.map((n) =>
      req.numbers.includes(n.number) ? { ...n, status: 'reserved', reservation_id: reservationId } : n
    );

    // Save reservations
    const resSaved = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
    const reservations: Reservation[] = resSaved ? JSON.parse(resSaved) : [];
    reservations.push(newReservation);

    localStorage.setItem(STORAGE_KEY_NUMBERS, JSON.stringify(numbers));
    localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));

    return {
      success: true,
      message: '¡Reserva creada exitosamente!',
      public_code: publicCode,
      reservation_id: reservationId,
      quantity: req.numbers.length,
      unit_price_cop: unitPrice,
      total_price_cop: totalPrice,
      expires_at: expiresAt,
    };
  } finally {
    releaseLock();
  }
};

// 4. Consultar Reserva por Código Público
export const getReservationByCode = async (publicCode: string): Promise<Reservation | null> => {
  const cleanCode = publicCode.trim().toUpperCase();

  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          participants (id, full_name, phone)
        `)
        .eq('public_code', cleanCode)
        .maybeSingle();

      if (!error && data) {
        // Query associated numbers
        const { data: numData } = await supabase
          .from('raffle_numbers')
          .select('number')
          .eq('reservation_id', data.id);

        const formattedNumbers = (numData || []).map((n: { number: number }) =>
          n.number.toString().padStart(2, '0')
        );

        return {
          ...data,
          numbers: formattedNumbers,
        } as Reservation;
      }
    } catch (e) {
      console.warn('Error al buscar reserva por código en Supabase:', e);
    }
  }

  // Local fallback
  const resSaved = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
  if (!resSaved) return null;
  try {
    const reservations: Reservation[] = JSON.parse(resSaved);
    const found = reservations.find((r) => r.public_code.toUpperCase() === cleanCode);
    return found || null;
  } catch {
    return null;
  }
};

// 5. Admin: Confirmar Pago de una Reserva
export const confirmReservationPayment = async (
  reservationId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('confirm_reservation_payment', {
        p_reservation_id: reservationId,
        p_notes: notes || 'Confirmado por el administrador desde el panel.',
      });

      if (error) return { success: false, message: error.message };
      return data as { success: boolean; message: string };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Error al confirmar pago' };
    }
  }

  // Local fallback
  const resSaved = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
  const numSaved = localStorage.getItem(STORAGE_KEY_NUMBERS);
  if (!resSaved || !numSaved) return { success: false, message: 'Datos no encontrados' };

  let reservations: Reservation[] = JSON.parse(resSaved);
  let numbers: RaffleNumber[] = JSON.parse(numSaved);

  const idx = reservations.findIndex((r) => r.id === reservationId);
  if (idx === -1) return { success: false, message: 'Reserva no encontrada' };

  reservations[idx].status = 'paid';
  reservations[idx].updated_at = new Date().toISOString();

  numbers = numbers.map((n) =>
    n.reservation_id === reservationId ? { ...n, status: 'paid', updated_at: new Date().toISOString() } : n
  );

  localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));
  localStorage.setItem(STORAGE_KEY_NUMBERS, JSON.stringify(numbers));

  return { success: true, message: 'Pago confirmado exitosamente.' };
};

// 6. Admin: Cancelar Reserva y Liberar Números
export const cancelReservationAdmin = async (
  reservationId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('cancel_reservation_admin', {
        p_reservation_id: reservationId,
        p_reason: reason || 'Cancelado por el administrador.',
      });

      if (error) return { success: false, message: error.message };
      return data as { success: boolean; message: string };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Error al cancelar reserva' };
    }
  }

  // Local fallback
  const resSaved = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
  const numSaved = localStorage.getItem(STORAGE_KEY_NUMBERS);
  if (!resSaved || !numSaved) return { success: false, message: 'Datos no encontrados' };

  let reservations: Reservation[] = JSON.parse(resSaved);
  let numbers: RaffleNumber[] = JSON.parse(numSaved);

  const idx = reservations.findIndex((r) => r.id === reservationId);
  if (idx === -1) return { success: false, message: 'Reserva no encontrada' };

  reservations[idx].status = 'cancelled';
  reservations[idx].updated_at = new Date().toISOString();

  numbers = numbers.map((n) =>
    n.reservation_id === reservationId ? { ...n, status: 'available', reservation_id: null } : n
  );

  localStorage.setItem(STORAGE_KEY_RESERVATIONS, JSON.stringify(reservations));
  localStorage.setItem(STORAGE_KEY_NUMBERS, JSON.stringify(numbers));

  return { success: true, message: 'Reserva cancelada y números liberados correctamente.' };
};

// 7. Admin: Métricas de Dashboard
export const getAdminMetrics = async (
  raffleId: string,
  numbers: RaffleNumber[]
): Promise<DashboardMetrics> => {
  let availableCount = 0;
  let reservedCount = 0;
  let paidCount = 0;

  numbers.forEach((n) => {
    if (n.status === 'available') availableCount++;
    else if (n.status === 'reserved') reservedCount++;
    else if (n.status === 'paid') paidCount++;
  });

  const raffle = await getActiveRaffle();
  const unitPrice = raffle.price_cop;
  const confirmedRevenue = paidCount * unitPrice;
  const pendingRevenue = reservedCount * unitPrice;
  const occupancyPercent = Math.round(((paidCount + reservedCount) / 100) * 100);

  // Reservations count
  let reservationsCount = 0;
  if (isSupabaseConfigured() && supabase) {
    try {
      const { count } = await supabase
        .from('reservations')
        .select('*', { count: 'exact', head: true })
        .eq('raffle_id', raffleId);
      reservationsCount = count || 0;
    } catch {}
  } else {
    const resSaved = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
    if (resSaved) {
      try {
        reservationsCount = JSON.parse(resSaved).length;
      } catch {}
    }
  }

  return {
    totalNumbers: 100,
    availableCount,
    reservedCount,
    paidCount,
    reservationsCount,
    confirmedRevenue,
    pendingRevenue,
    occupancyPercent,
  };
};

// 8. Admin: Listar todas las reservas
export const getAdminReservations = async (raffleId: string): Promise<Reservation[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('reservations')
        .select(`
          *,
          participants (id, full_name, phone)
        `)
        .eq('raffle_id', raffleId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        // Query assigned numbers for each
        const { data: allNums } = await supabase
          .from('raffle_numbers')
          .select('number, reservation_id')
          .eq('raffle_id', raffleId)
          .not('reservation_id', 'is', null);

        const numMap = new Map<string, string[]>();
        (allNums || []).forEach((row: { number: number; reservation_id: string }) => {
          if (!numMap.has(row.reservation_id)) {
            numMap.set(row.reservation_id, []);
          }
          numMap.get(row.reservation_id)!.push(row.number.toString().padStart(2, '0'));
        });

        return data.map((r: any) => ({
          ...r,
          numbers: numMap.get(r.id) || [],
        })) as Reservation[];
      }
    } catch (e) {
      console.warn('Error al obtener reservas admin de Supabase:', e);
    }
  }

  // Local fallback
  const resSaved = localStorage.getItem(STORAGE_KEY_RESERVATIONS);
  if (!resSaved) return [];
  try {
    return JSON.parse(resSaved);
  } catch {
    return [];
  }
};

// 9. Admin: Actualizar Configuración de la Rifa
export const updateRaffleSettings = async (
  raffleId: string,
  updates: Partial<Raffle>
): Promise<{ success: boolean; message: string }> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('raffles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', raffleId);

      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Configuración guardada exitosamente.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Error al actualizar configuración' };
    }
  }

  // Local fallback
  const saved = localStorage.getItem(STORAGE_KEY_RAFFLE);
  const current: Raffle = saved ? JSON.parse(saved) : DEFAULT_RAFFLE;
  const updated = { ...current, ...updates, updated_at: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY_RAFFLE, JSON.stringify(updated));
  return { success: true, message: 'Configuración guardada localmente.' };
};

// 10. Supabase Realtime Subscription Helper
export const subscribeToRaffleNumbers = (
  raffleId: string,
  onUpdate: () => void
): (() => void) => {
  if (!isSupabaseConfigured() || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel(`realtime-raffle-${raffleId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'raffle_numbers',
        filter: `raffle_id=eq.${raffleId}`,
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    if (supabase) {
      supabase.removeChannel(channel);
    }
  };
};
