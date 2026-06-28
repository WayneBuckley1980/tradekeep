import type { BusinessType, WorkLocationType } from '@/types/database';

export type Terminology = {
  client: string;
  clients: string;
  job: string;
  jobs: string;
  quote: string;
  quotes: string;
  appointment: string;
  session: string;
  booking: string;
  materials: string;
  siteNotes: string;
  serviceReminder: string;
  addJob: string;
  todaysJobs: string;
};

const BASE: Terminology = {
  client: 'Client',
  clients: 'Clients',
  job: 'Job',
  jobs: 'Jobs',
  quote: 'Quote',
  quotes: 'Quotes',
  appointment: 'Appointment',
  session: 'Session',
  booking: 'Booking',
  materials: 'Materials',
  siteNotes: 'Site notes',
  serviceReminder: 'Service reminder',
  addJob: 'New job',
  todaysJobs: "Today's jobs",
};

const MAP: Record<BusinessType, Partial<Terminology>> = {
  trades: {},
  hair: {
    job: 'Appointment',
    jobs: 'Appointments',
    materials: 'Products used',
    siteNotes: 'Colour notes',
    serviceReminder: 'Rebooking reminder',
    addJob: 'New appointment',
    todaysJobs: "Today's appointments",
  },
  beauty: {
    job: 'Appointment',
    jobs: 'Appointments',
    materials: 'Products used',
    siteNotes: 'Treatment notes',
    serviceReminder: 'Rebooking reminder',
    addJob: 'New appointment',
    todaysJobs: "Today's appointments",
  },
  pt: {
    job: 'Session',
    jobs: 'Sessions',
    siteNotes: 'Training notes',
    serviceReminder: 'Next session',
    addJob: 'New session',
    todaysJobs: "Today's sessions",
  },
  photographer: {
    job: 'Booking',
    jobs: 'Bookings',
    siteNotes: 'Shoot notes',
    serviceReminder: 'Delivery reminder',
    addJob: 'New booking',
    todaysJobs: 'Upcoming shoots',
  },
  dog_groomer: {
    job: 'Groom',
    jobs: 'Grooms',
    siteNotes: 'Pet notes',
    serviceReminder: 'Next groom reminder',
    addJob: 'New groom',
    todaysJobs: "Today's grooms",
  },
  cleaning: {
    job: 'Visit',
    jobs: 'Visits',
    siteNotes: 'Property notes',
    serviceReminder: 'Next visit',
    addJob: 'New visit',
    todaysJobs: "Today's visits",
  },
  gardening: {
    job: 'Visit',
    jobs: 'Visits',
    materials: 'Materials',
    siteNotes: 'Garden notes',
    addJob: 'New visit',
    todaysJobs: "Today's visits",
  },
  tutor: {
    client: 'Student',
    clients: 'Students',
    job: 'Lesson',
    jobs: 'Lessons',
    siteNotes: 'Lesson notes',
    addJob: 'New lesson',
    todaysJobs: "Today's lessons",
  },
  mechanic: {
    job: 'Service',
    jobs: 'Services',
    materials: 'Parts used',
    siteNotes: 'Vehicle notes',
    serviceReminder: 'Next service',
    addJob: 'New service',
    todaysJobs: "Today's services",
  },
  freelance: {
    job: 'Project',
    jobs: 'Projects',
    siteNotes: 'Project notes',
    addJob: 'New project',
    todaysJobs: 'Active projects',
  },
  property: {
    job: 'Job',
    siteNotes: 'Property notes',
    todaysJobs: "Today's jobs",
  },
  other: {},
};

export function getTerminology(businessType: BusinessType | null | undefined): Terminology {
  const overrides = MAP[businessType ?? 'trades'] ?? {};
  return { ...BASE, ...overrides };
}

export const BUSINESS_TYPES: { id: BusinessType; label: string; icon: string }[] = [
  { id: 'trades', label: 'Trades & Contractors', icon: '🔧' },
  { id: 'hair', label: 'Hairdresser / Barber', icon: '💇' },
  { id: 'beauty', label: 'Hair & Beauty', icon: '💄' },
  { id: 'pt', label: 'Personal Trainer', icon: '🏋️' },
  { id: 'photographer', label: 'Photographer', icon: '📸' },
  { id: 'dog_groomer', label: 'Dog Groomer', icon: '🐶' },
  { id: 'cleaning', label: 'Cleaning Business', icon: '🧹' },
  { id: 'gardening', label: 'Gardening & Landscaping', icon: '🌿' },
  { id: 'tutor', label: 'Tutor / Coach', icon: '🎓' },
  { id: 'mechanic', label: 'Mobile Mechanic', icon: '🚗' },
  { id: 'freelance', label: 'Freelance Services', icon: '📱' },
  { id: 'property', label: 'Property Services', icon: '🏠' },
  { id: 'other', label: 'Other', icon: '📦' },
];

export const WORK_LOCATIONS: { id: WorkLocationType; label: string }[] = [
  { id: 'visit_customers', label: 'I visit customers' },
  { id: 'customers_visit', label: 'Customers visit me' },
  { id: 'both', label: 'I do both' },
  { id: 'online', label: 'I work online' },
];

export const DEFAULT_JOB_TEMPLATES: Record<BusinessType, { title: string; duration_minutes: number; materials: string; suggested_price: number }[]> = {
  trades: [
    { title: 'Kitchen tap replacement', duration_minutes: 90, materials: 'Tap, flexi hoses, PTFE tape', suggested_price: 180 },
    { title: 'Consumer unit inspection', duration_minutes: 120, materials: 'Testing equipment', suggested_price: 250 },
  ],
  hair: [
    { title: "Women's cut", duration_minutes: 60, materials: 'Wash, cut, blow dry', suggested_price: 45 },
  ],
  beauty: [
    { title: 'Facial treatment', duration_minutes: 75, materials: 'Cleanser, mask, moisturiser', suggested_price: 65 },
  ],
  pt: [
    { title: '60 minute session', duration_minutes: 60, materials: 'Warm-up, strength, cardio, cooldown', suggested_price: 40 },
  ],
  photographer: [
    { title: 'Portrait shoot', duration_minutes: 120, materials: 'Location, editing, gallery delivery', suggested_price: 350 },
  ],
  dog_groomer: [
    { title: 'Full groom', duration_minutes: 90, materials: 'Wash, cut, nails', suggested_price: 55 },
  ],
  cleaning: [
    { title: 'Regular clean', duration_minutes: 120, materials: 'Standard cleaning products', suggested_price: 80 },
  ],
  gardening: [
    { title: 'Garden maintenance', duration_minutes: 180, materials: 'Tools, green waste disposal', suggested_price: 120 },
  ],
  tutor: [
    { title: '1 hour lesson', duration_minutes: 60, materials: 'Materials, homework review', suggested_price: 35 },
  ],
  mechanic: [
    { title: 'Full service', duration_minutes: 120, materials: 'Oil, filter, checks', suggested_price: 150 },
  ],
  freelance: [
    { title: 'Consultation', duration_minutes: 60, materials: 'Discovery, notes', suggested_price: 100 },
  ],
  property: [
    { title: 'Property inspection', duration_minutes: 90, materials: 'Checklist, photos', suggested_price: 120 },
  ],
  other: [
    { title: 'Standard job', duration_minutes: 60, materials: '', suggested_price: 100 },
  ],
};
