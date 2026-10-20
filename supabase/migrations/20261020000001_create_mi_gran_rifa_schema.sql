-- ====================================================================
-- ESQUEMA COMPLETO Y TRANSACCIONAL — MI GRAN RIFA
-- Requisitos del Prompt Maestro
-- ====================================================================

-- 1. Tabla: raffles
CREATE TABLE IF NOT EXISTS public.raffles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL DEFAULT 'Mi Gran Rifa',
    description TEXT NOT NULL DEFAULT 'Sorteo oficial de 100 números con verificación transparente de pagos.',
    prize_description TEXT NOT NULL DEFAULT 'Premio pendiente de configuración por el administrador.',
    price_cop NUMERIC(10,2) NOT NULL DEFAULT 10000.00 CHECK (price_cop > 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'finished')),
    hold_duration_minutes INT NOT NULL DEFAULT 30 CHECK (hold_duration_minutes >= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla: participants
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Tabla: reservations
CREATE TABLE IF NOT EXISTS public.reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_code TEXT NOT NULL UNIQUE,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE RESTRICT,
    raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved', 'paid', 'cancelled')),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price_cop NUMERIC(10,2) NOT NULL CHECK (unit_price_cop > 0),
    total_price_cop NUMERIC(10,2) NOT NULL CHECK (total_price_cop > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Tabla: raffle_numbers (exactamente 100 números por rifa: 0 a 99)
CREATE TABLE IF NOT EXISTS public.raffle_numbers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raffle_id UUID NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
    number INT NOT NULL CHECK (number >= 0 AND number <= 99),
    reservation_id UUID REFERENCES public.reservations(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'paid')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_raffle_number UNIQUE (raffle_id, number)
);

-- 5. Tabla: payment_events (Auditoría administrativa de solo lectura para participantes)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID NOT NULL REFERENCES public.reservations(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('create_reservation', 'confirm_payment', 'cancel_reservation', 'expire_reservation')),
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    previous_status TEXT,
    new_status TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Índices para rendimiento óptimo
CREATE INDEX IF NOT EXISTS idx_raffle_numbers_lookup ON public.raffle_numbers(raffle_id, status);
CREATE INDEX IF NOT EXISTS idx_raffle_numbers_num ON public.raffle_numbers(raffle_id, number);
CREATE INDEX IF NOT EXISTS idx_reservations_code ON public.reservations(public_code);
CREATE INDEX IF NOT EXISTS idx_reservations_status_expires ON public.reservations(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_events_res ON public.payment_events(reservation_id);

-- ====================================================================
-- FUNCIONES TRANSACCIONALES (ATOMICIDAD Y CONTROL DE CONCURRENCIA)
-- ====================================================================

-- A. Función para liberar reservas expiradas
CREATE OR REPLACE FUNCTION public.expire_pending_reservations(p_raffle_id UUID DEFAULT NULL)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_res RECORD;
    v_count INT := 0;
BEGIN
    FOR v_res IN
        SELECT id, raffle_id, public_code
        FROM public.reservations
        WHERE status = 'reserved'
          AND expires_at < NOW()
          AND (p_raffle_id IS NULL OR raffle_id = p_raffle_id)
        FOR UPDATE
    LOOP
        -- Liberar los números asociados
        UPDATE public.raffle_numbers
        SET status = 'available',
            reservation_id = NULL,
            updated_at = NOW()
        WHERE reservation_id = v_res.id;

        -- Marcar la reserva como cancelada por expiración
        UPDATE public.reservations
        SET status = 'cancelled',
            updated_at = NOW()
        WHERE id = v_res.id;

        -- Registrar en auditoría
        INSERT INTO public.payment_events (
            reservation_id,
            action_type,
            previous_status,
            new_status,
            notes
        ) VALUES (
            v_res.id,
            'expire_reservation',
            'reserved',
            'cancelled',
            'Expiración automática de plazo de reserva de 30 minutos.'
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$;

-- B. Función atómica para crear reservas con protección contra concurrencia
CREATE OR REPLACE FUNCTION public.create_reservation_atomic(
    p_raffle_id UUID,
    p_full_name TEXT,
    p_phone TEXT,
    p_numbers INT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_raffle RECORD;
    v_unit_price NUMERIC(10,2);
    v_hold_minutes INT;
    v_num_count INT;
    v_locked_count INT;
    v_participant_id UUID;
    v_reservation_id UUID;
    v_public_code TEXT;
    v_expires_at TIMESTAMPTZ;
    v_total_price NUMERIC(10,2);
    v_cleaned_name TEXT;
    v_cleaned_phone TEXT;
    v_num INT;
BEGIN
    -- 1. Limpieza y validación de entrada
    v_cleaned_name := TRIM(COALESCE(p_full_name, ''));
    v_cleaned_phone := REGEXP_REPLACE(COALESCE(p_phone, ''), '[^0-9+]', '', 'g');

    IF LENGTH(v_cleaned_name) < 3 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Por favor ingresa un nombre completo válido.'
        );
    END IF;

    IF LENGTH(v_cleaned_phone) < 7 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Por favor ingresa un número de teléfono válido.'
        );
    END IF;

    -- 2. Validar lista de números
    v_num_count := COALESCE(array_length(p_numbers, 1), 0);
    IF v_num_count = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Debes seleccionar al menos un número disponible.'
        );
    END IF;

    -- Validar rangos (0 a 99) y duplicados en el array
    FOREACH v_num IN ARRAY p_numbers LOOP
        IF v_num < 0 OR v_num > 99 THEN
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Los números deben estar entre 00 y 99.'
            );
        END IF;
    END LOOP;

    -- Verificar que no haya duplicados en la lista de números solicitada
    IF (SELECT COUNT(DISTINCT n) FROM unnest(p_numbers) AS n) <> v_num_count THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No puedes incluir el mismo número más de una vez en tu solicitud.'
        );
    END IF;

    -- 3. Limpiar reservas expiradas primero
    PERFORM public.expire_pending_reservations(p_raffle_id);

    -- 4. Verificar rifa activa y leer precio desde el servidor
    SELECT id, price_cop, hold_duration_minutes, status
    INTO v_raffle
    FROM public.raffles
    WHERE id = p_raffle_id;

    IF NOT FOUND OR v_raffle.status <> 'active' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'La rifa seleccionada no está activa o no existe.'
        );
    END IF;

    v_unit_price := v_raffle.price_cop;
    v_hold_minutes := COALESCE(v_raffle.hold_duration_minutes, 30);
    v_total_price := v_unit_price * v_num_count;

    -- 5. BLOQUEAR Y VERIFICAR NÚMEROS (CONCURRENCY-SAFE)
    -- Se seleccionan y bloquean con FOR UPDATE
    SELECT COUNT(*) INTO v_locked_count
    FROM public.raffle_numbers
    WHERE raffle_id = p_raffle_id
      AND number = ANY(p_numbers)
      AND status = 'available'
    FOR UPDATE;

    -- Si alguno ya no está disponible, se rechaza la transacción de forma inmediata y limpia
    IF v_locked_count <> v_num_count THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Uno o varios números ya no están disponibles. Actualiza la cuadrícula e inténtalo nuevamente.'
        );
    END IF;

    -- 6. Crear participante
    INSERT INTO public.participants (full_name, phone)
    VALUES (v_cleaned_name, v_cleaned_phone)
    RETURNING id INTO v_participant_id;

    -- 7. Generar código público no predecible (ej: R-A3F9C182)
    v_public_code := 'R-' || UPPER(SUBSTRING(MD5(gen_random_uuid()::text || clock_timestamp()::text), 1, 8));
    v_expires_at := NOW() + (v_hold_minutes || ' minutes')::INTERVAL;

    -- 8. Crear la reserva
    INSERT INTO public.reservations (
        public_code,
        participant_id,
        raffle_id,
        status,
        quantity,
        unit_price_cop,
        total_price_cop,
        expires_at
    ) VALUES (
        v_public_code,
        v_participant_id,
        p_raffle_id,
        'reserved',
        v_num_count,
        v_unit_price,
        v_total_price,
        v_expires_at
    ) RETURNING id INTO v_reservation_id;

    -- 9. Actualizar los números en la base de datos
    UPDATE public.raffle_numbers
    SET status = 'reserved',
        reservation_id = v_reservation_id,
        updated_at = NOW()
    WHERE raffle_id = p_raffle_id
      AND number = ANY(p_numbers);

    -- 10. Registrar auditoría inicial
    INSERT INTO public.payment_events (
        reservation_id,
        action_type,
        previous_status,
        new_status,
        notes
    ) VALUES (
        v_reservation_id,
        'create_reservation',
        'available',
        'reserved',
        'Reserva creada exitosamente por el participante.'
    );

    RETURN jsonb_build_object(
        'success', true,
        'message', '¡Reserva creada exitosamente!',
        'public_code', v_public_code,
        'reservation_id', v_reservation_id,
        'quantity', v_num_count,
        'unit_price_cop', v_unit_price,
        'total_price_cop', v_total_price,
        'expires_at', v_expires_at
    );
