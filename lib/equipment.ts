import { supabase } from '@/lib/supabase';
import type { Equipment, EquipmentInsert, EquipmentServiceLog, EquipmentUpdate } from '@/types/database';

export async function fetchEquipmentForCustomer(userId: string, customerId: string): Promise<Equipment[]> {
  const { data, error } = await supabase
    .from('equipment')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('name', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function createEquipment(userId: string, payload: EquipmentInsert): Promise<Equipment> {
  const { data, error } = await supabase
    .from('equipment')
    .insert({ ...payload, user_id: userId })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateEquipment(
  userId: string,
  equipmentId: string,
  payload: EquipmentUpdate,
): Promise<Equipment> {
  const { data, error } = await supabase
    .from('equipment')
    .update(payload)
    .eq('user_id', userId)
    .eq('id', equipmentId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteEquipment(userId: string, equipmentId: string): Promise<void> {
  const { error } = await supabase.from('equipment').delete().eq('user_id', userId).eq('id', equipmentId);
  if (error) throw error;
}

export async function fetchServiceLog(userId: string, equipmentId: string): Promise<EquipmentServiceLog[]> {
  const { data, error } = await supabase
    .from('equipment_service_log')
    .select('*')
    .eq('user_id', userId)
    .eq('equipment_id', equipmentId)
    .order('serviced_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function logEquipmentService(
  userId: string,
  equipmentId: string,
  servicedAt: string,
  notes?: string | null,
  jobId?: string | null,
): Promise<EquipmentServiceLog> {
  const { data, error } = await supabase
    .from('equipment_service_log')
    .insert({
      user_id: userId,
      equipment_id: equipmentId,
      serviced_at: servicedAt,
      notes: notes ?? null,
      job_id: jobId ?? null,
    })
    .select('*')
    .single();

  if (error) throw error;

  await supabase
    .from('equipment')
    .update({ last_service_at: servicedAt })
    .eq('user_id', userId)
    .eq('id', equipmentId);

  return data;
}
