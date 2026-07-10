import { router } from 'expo-router';

import { JobForm, JobFormValues } from '@/components/JobForm';
import { useAuth } from '@/contexts/AuthContext';
import { createJob, generateJobReference, syncLastAppointmentFromJob } from '@/lib/jobs';

export default function NewJobScreen() {
  const { user } = useAuth();

  const handleSubmit = async (values: JobFormValues) => {
    if (!user?.id) throw new Error('Not signed in');
    const job = await createJob(user.id, {
      customer_id: values.customer_id,
      reference: generateJobReference(),
      title: values.title.trim(),
      description: values.description.trim() || null,
      scheduled_at: values.scheduled_at.toISOString(),
      duration_minutes: values.duration_minutes ? Number(values.duration_minutes) : null,
      address_line1: values.address_line1.trim() || null,
      city: values.city.trim() || null,
      postcode: values.postcode.trim() || null,
      status: values.status,
      pipeline_status: 'lead',
      price: values.price.trim() ? Number(values.price) : null,
      materials: values.materials.trim() || null,
      notes: values.notes.trim() || null,
      visit_required: null,
      visit_at: null,
      start_at: null,
      work_completed_notes: null,
      additional_works: null,
      additional_materials: null,
      deleted_at: null,
      job_notification_ids: null,
      quote_id: null,
      property_id: null,
    });
    await syncLastAppointmentFromJob(user.id, job.customer_id, job);
    router.replace(`/job/${job.id}`);
  };

  if (!user?.id) return null;
  return <JobForm userId={user.id} onSubmit={handleSubmit} submitLabel="Create job" />;
}
