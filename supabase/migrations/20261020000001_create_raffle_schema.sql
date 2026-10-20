-- ====================================================================
-- MIGRACIÓN 1: ESTRUCTURA PRINCIPAL, 100 NÚMEROS Y RESERVAS SEGURAS
-- Proyecto: Mi Gran Rifa
-- ====================================================================

-- 1. Tabla de Rifas
CREATE TABLE IF NOT EXISTS public.raffles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT 'Gran Rifa - Mi Gran Rifa',
    description TEXT DEFAULT 'Participa por increíbles premios. Cada número tiene las mismas oportunidades de ganar.',
    ticket_price NUMERIC(10,2) NOT NULL DEFAULT 20000.00,
    total_numbers INT NOT NULL DEFAULT 100,
    prize_title TEXT NOT NULL DEFAULT 'Gran Premio en Efectivo / Moto 0KM',
    prize_image_url TEXT DEFAULT 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    draw_date TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'finished')),
    winning_number TEXT DEFAULT NULL,
    terms TEXT DEFAULT 'El sorteo se realizará con las últimas 2 cifras de la lotería principal una vez se vendan todos los números.',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de Boletos / Números (Tickets)
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
    number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'paid')),
    customer_name TEXT DEFAULT NULL,
    customer_email TEXT DEFAULT NULL,
    customer_phone TEXT DEFAULT NULL,
    payment_reference TEXT DEFAULT NULL,
    payment_proof_url TEXT DEFAULT NULL,
    reserved_at TIMESTAMPTZ DEFAULT NULL,
    expires_at TIMESTAMPTZ DEFAULT NULL,
    paid_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_ticket_number_per_raffle UNIQUE (raffle_id, number)
);

-- 3. Tabla de Administradores
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT DEFAULT 'Administrador',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Índices para optimización de consultas en tiempo real
CREATE INDEX IF NOT EXISTS idx_tickets_raffle_status ON public.tickets(raffle_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_number ON public.tickets(raffle_id, number);
CREATE INDEX IF NOT EXISTS idx_tickets_expires_at ON public.tickets(expires_at) WHERE status = 'reserved';

-- ====================================================================
-- FUNCIONES TRANSACCIONALES (A PRUEBA DE CONCURRENCIA)
-- ====================================================================

-- Función para liberar boletos cuya reserva ya expiró
CREATE OR REPLACE FUNCTION public.release_expired_tickets(p_raffle_id UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_released_count INT;
BEGIN
    UPDATE public.tickets
    SET status = 'available',
        customer_name = NULL,
        customer_email = NULL,
        customer_phone = NULL,
        payment_reference = NULL,
        payment_proof_url = NULL,
        reserved_at = NULL,
        expires_at = NULL,
        updated_at = NOW()
    WHERE status = 'reserved'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
      AND (p_raffle_id IS NULL OR raffle_id = p_raffle_id);

    GET DIAGNOSTICS v_released_count = ROW_COUNT;
    RETURN v_released_count;
END;
$$;

-- Función transaccional para reservar un número evitando doble reserva simultánea
CREATE OR REPLACE FUNCTION public.reserve_ticket(
    p_raffle_id UUID,
    p_number TEXT,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_payment_reference TEXT DEFAULT NULL,
    p_hold_minutes INT DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Limpiar reservas expiradas primero
    PERFORM public.release_expired_tickets(p_raffle_id);

    -- Bloquear la fila del boleto específicamente para evitar colisiones
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE raffle_id = p_raffle_id
      AND number = p_number
    FOR UPDATE;

    -- Validar si existe el número
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'El número ' || p_number || ' no existe en esta rifa.'
        );
    END IF;

    -- Validar si ya está pagado
    IF v_ticket.status = 'paid' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'El número ' || p_number || ' ya ha sido comprado y pagado.'
        );
    END IF;

    -- Validar si está reservado y la reserva aún no vence
    IF v_ticket.status = 'reserved' AND v_ticket.expires_at > v_now THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'El número ' || p_number || ' se encuentra actualmente reservado por otro participante.'
        );
    END IF;

    -- Calcular expiración (por defecto 15 minutos)
    v_expires_at := v_now + (p_hold_minutes || ' minutes')::INTERVAL;

    -- Realizar la reserva
    UPDATE public.tickets
    SET status = 'reserved',
        customer_name = TRIM(p_customer_name),
        customer_email = LOWER(TRIM(p_customer_email)),
        customer_phone = TRIM(p_customer_phone),
        payment_reference = TRIM(COALESCE(p_payment_reference, '')),
        reserved_at = v_now,
        expires_at = v_expires_at,
        updated_at = v_now
    WHERE id = v_ticket.id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Número ' || p_number || ' reservado con éxito.',
        'ticket_id', v_ticket.id,
        'number', p_number,
        'expires_at', v_expires_at
    );
