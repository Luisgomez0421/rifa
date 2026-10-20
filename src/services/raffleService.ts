import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Raffle, Ticket, ReservationRequest, ReservationResult } from '../types';

const STORAGE_KEY_RAFFLE = 'mi_gran_rifa_mock_raffle_v1';
const STORAGE_KEY_TICKETS = 'mi_gran_rifa_mock_tickets_v1';

const DEFAULT_MOCK_RAFFLE: Raffle = {
  id: 'mock-raffle-001',
  title: 'Gran Rifa Mi Gran Rifa - PlayStation 5',
  description: 'Participa por un PlayStation 5 con 2 juegos o $3,500,000 COP en efectivo. Elige tus números de la suerte.',
  ticket_price: 20000,
  total_numbers: 100,
  prize_title: 'PlayStation 5 Slim + 2 Juegos o Efectivo',
  prize_image_url: 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80',
  draw_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
  status: 'active',
  terms: 'El sorteo se jugará con las 2 últimas cifras de la Lotería de Medellín una vez se complete el 100% de los números.',
};

const initMockTickets = (raffleId: string): Ticket[] => {
  const tickets: Ticket[] = [];
  for (let i = 0; i < 100; i++) {
    const num = i.toString().padStart(2, '0');
    // Pre-seed some mock statuses so the UI looks active in demo mode
    let status: 'available' | 'reserved' | 'paid' = 'available';
    let customer_name: string | null = null;
    let customer_phone: string | null = null;
    let reserved_at: string | null = null;
    let expires_at: string | null = null;
    let paid_at: string | null = null;

    if (i === 7 || i === 23 || i === 88) {
      status = 'paid';
      customer_name = 'Carlos Mendoza';
      customer_phone = '3001234567';
      paid_at = new Date().toISOString();
    } else if (i === 15 || i === 42) {
      status = 'reserved';
      customer_name = 'Ana Morales';
      customer_phone = '3119876543';
      reserved_at = new Date().toISOString();
      expires_at = new Date(Date.now() + 12 * 60 * 1000).toISOString();
    }

    tickets.push({
      id: `mock-ticket-${num}`,
      raffle_id: raffleId,
      number: num,
      status,
      customer_name,
      customer_phone,
      reserved_at,
      expires_at,
      paid_at,
    });
  }
  return tickets;
};

// Obtener la rifa activa
export const getActiveRaffle = async (): Promise<Raffle> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('raffles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn('Error al consultar rifa en Supabase, usando fallback local:', error.message);
      } else if (data) {
        return data as Raffle;
      }
    } catch (e) {
      console.warn('Fallo de conexión en Supabase:', e);
    }
  }

  // Fallback a localStorage / Demo
  const saved = localStorage.getItem(STORAGE_KEY_RAFFLE);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // Ignorar error de parseo
    }
  }
  localStorage.setItem(STORAGE_KEY_RAFFLE, JSON.stringify(DEFAULT_MOCK_RAFFLE));
  return DEFAULT_MOCK_RAFFLE;
};

// Obtener los 100 números de la rifa
export const getTickets = async (raffleId: string): Promise<Ticket[]> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      // Primero intentar liberar boletos expirados si la función existe
      try {
        await supabase.rpc('release_expired_tickets', { p_raffle_id: raffleId });
      } catch {
        // Ignorar si la función aún no existe en BD
      }

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('raffle_id', raffleId)
        .order('number', { ascending: true });

      if (error) {
        console.warn('Error al consultar boletos en Supabase:', error.message);
      } else if (data && data.length > 0) {
        return data as Ticket[];
      }
    } catch (e) {
      console.warn('Fallo al obtener boletos de Supabase:', e);
    }
  }

  // Fallback demo local
  const saved = localStorage.getItem(STORAGE_KEY_TICKETS);
  let tickets: Ticket[] = [];
  if (saved) {
    try {
      tickets = JSON.parse(saved);
    } catch {
      tickets = [];
    }
  }

  if (tickets.length !== 100) {
    tickets = initMockTickets(raffleId);
    localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  } else {
    // Limpiar expirados en local
    const now = new Date();
    let updated = false;
    tickets = tickets.map((t) => {
      if (t.status === 'reserved' && t.expires_at && new Date(t.expires_at) < now) {
        updated = true;
        return {
          ...t,
          status: 'available',
          customer_name: null,
          customer_phone: null,
          customer_email: null,
          payment_reference: null,
          reserved_at: null,
          expires_at: null,
        };
      }
      return t;
    });
    if (updated) {
      localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
    }
  }

  return tickets;
};

