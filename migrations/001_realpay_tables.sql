-- Realpay Integration Tables
-- Migration: 001_realpay_tables.sql
-- Created: 2026-02-06

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: realpay_mandates
-- Tracks DebiCheck mandate status for each loan
-- ============================================
CREATE TABLE IF NOT EXISTS realpay_mandates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    
    -- Realpay reference identifiers
    mandate_reference TEXT UNIQUE NOT NULL,
    contract_reference TEXT,
    
    -- Mandate details
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'suspended')),
    amount DECIMAL(10,2) NOT NULL,
    collection_day INTEGER NOT NULL CHECK (collection_day BETWEEN 1 AND 28),
    
    -- Bank account details (encrypted reference, not actual numbers)
    bank_code TEXT,
    account_type TEXT CHECK (account_type IN ('savings', 'current', 'transmission')),
    
    -- Tracking
    retry_count INTEGER DEFAULT 0,
    last_error TEXT,
    approved_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast loan lookups
CREATE INDEX IF NOT EXISTS idx_realpay_mandates_loan_id ON realpay_mandates(loan_id);
CREATE INDEX IF NOT EXISTS idx_realpay_mandates_status ON realpay_mandates(status);

-- ============================================
-- Table: realpay_transactions
-- Records all financial transactions (collections, payouts)
-- ============================================
CREATE TABLE IF NOT EXISTS realpay_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mandate_id UUID REFERENCES realpay_mandates(id) ON DELETE SET NULL,
    loan_id UUID NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    
    -- Transaction type
    type TEXT NOT NULL CHECK (type IN ('collection', 'payout', 'refund', 'reversal')),
    
    -- Amount and status
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'retrying', 'cancelled')),
    
    -- Realpay references
    realpay_ref TEXT,
    batch_id TEXT,
    
    -- Failure handling
    failure_reason TEXT,
    failure_code TEXT,
    attempt_count INTEGER DEFAULT 1,
    max_attempts INTEGER DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    
    -- Settlement info
    settled_at TIMESTAMPTZ,
    settlement_ref TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for transaction queries
CREATE INDEX IF NOT EXISTS idx_realpay_transactions_loan_id ON realpay_transactions(loan_id);
CREATE INDEX IF NOT EXISTS idx_realpay_transactions_mandate_id ON realpay_transactions(mandate_id);
CREATE INDEX IF NOT EXISTS idx_realpay_transactions_status ON realpay_transactions(status);
CREATE INDEX IF NOT EXISTS idx_realpay_transactions_type ON realpay_transactions(type);
CREATE INDEX IF NOT EXISTS idx_realpay_transactions_created_at ON realpay_transactions(created_at DESC);

-- ============================================
-- Table: realpay_webhooks
-- Logs all incoming webhook events for audit/debugging
-- ============================================
CREATE TABLE IF NOT EXISTS realpay_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Event details
    event_type TEXT NOT NULL,
    event_id TEXT,  -- Realpay's unique event identifier
    
    -- Raw payload storage
    payload JSONB NOT NULL,
    headers JSONB,
    
    -- Processing status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    processing_error TEXT,
    
    -- Related entities (populated after processing)
    mandate_id UUID REFERENCES realpay_mandates(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES realpay_transactions(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for unprocessed webhooks
CREATE INDEX IF NOT EXISTS idx_realpay_webhooks_processed ON realpay_webhooks(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_realpay_webhooks_event_type ON realpay_webhooks(event_type);

-- ============================================
-- Table: realpay_avs_checks
-- Records account verification attempts
-- ============================================
CREATE TABLE IF NOT EXISTS realpay_avs_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    loan_id UUID REFERENCES loans(id) ON DELETE SET NULL,
    
    -- Verification details
    bank_code TEXT NOT NULL,
    account_number_hash TEXT NOT NULL,  -- Hashed for privacy
    id_number_hash TEXT NOT NULL,       -- Hashed for privacy
    
    -- Results
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'failed', 'mismatch')),
    match_score INTEGER,  -- Confidence score from Realpay
    
    -- Response details
    account_valid BOOLEAN,
    name_match BOOLEAN,
    id_match BOOLEAN,
    account_type TEXT,
    
    -- Error handling
    error_code TEXT,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_realpay_avs_checks_user_id ON realpay_avs_checks(user_id);

-- ============================================
-- Trigger: Update timestamps
-- ============================================
CREATE OR REPLACE FUNCTION update_realpay_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_realpay_mandates_updated_at
    BEFORE UPDATE ON realpay_mandates
    FOR EACH ROW EXECUTE FUNCTION update_realpay_updated_at();

CREATE TRIGGER trigger_realpay_transactions_updated_at
    BEFORE UPDATE ON realpay_transactions
    FOR EACH ROW EXECUTE FUNCTION update_realpay_updated_at();

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS
ALTER TABLE realpay_mandates ENABLE ROW LEVEL SECURITY;
ALTER TABLE realpay_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE realpay_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE realpay_avs_checks ENABLE ROW LEVEL SECURITY;

-- Admin can see all
CREATE POLICY "Admins can view all mandates" ON realpay_mandates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
        )
    );

CREATE POLICY "Admins can view all transactions" ON realpay_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
        )
    );

CREATE POLICY "Admins can view all webhooks" ON realpay_webhooks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.users.id = auth.uid()
            AND (auth.users.raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
        )
    );

-- Users can see their own AVS checks
CREATE POLICY "Users can view own AVS checks" ON realpay_avs_checks
    FOR SELECT USING (auth.uid() = user_id);

-- Service role bypass for API routes
CREATE POLICY "Service role full access mandates" ON realpay_mandates
    FOR ALL USING (auth.role() = 'service_role');
    
CREATE POLICY "Service role full access transactions" ON realpay_transactions
    FOR ALL USING (auth.role() = 'service_role');
    
CREATE POLICY "Service role full access webhooks" ON realpay_webhooks
    FOR ALL USING (auth.role() = 'service_role');
    
CREATE POLICY "Service role full access avs" ON realpay_avs_checks
    FOR ALL USING (auth.role() = 'service_role');
