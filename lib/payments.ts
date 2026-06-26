import { supabase } from '@/lib/supabase';
import type { Payment, PaymentInsert } from '@/types/database';

export async function fetchPayments(userId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('paid_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function fetchPaymentsForCustomer(userId: string, customerId: string): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('paid_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createPayment(userId: string, payload: PaymentInsert): Promise<Payment> {
  const { data, error } = await supabase
    .from('payments')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deletePayment(userId: string, paymentId: string): Promise<void> {
  const { error } = await supabase.from('payments').delete().eq('user_id', userId).eq('id', paymentId);
  if (error) throw error;
}