// Reservar un número
export const reserveTicket = async (req: ReservationRequest): Promise<ReservationResult> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('reserve_ticket', {
        p_raffle_id: req.raffle_id,
        p_number: req.number,
        p_customer_name: req.customer_name,
        p_customer_email: req.customer_email,
        p_customer_phone: req.customer_phone,
        p_payment_reference: req.payment_reference || '',
        p_hold_minutes: req.hold_minutes || 15,
      });

      if (error) {
        return {
          success: false,
          message: error.message || 'Error al ejecutar reserva en Supabase',
        };
      }

      return data as ReservationResult;
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || 'Error de comunicación con Supabase',
      };
    }
  }

  // Modo Demo / Local
  const saved = localStorage.getItem(STORAGE_KEY_TICKETS);
  let tickets: Ticket[] = saved ? JSON.parse(saved) : initMockTickets(req.raffle_id);

  const ticketIndex = tickets.findIndex((t) => t.number === req.number);
  if (ticketIndex === -1) {
    return { success: false, message: `El número ${req.number} no existe.` };
  }

  const current = tickets[ticketIndex];
  const now = new Date();

  if (current.status === 'paid') {
    return { success: false, message: `El número ${req.number} ya fue pagado.` };
  }

  if (current.status === 'reserved' && current.expires_at && new Date(current.expires_at) > now) {
    return {
      success: false,
      message: `El número ${req.number} ya se encuentra reservado por otra persona.`,
    };
  }

  const expiresAt = new Date(Date.now() + (req.hold_minutes || 15) * 60 * 1000).toISOString();
  tickets[ticketIndex] = {
    ...current,
    status: 'reserved',
    customer_name: req.customer_name,
    customer_email: req.customer_email,
    customer_phone: req.customer_phone,
    payment_reference: req.payment_reference || '',
    reserved_at: now.toISOString(),
    expires_at: expiresAt,
  };

  localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));

  return {
    success: true,
    message: `Número ${req.number} reservado exitosamente.`,
    ticket_id: current.id,
    number: req.number,
    expires_at: expiresAt,
  };
};

// Confirmar pago de un boleto (Admin)
export const confirmTicketPayment = async (ticketId: string): Promise<{ success: boolean; message: string }> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('confirm_ticket_payment', {
        p_ticket_id: ticketId,
      });
      if (error) {
        // Fallback a UPDATE directo si el usuario no creó la función RPC
        const { error: updateErr } = await supabase
          .from('tickets')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', ticketId);
        if (updateErr) return { success: false, message: updateErr.message };
        return { success: true, message: 'Pago confirmado exitosamente.' };
      }
      return data as { success: boolean; message: string };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Error al confirmar pago' };
    }
  }

  // Demo Local
  const saved = localStorage.getItem(STORAGE_KEY_TICKETS);
  if (!saved) return { success: false, message: 'Boletos no encontrados' };

  let tickets: Ticket[] = JSON.parse(saved);
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return { success: false, message: 'Boleto no encontrado' };

  tickets[idx] = {
    ...tickets[idx],
    status: 'paid',
    paid_at: new Date().toISOString(),
  };

  localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  return { success: true, message: `Pago confirmado para el boleto ${tickets[idx].number}` };
};

// Liberar un boleto manualmente (Admin)
export const releaseTicket = async (ticketId: string): Promise<{ success: boolean; message: string }> => {
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase.rpc('release_ticket_admin', {
        p_ticket_id: ticketId,
      });
      if (error) {
        const { error: updateErr } = await supabase
          .from('tickets')
          .update({
            status: 'available',
            customer_name: null,
            customer_email: null,
            customer_phone: null,
            payment_reference: null,
            reserved_at: null,
            expires_at: null,
            paid_at: null,
          })
          .eq('id', ticketId);
        if (updateErr) return { success: false, message: updateErr.message };
        return { success: true, message: 'Boleto liberado correctamente.' };
      }
      return data as { success: boolean; message: string };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Error al liberar boleto' };
    }
  }

  // Demo Local
  const saved = localStorage.getItem(STORAGE_KEY_TICKETS);
  if (!saved) return { success: false, message: 'Boletos no encontrados' };

  let tickets: Ticket[] = JSON.parse(saved);
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) return { success: false, message: 'Boleto no encontrado' };

  tickets[idx] = {
    ...tickets[idx],
    status: 'available',
    customer_name: null,
    customer_email: null,
    customer_phone: null,
    payment_reference: null,
    reserved_at: null,
    expires_at: null,
    paid_at: null,
  };

  localStorage.setItem(STORAGE_KEY_TICKETS, JSON.stringify(tickets));
  return { success: true, message: `El número ${tickets[idx].number} ahora está disponible.` };
};