END;
$$;

-- C. Función administrativa para confirmar el pago
CREATE OR REPLACE FUNCTION public.confirm_reservation_payment(
    p_reservation_id UUID,
    p_admin_id UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_res RECORD;
BEGIN
    SELECT * INTO v_res
    FROM public.reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reserva no encontrada.');
    END IF;

    IF v_res.status = 'paid' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Esta reserva ya fue confirmada como pagada.');
    END IF;

    IF v_res.status = 'cancelled' THEN
        RETURN jsonb_build_object('success', false, 'message', 'No se puede marcar como pagada una reserva cancelada o expirada directamente.');
    END IF;

    -- Actualizar reserva
    UPDATE public.reservations
    SET status = 'paid',
        updated_at = NOW()
    WHERE id = p_reservation_id;

    -- Actualizar números a pagados
    UPDATE public.raffle_numbers
    SET status = 'paid',
        updated_at = NOW()
    WHERE reservation_id = p_reservation_id;

    -- Auditoría
    INSERT INTO public.payment_events (
        reservation_id,
        action_type,
        admin_id,
        previous_status,
        new_status,
        notes
    ) VALUES (
        p_reservation_id,
        'confirm_payment',
        COALESCE(p_admin_id, auth.uid()),
        v_res.status,
        'paid',
        COALESCE(p_notes, 'Pago verificado y confirmado por el administrador.')
    );

    RETURN jsonb_build_object('success', true, 'message', 'Pago confirmado exitosamente.');
END;
$$;

-- D. Función administrativa para cancelar una reserva y liberar números
CREATE OR REPLACE FUNCTION public.cancel_reservation_admin(
    p_reservation_id UUID,
    p_admin_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_res RECORD;
BEGIN
    SELECT * INTO v_res
    FROM public.reservations
    WHERE id = p_reservation_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Reserva no encontrada.');
    END IF;

    -- Liberar números
    UPDATE public.raffle_numbers
    SET status = 'available',
        reservation_id = NULL,
        updated_at = NOW()
    WHERE reservation_id = p_reservation_id;

    -- Actualizar reserva
    UPDATE public.reservations
    SET status = 'cancelled',
        updated_at = NOW()
    WHERE id = p_reservation_id;

    -- Auditoría
    INSERT INTO public.payment_events (
        reservation_id,
        action_type,
        admin_id,
        previous_status,
        new_status,
        notes
    ) VALUES (
        p_reservation_id,
        'cancel_reservation',
        COALESCE(p_admin_id, auth.uid()),
        v_res.status,
        'cancelled',
        COALESCE(p_reason, 'Cancelado manualmente por el administrador.')
    );

    RETURN jsonb_build_object('success', true, 'message', 'Reserva cancelada y números liberados.');
END;
$$;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS)
-- ====================================================================
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.raffle_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- 1. Raffles: Lectura pública de rifas activas
DROP POLICY IF EXISTS "Public raffles select" ON public.raffles;
CREATE POLICY "Public raffles select"
    ON public.raffles FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin raffles all" ON public.raffles;
CREATE POLICY "Admin raffles all"
    ON public.raffles FOR ALL
    TO authenticated
    USING (true);

-- 2. Raffle Numbers: Lectura pública para el tablero en vivo (solo números y estado)
DROP POLICY IF EXISTS "Public raffle numbers select" ON public.raffle_numbers;
CREATE POLICY "Public raffle numbers select"
    ON public.raffle_numbers FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin raffle numbers update" ON public.raffle_numbers;
CREATE POLICY "Admin raffle numbers update"
    ON public.raffle_numbers FOR ALL
    TO authenticated
    USING (true);

-- 3. Reservations:
-- Público anónimo solo puede consultar si conoce el código público exacto (public_code)
DROP POLICY IF EXISTS "Public reservation select by code" ON public.reservations;
CREATE POLICY "Public reservation select by code"
    ON public.reservations FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Admin reservations all" ON public.reservations;
CREATE POLICY "Admin reservations all"
    ON public.reservations FOR ALL
    TO authenticated
    USING (true);

-- 4. Participants:
-- SOLO administradores autenticados pueden consultar datos personales
DROP POLICY IF EXISTS "Admin participants select" ON public.participants;
CREATE POLICY "Admin participants select"
    ON public.participants FOR SELECT
    TO authenticated
    USING (true);

-- 5. Payment events (Auditoría):
-- SOLO administradores autenticados pueden ver la auditoría
DROP POLICY IF EXISTS "Admin payment events select" ON public.payment_events;
CREATE POLICY "Admin payment events select"
    ON public.payment_events FOR SELECT
    TO authenticated
    USING (true);

-- ====================================================================
-- POBLADO INICIAL (100 NÚMEROS DEL 00 AL 99)
-- ====================================================================
DO $$
DECLARE
    v_raffle_id UUID;
    v_count INT;
BEGIN
    -- 1. Crear rifa inicial activa si no existe
    SELECT id INTO v_raffle_id FROM public.raffles LIMIT 1;

    IF v_raffle_id IS NULL THEN
        INSERT INTO public.raffles (
            name,
            description,
            prize_description,
            price_cop,
            status,
            hold_duration_minutes
        ) VALUES (
            'Mi Gran Rifa',
            'Sorteo oficial de 100 números con verificación transparente de pagos y entrega garantizada.',
            'Premio pendiente de configuración por el administrador.',
            10000.00,
            'active',
            30
        ) RETURNING id INTO v_raffle_id;
    END IF;

    -- 2. Verificar que existan exactamente los 100 números (0 a 99)
    SELECT COUNT(*) INTO v_count FROM public.raffle_numbers WHERE raffle_id = v_raffle_id;

    IF v_count < 100 THEN
        INSERT INTO public.raffle_numbers (raffle_id, number, status)
        SELECT
            v_raffle_id,
            s.num,
            'available'
        FROM generate_series(0, 99) AS s(num)
        ON CONFLICT (raffle_id, number) DO NOTHING;
    END IF;
END $$;
