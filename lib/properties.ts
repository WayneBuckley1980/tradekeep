import { supabase } from '@/lib/supabase';
import type { Customer, Job, Property } from '@/types/database';

export function formatPropertyAddress(property: Pick<Property, 'address_line1' | 'city' | 'postcode'>): string {
  return [property.address_line1, property.city, property.postcode].filter(Boolean).join(', ');
}

export function jobAddressKey(job: Pick<Job, 'address_line1' | 'city' | 'postcode'>): string {
  return [job.address_line1, job.city, job.postcode].filter(Boolean).join('|').toLowerCase();
}

export async function fetchPropertiesForCustomer(userId: string, customerId: string): Promise<Property[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('user_id', userId)
    .eq('customer_id', customerId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function ensurePrimaryProperty(userId: string, customer: Customer): Promise<Property | null> {
  if (!customer.address_line1 && !customer.city && !customer.postcode) return null;

  const existing = await fetchPropertiesForCustomer(userId, customer.id);
  const primary = existing.find((p) => p.is_primary);
  if (primary) return primary;

  const { data, error } = await supabase
    .from('properties')
    .insert({
      user_id: userId,
      customer_id: customer.id,
      label: 'Primary',
      address_line1: customer.address_line1,
      address_line2: customer.address_line2,
      city: customer.city,
      postcode: customer.postcode,
      is_primary: true,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export type PropertyJobGroup = {
  property: Property | null;
  addressLabel: string;
  jobs: Job[];
};

export function groupJobsByProperty(jobs: Job[], properties: Property[]): PropertyJobGroup[] {
  const propertyMap = new Map(properties.map((p) => [p.id, p]));
  const groups = new Map<string, PropertyJobGroup>();

  for (const job of jobs) {
    const property = job.property_id ? propertyMap.get(job.property_id) ?? null : null;
    const key = property?.id ?? (jobAddressKey(job) || 'unknown');
    const addressLabel = property
      ? formatPropertyAddress(property) || property.label || 'Property'
      : [job.address_line1, job.city, job.postcode].filter(Boolean).join(', ') || 'No address';

    const existing = groups.get(key);
    if (existing) {
      existing.jobs.push(job);
    } else {
      groups.set(key, { property, addressLabel, jobs: [job] });
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.property?.is_primary) return -1;
    if (b.property?.is_primary) return 1;
    return a.addressLabel.localeCompare(b.addressLabel);
  });
}

export async function linkJobToProperty(userId: string, job: Job, customer: Customer): Promise<void> {
  if (job.property_id) return;
  const property = await ensurePrimaryProperty(userId, customer);
  if (!property) return;

  await supabase
    .from('jobs')
    .update({ property_id: property.id })
    .eq('user_id', userId)
    .eq('id', job.id);
}
