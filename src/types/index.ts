export type TicketStatus = 'available' | 'reserved' | 'paid';

export interface Raffle {
  id: string;
  title: string;
  description: string;
  ticket_price: number;
  total_numbers: number;
  prize_title: string;
  prize_image_url: string;
  draw_date: string;
  status: 'draft' | 'active' | 'paused' | 'finished';
  winning_number?: string | null;
  terms?: string;
  created_at?: string;
}

export interface Ticket {
  id: string;
  raffle_id: string;
  number: string;
  status: TicketStatus;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  payment_reference?: string | null;
  payment_proof_url?: string | null;
  reserved_at?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
  updated_at?: string | null;
}

export interface ReservationRequest {
  raffle_id: string;
  number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  payment_reference?: string;
  hold_minutes?: number;
}

export interface ReservationResult {
  success: boolean;
  message: string;
  ticket_id?: string;
  number?: string;
  expires_at?: string;
}

export interface RaffleStats {
  total: number;
  available: number;
  reserved: number;
  paid: number;
  totalRaised: number;
  potentialTotal: number;
  percentageSold: number;
}
