import { useCallback, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';

import { CustomerForm, CustomerFormValues } from '@/components/CustomerForm';
import { colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { fetchCustomer, updateCustomer } from '@/lib/customers';
import {
  cancelNotificationIds,
  ensureNotificationPermissions,
  scheduleFollowUpNotifications,
} from '@/lib/notifications';
import type { Customer } from '@/types/database';

function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id || !id) return;
      setLoading(true);
      fetchCustomer(user.id, id)
        .then(setCustomer)
        .catch(console.error)
        .finally(() => setLoading(false));
    }, [user?.id, id]),
  );

  const handleSubmit = async (values: CustomerFormValues) => {
    if (!user?.id || !customer) throw new Error('Client not found');

    await cancelNotificationIds(customer.notification_ids);

    let notification_ids = null;
    if (values.follow_up_at) {
      const granted = await ensureNotificationPermissions();
      if (granted) {
        notification_ids = await scheduleFollowUpNotifications({
          id: customer.id,
          name: values.name.trim(),
          follow_up_at: values.follow_up_at,
        });
      }
    }

    const updated = await updateCustomer(user.id, customer.id, {
      name: values.name.trim(),
      notes: values.notes.trim() || null,
      phone: values.phone.trim() || null,
      email: values.email.trim() || null,
      address_line1: values.address_line1.trim() || null,
      address_line2: values.address_line2.trim() || null,
      city: values.city.trim() || null,
      postcode: values.postcode.trim() || null,
      is_favourite: values.is_favourite,
      next_action: values.next_action.trim() || null,
      next_action_due_at: values.next_action_due_at,
      last_appointment: values.last_appointment,
      amount_paid: parseAmount(values.amount_paid),
      follow_up_at: values.follow_up_at,
      notification_ids,
    });

    router.replace(`/customer/${updated.id}`);
  };

  if (loading || !customer) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.textPrimary} />
      </View>
    );
  }

  return <CustomerForm initial={customer} onSubmit={handleSubmit} submitLabel="Save changes" />;
}