END;
$$;

-- Función administrativa para confirmar el pago de un boleto
CREATE OR REPLACE FUNCTION public.confirm_ticket_payment(
    p_ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE id = p_ticket_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Boleto no encontrado.');
    END IF;

    UPDATE public.tickets
    SET status = 'paid',
        paid_at = NOW(),
        updated_at = NOW()
    WHERE id = p_ticket_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Pago confirmado para el boleto ' || v_ticket.number,
        'number', v_ticket.number
    );
END;
$$;

-- Función administrativa para liberar un boleto manualmente
CREATE OR REPLACE FUNCTION public.release_ticket_admin(
    p_ticket_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket RECORD;
BEGIN
    SELECT * INTO v_ticket
    FROM public.tickets
    WHERE id = p_ticket_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Boleto no encontrado.');
    END IF;

    UPDATE public.tickets
    SET status = 'available',
        customer_name = NULL,
        customer_email = NULL,
        customer_phone = NULL,
        payment_reference = NULL,
        payment_proof_url = NULL,
        reserved_at = NULL,
        expires_at = NULL,
        paid_at = NULL,
        updated_at = NOW()
    WHERE id = p_ticket_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'El boleto ' || v_ticket.number || ' ha sido liberado a estado disponible.'
    );
END;
$$;

-- ====================================================================
-- SEGURIDAD RLS (ROW LEVEL SECURITY)
-- ====================================================================
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Políticas para Rifas:
-- 1. Cualquiera puede ver rifas activas
DROP POLICY IF EXISTS "Permitir lectura publica de rifas activas" ON public.raffles;
CREATE POLICY "Permitir lectura publica de rifas activas"
    ON public.raffles FOR SELECT
    USING (true);

-- 2. Administradores autenticados pueden modificar rifas
DROP POLICY IF EXISTS "Permitir edicion a administradores" ON public.raffles;
CREATE POLICY "Permitir edicion a administradores"
    ON public.raffles FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- Políticas para Boletos (Tickets):
-- 1. Lectura pública (Permite ver el tablero de 100 números en vivo)
DROP POLICY IF EXISTS "Permitir lectura publica de boletos" ON public.tickets;
CREATE POLICY "Permitir lectura publica de boletos"
    ON public.tickets FOR SELECT
    USING (true);

-- 2. Control total a administradores autenticados
DROP POLICY IF EXISTS "Administradores tienen control total sobre boletos" ON public.tickets;
CREATE POLICY "Administradores tienen control total sobre boletos"
    ON public.tickets FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid()));

-- ====================================================================
-- POBLADO INICIAL: CREAR RIFA INICIAL Y SUS 100 NÚMEROS (00 AL 99)
-- ====================================================================
DO $$
DECLARE
    v_raffle_id UUID;
    v_count INT;
BEGIN
    -- Verificar si ya existe una rifa
    SELECT id INTO v_raffle_id FROM public.raffles LIMIT 1;

    IF v_raffle_id IS NULL THEN
        INSERT INTO public.raffles (
            title,
            description,
            ticket_price,
            total_numbers,
            prize_title,
            prize_image_url
        ) VALUES (
            'Gran Rifa Mi Gran Rifa - Edición Especial',
            '¡Elige tu número de la suerte entre 00 y 99! Reserva tu número y sube tu comprobante de pago.',
            20000.00,
            100,
            'PlayStation 5 + 2 Juegos o $3,500,000 en Efectivo',
            'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80'
        ) RETURNING id INTO v_raffle_id;
    END IF;

    -- Verificar cuántos boletos existen
    SELECT COUNT(*) INTO v_count FROM public.tickets WHERE raffle_id = v_raffle_id;

    -- Si no están los 100 números, crearlos del 00 al 99
    IF v_count < 100 THEN
        INSERT INTO public.tickets (raffle_id, number, status)
        SELECT
            v_raffle_id,
            LPAD(s.num::TEXT, 2, '0'),
            'available'
        FROM generate_series(0, 99) AS s(num)
        ON CONFLICT (raffle_id, number) DO NOTHING;
    END IF;
END $$;
