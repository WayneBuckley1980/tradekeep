export type SubscriptionTier = 'free' | 'pro';

export type NotificationIds = {
  week_before?: string;
  day_of?: string;
  next_action?: string;
};

export type JobStatus = 'upcoming' | 'in_progress' | 'completed' | 'cancelled';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type AttachmentKind = 'photo_before' | 'photo_after' | 'pdf' | 'other';

export type Profile = {
  id: string;
  subscription_tier: SubscriptionTier;
  subscription_expires_at: string | null;
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
  created_at: string;
};

export type Customer = {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  phone: string | null;
  email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  postcode: string | null;
  is_favourite: boolean;
  next_action: string | null;
  next_action_due_at: string | null;
  last_appointment: string | null;
  amount_paid: number | null;
  follow_up_at: string | null;
  notification_ids: NotificationIds | null;
  created_at: string;
  updated_at: string;
};

export type Job = {
  id: string;
  user_id: string;
  customer_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number | null;
  address_line1: string | null;
  city: string | null;
  postcode: string | null;
  status: JobStatus;
  price: number | null;
  materials: string | null;
  notes: string | null;
  quote_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Quote = {
  id: string;
  user_id: string;
  customer_id: string;
  job_id: string | null;
  reference: string | null;
  title: string;
  description: string | null;
  amount: number;
  status: QuoteStatus;
  valid_until: string | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  user_id: string;
  customer_id: string;
  job_id: string | null;
  quote_id: string | null;
  reference: string | null;
  title: string;
  amount: number;
  status: InvoiceStatus;
  due_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  customer_id: string;
  invoice_id: string | null;
  job_id: string | null;
  amount: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
  created_at: string;
};

export type Tag = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
};

export type Attachment = {
  id: string;
  user_id: string;
  customer_id: string | null;
  job_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  kind: AttachmentKind;
  storage_path: string;
  file_name: string | null;
  caption: string | null;
  created_at: string;
};

export type CustomerInsert = Omit<Customer, 'id' | 'created_at' | 'updated_at' | 'user_id'> & {
  user_id?: string;
};

export type CustomerUpdate = Partial<Omit<Customer, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type JobInsert = Omit<Job, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
export type JobUpdate = Partial<Omit<Job, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type QuoteInsert = Omit<Quote, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
export type QuoteUpdate = Partial<Omit<Quote, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'updated_at' | 'user_id'>;
export type InvoiceUpdate = Partial<Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;

export type PaymentInsert = Omit<Payment, 'id' | 'created_at' | 'user_id'>;

export type TimelineEntry = {
  id: string;
  type: 'job' | 'quote' | 'invoice' | 'payment' | 'note';
  title: string;
  subtitle?: string;
  amount?: number;
  date: string;
  status?: string;
};

export type CustomerSummary = {
  totalSpent: number;
  balanceOwing: number;
  lastJobTitle: string | null;
  lastJobDate: string | null;
};

export type MoneyStats = {
  outstanding: number;
  paidThisMonth: number;
  paidThisYear: number;
  averageJobValue: number;
};
