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
  workflowQuote: string;
  workflowOrder: string;
  workflowWork: string;
  workflowInvoice: string;
  workflowClosed: string;
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
  workflowQuote: 'Quote',
  workflowOrder: 'Order agreed',
  workflowWork: 'Work completed',
  workflowInvoice: 'Invoice raised',
  workflowClosed: 'Job closed',
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
    workflowOrder: 'Booking confirmed',
    workflowWork: 'Groom completed',
  },
  dog_walker: {
    client: 'Client',
    clients: 'Clients',
    job: 'Walk',
    jobs: 'Walks',
    quote: 'Quote',
    quotes: 'Quotes',
    siteNotes: 'Dog notes',
    serviceReminder: 'Next walk reminder',
    addJob: 'New walk',
    todaysJobs: "Today's walks",
    workflowQuote: 'Quote',
    workflowOrder: 'Walk booked',
    workflowWork: 'Walk completed',
    workflowInvoice: 'Invoice raised',
    workflowClosed: 'Walk closed',
  },
  dog_trainer: {
    client: 'Client',
    clients: 'Clients',
    job: 'Session',
    jobs: 'Sessions',
    quote: 'Quote',
    quotes: 'Quotes',
    siteNotes: 'Training notes',
    serviceReminder: 'Next session reminder',
    addJob: 'New session',
    todaysJobs: "Today's sessions",
    workflowQuote: 'Quote',
    workflowOrder: 'Session booked',
    workflowWork: 'Session completed',
    workflowInvoice: 'Invoice raised',
    workflowClosed: 'Training closed',
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

export const BUSINESS_TYPES: { id: BusinessType; label: string }[] = [
  { id: 'trades', label: 'Trades & Contractors' },
  { id: 'hair', label: 'Hairdresser / Barber' },
  { id: 'beauty', label: 'Hair & Beauty' },
  { id: 'pt', label: 'Personal Trainer' },
  { id: 'photographer', label: 'Photographer' },
  { id: 'dog_groomer', label: 'Dog Groomer' },
  { id: 'dog_walker', label: 'Dog Walker' },
  { id: 'dog_trainer', label: 'Dog Trainer' },
  { id: 'cleaning', label: 'Cleaning Business' },
  { id: 'gardening', label: 'Gardening & Landscaping' },
  { id: 'tutor', label: 'Tutor / Coach' },
  { id: 'mechanic', label: 'Mobile Mechanic' },
  { id: 'freelance', label: 'Freelance Services' },
  { id: 'property', label: 'Property Services' },
  { id: 'other', label: 'Other' },
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
  dog_walker: [
    { title: '30 minute walk', duration_minutes: 30, materials: 'Lead, waste bags', suggested_price: 15 },
    { title: 'Group walk (1 hour)', duration_minutes: 60, materials: 'Group walk, report card', suggested_price: 22 },
  ],
  dog_trainer: [
    { title: '1-to-1 training session', duration_minutes: 60, materials: 'Behaviour assessment, homework', suggested_price: 45 },
    { title: 'Puppy class', duration_minutes: 45, materials: 'Socialisation, basic commands', suggested_price: 35 },
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
