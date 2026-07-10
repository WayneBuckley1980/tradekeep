import { supabase } from '@/lib/supabase';
import type { Customer, CustomerInsert, CustomerUpdate, Profile } from '@/types/database';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function ensureProfile(userId: string): Promise<Profile> {
  const existing = await fetchProfile(userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from('profiles')
    .insert({ id: userId, subscription_tier: 'free', business_type: null, work_location: 'visit_customers', onboarding_completed: true })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function fetchCustomers(userId: string, includeArchived = false): Promise<Customer[]> {
  let query = supabase.from('customers').select('*').eq('user_id', userId);
  if (!includeArchived) {
    query = query.is('archived_at', null);
  }
  const { data, error } = await query
    .order('follow_up_at', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function fetchCustomer(userId: string, customerId: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .eq('id', customerId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function countCustomers(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) throw error;
  return count ?? 0;
}

export async function createCustomer(
  userId: string,
  payload: Omit<CustomerInsert, 'user_id'>,
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(
  userId: string,
  customerId: string,
  payload: CustomerUpdate,
): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', customerId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCustomer(userId: string, customerId: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('user_id', userId)
    .eq('id', customerId);

  if (error) throw error;
}

export async function updateNotificationIds(
  userId: string,
  customerId: string,
  notification_ids: Customer['notification_ids'],
): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ notification_ids, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', customerId);

  if (error) throw error;
}

export async function updateProfile(
  userId: string,
  payload: Partial<
    Pick<
      Profile,
      | 'business_name'
      | 'business_phone'
      | 'business_email'
      | 'business_address_line1'
      | 'business_address_line2'
      | 'business_city'
      | 'business_postcode'
      | 'business_type'
      | 'work_location'
      | 'onboarding_completed'
    >
  >,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function exportUserData(userId: string) {
  const [customers, jobs, quotes, invoices, payments, tags] = await Promise.all([
    fetchCustomers(userId),
    supabase.from('jobs').select('*').eq('user_id', userId).then((r) => r.data ?? []),
    supabase.from('quotes').select('*').eq('user_id', userId).then((r) => r.data ?? []),
    supabase.from('invoices').select('*').eq('user_id', userId).then((r) => r.data ?? []),
    supabase.from('payments').select('*').eq('user_id', userId).then((r) => r.data ?? []),
    supabase.from('tags').select('*').eq('user_id', userId).then((r) => r.data ?? []),
  ]);

  return { exportedAt: new Date().toISOString(), customers, jobs, quotes, invoices, payments, tags };
}

export async function updateSubscriptionTier(
  userId: string,
  tier: Profile['subscription_tier'],
  expiresAt: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ subscription_tier: tier, subscription_expires_at: expiresAt })
    .eq('id', userId);

  if (error) throw error;
}
