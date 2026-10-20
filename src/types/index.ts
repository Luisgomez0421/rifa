export type NumberStatus = 'available' | 'reserved' | 'paid';
export type ReservationStatus = 'reserved' | 'paid' | 'cancelled';
export type RaffleStatus = 'draft' | 'active' | 'paused' | 'finished';

export interface Raffle {
  id: string;
  name: string;
  description: string;
  prize_description: string;
  price_cop: number;
  status: RaffleStatus;
  hold_duration_minutes: number;
  created_at?: string;
  updated_at?: string;
}

export interface RaffleNumber {
  id: string;
  raffle_id: string;
  number: number; // 0 to 99
  status: NumberStatus;
  reservation_id?: string | null;
  updated_at?: string;
}

export interface Participant {
  id: string;
  full_name: string;
  phone: string;
  created_at?: string;
}

export interface Reservation {
  id: string;
  public_code: string;
  participant_id: string;
  raffle_id: string;
  status: ReservationStatus;
  quantity: number;
  unit_price_cop: number;
  total_price_cop: number;
  expires_at: string;
  created_at: string;
  updated_at?: string;
  // Joined participant data when available (admin view)
  participants?: Participant | null;
  // Associated numbers formatted as two-digit strings
  numbers?: string[];
}

export interface PaymentEvent {
  id: string;
  reservation_id: string;
  action_type: 'create_reservation' | 'confirm_payment' | 'cancel_reservation' | 'expire_reservation';
  admin_id?: string | null;
  previous_status?: string | null;
  new_status?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface ReservationRequest {
  raffle_id: string;
  full_name: string;
  phone: string;
  numbers: number[]; // e.g. [7, 24, 81]
}

export interface ReservationResponse {
  success: boolean;
  message: string;
  public_code?: string;
  reservation_id?: string;
  quantity?: number;
  unit_price_cop?: number;
  total_price_cop?: number;
  expires_at?: string;
}

export interface DashboardMetrics {
  totalNumbers: number; // 100
  availableCount: number;
  reservedCount: number;
  paidCount: number;
  reservationsCount: number;
  confirmedRevenue: number; // Paid
  pendingRevenue: number;   // Reserved
  occupancyPercent: number; // (paid + reserved) / 100 * 100
}
