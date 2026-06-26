export type SubscriptionTier = 'free' | 'pro';

export type NotificationIds = {
  week_before?: string;
  day_of?: string;
};

export type Profile = {
  id: string;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  last_appointment: string | null;
  amount_paid: number | null;
  follow_up_at: string | null;
  notification_ids: NotificationIds | null;
  created_at: string;
  updated_at: string;
};

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
  user_id?: string;
};

export type CustomerUpdate = Partial<
  Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>
>;
