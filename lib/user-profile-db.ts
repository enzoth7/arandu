import { querySupabaseDatabase } from "./supabase-db";

export type AccountType = "personal" | "elepem";

export type UserProfile = {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  accountType: AccountType;
  createdAt?: string;
  updatedAt?: string;
};

type UserProfileRow = {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  account_type: AccountType;
  created_at: string;
  updated_at: string;
};

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!userId || userId.startsWith("temporary:")) return null;
  const rows = await querySupabaseDatabase<UserProfileRow>(
    `SELECT user_id, first_name, last_name, phone, account_type, created_at, updated_at
     FROM public.user_profiles
     WHERE user_id = $1
     LIMIT 1`,
    [userId]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    accountType: row.account_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function upsertUserProfile(profile: {
  userId: string;
  firstName: string;
  lastName: string;
  phone: string;
  accountType?: AccountType;
}): Promise<UserProfile | null> {
  if (!profile.userId || profile.userId.startsWith("temporary:")) return null;
  const accountType = profile.accountType === "elepem" ? "elepem" : "personal";
  const firstName = profile.firstName.trim().slice(0, 100);
  const lastName = profile.lastName.trim().slice(0, 100);
  const phone = profile.phone.trim().slice(0, 50);

  const rows = await querySupabaseDatabase<UserProfileRow>(
    `INSERT INTO public.user_profiles (user_id, first_name, last_name, phone, account_type, updated_at)
     VALUES ($1, $2, $3, $4, $5, now())
     ON CONFLICT (user_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       last_name = EXCLUDED.last_name,
       phone = EXCLUDED.phone,
       account_type = COALESCE(EXCLUDED.account_type, public.user_profiles.account_type),
       updated_at = now()
     RETURNING user_id, first_name, last_name, phone, account_type, created_at, updated_at`,
    [profile.userId, firstName, lastName, phone, accountType]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    accountType: row.account_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
