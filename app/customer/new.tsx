import { router } from 'expo-router';

import { CustomerForm, CustomerFormValues } from '@/components/CustomerForm';
import { FREE_TIER_LIMIT } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import {
  countCustomers,
  createCustomer,
  updateCustomer,
  updateNotificationIds,
} from '@/lib/customers';
import {
  ensureNotificationPermissions,
  scheduleFollowUpNotifications,
} from '@/lib/notifications';

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function NewCustomerScreen() {
  const { user, isPro } = useAuth();

  const handleSubmit = async (values: CustomerFormValues) => {
    if (!user?.id) throw new Error('Not signed in');

    if (!isPro) {
      const count = await countCustomers(user.id);
      if (count >= FREE_TIER_LIMIT) {
        router.replace({ pathname: '/paywall', params: { reason: 'Free plan includes 10 clients.' } });
        throw new Error('Free tier limit reached');
      }
    }

    let customer = await createCustomer(user.id, {
      name: values.name.trim(),
      notes: values.notes.trim() || null,
      last_appointment: values.last_appointment,
      amount_paid: parseAmount(values.amount_paid),
      follow_up_at: values.follow_up_at,
      notification_ids: null,
    });

    if (values.follow_up_at) {
      const granted = await ensureNotificationPermissions();
      if (granted) {
        const notification_ids = await scheduleFollowUpNotifications(customer);
        customer = await updateCustomer(user.id, customer.id, { notification_ids });
      }
    }

    router.replace(`/customer/${customer.id}`);
  };

  return <CustomerForm onSubmit={handleSubmit} submitLabel="Add client" />;
}
