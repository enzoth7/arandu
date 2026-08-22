-- Migration: Remove support role from institutional_accounts constraint
ALTER TABLE public.institutional_accounts
  DROP CONSTRAINT IF EXISTS institutional_accounts_role_check;

ALTER TABLE public.institutional_accounts
  ADD CONSTRAINT institutional_accounts_role_check
  CHECK (role IN ('administrator', 'verifier', 'moderator', 'facility_representative'));
