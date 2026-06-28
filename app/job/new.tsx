import { router } from 'expo-router';

import { JobForm, JobFormValues } from '@/components/JobForm';
import { useAuth } from '@/contexts/AuthContext';
import { createJob, syncLastAppointmentFromJob } from '@/lib/jobs';

export default function NewJobScreen() {
  const { user } = useAuth();

  const handleSubmit = async (values: JobFormValues) => {
    if (!user?.id) throw new Error('Not signed in');
    const job = await createJob(user.id, {
      customer_id: values.customer_id,
      title: values.title.trim(),
      description: values.description.trim() || null,
      scheduled_at: values.scheduled_at.toISOString(),
      duration_minutes: values.duration_minutes ? Number(values.duration_minutes) : null,
      address_line1: values.address_line1.trim() || null,
      city: values.city.trim() || null,
      postcode: values.postcode.trim() || null,
      status: values.status,
      price: values.price.trim() ? Number(values.price) : null,
      materials: values.materials.trim() || null,
      notes: values.notes.trim() || null,
      quote_id: null,
      property_id: null,
    });
    await syncLastAppointmentFromJob(user.id, job.customer_id, job);
    router.replace(`/job/${job.id}`);
  };

  if (!user?.id) return null;
  return <JobForm userId={user.id} onSubmit={handleSubmit} submitLabel="Create job" />;
}
