import type { BusinessType, QuoteDurationUnit, WorkLocationType } from '@/types/database';

export type QuoteLineItemDraft = {
  label: string;
  amount: string;
  durationQty: string;
  durationUnit: QuoteDurationUnit | '';
};

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
  serviceExample: string;
  clientNotesExample: string;
  jobAddressPlaceholder: string;
  workCompleted: string;
  additionalWorks: string;
  additionalMaterials: string;
  quoteDescriptionExample: string;
  defaultDurationUnit: QuoteDurationUnit;
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
  serviceExample: 'Bathroom refurbishment quote',
  clientNotesExample: 'Gate code, parking, access notes…',
  jobAddressPlaceholder: 'Job address',
  workCompleted: 'Work completed',
  additionalWorks: 'Additional works',
  additionalMaterials: 'Materials used',
  quoteDescriptionExample: 'Scope of work and what is included',
  defaultDurationUnit: 'mins',
};

const MAP: Record<BusinessType, Partial<Terminology>> = {
  trades: {},
  hair: {
    job: 'Appointment',
    jobs: 'Appointments',
    materials: 'Products used',
    siteNotes: 'Colour & style notes',
    serviceReminder: 'Rebooking reminder',
    addJob: 'New appointment',
    todaysJobs: "Today's appointments",
    serviceExample: 'Cut and colour',
    clientNotesExample: 'Colour history, allergies, preferred style…',
    jobAddressPlaceholder: 'Salon or client address',
    additionalMaterials: 'Products used',
    quoteDescriptionExample: 'Services included and aftercare',
    defaultDurationUnit: 'mins',
  },
  beauty: {
    job: 'Appointment',
    jobs: 'Appointments',
    materials: 'Products used',
    siteNotes: 'Treatment notes',
    serviceReminder: 'Rebooking reminder',
    addJob: 'New appointment',
    todaysJobs: "Today's appointments",
    serviceExample: 'Facial and brow treatment',
    clientNotesExample: 'Skin type, sensitivities, patch test date…',
    jobAddressPlaceholder: 'Salon or client address',
    additionalMaterials: 'Products used',
    quoteDescriptionExample: 'Treatment plan and products included',
    defaultDurationUnit: 'mins',
  },
  pt: {
    job: 'Session',
    jobs: 'Sessions',
    siteNotes: 'Training notes',
    serviceReminder: 'Next session',
    addJob: 'New session',
    todaysJobs: "Today's sessions",
    serviceExample: '8-week training block',
    clientNotesExample: 'Injuries, goals, gym access…',
    jobAddressPlaceholder: 'Gym, park, or client address',
    workCompleted: 'Session summary',
    additionalWorks: 'Extra sessions',
    quoteDescriptionExample: 'Programme outline and session frequency',
    defaultDurationUnit: 'mins',
  },
  photographer: {
    job: 'Booking',
    jobs: 'Bookings',
    siteNotes: 'Shoot notes',
    serviceReminder: 'Delivery reminder',
    addJob: 'New booking',
    todaysJobs: 'Upcoming shoots',
    serviceExample: 'Family portrait shoot',
    clientNotesExample: 'Location ideas, shot list, wardrobe…',
    jobAddressPlaceholder: 'Shoot location',
    materials: 'Deliverables',
    additionalMaterials: 'Prints & licences',
    quoteDescriptionExample: 'Hours covered, editing, and delivery',
    defaultDurationUnit: 'days',
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
    serviceExample: 'Full groom for medium dog',
    clientNotesExample: 'Breed, temperament, skin issues…',
    jobAddressPlaceholder: 'Salon or mobile visit address',
    additionalMaterials: 'Coat treatments',
    quoteDescriptionExample: 'Groom package and coat condition notes',
    defaultDurationUnit: 'mins',
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
    materials: 'Extras',
    serviceExample: 'Weekly dog walking (5 walks)',
    clientNotesExample: 'Dog names, keys, vet contact, reactivity…',
    jobAddressPlaceholder: 'Pick-up address',
    workCompleted: 'Walk report',
    additionalWorks: 'Extra walks',
    additionalMaterials: 'Holiday cover',
    quoteDescriptionExample: 'Walk schedule, group or solo, pick-up times',
    defaultDurationUnit: 'weeks',
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
    serviceExample: '6-week puppy training course',
    clientNotesExample: 'Behaviour issues, goals, other pets…',
    jobAddressPlaceholder: 'Training location',
    workCompleted: 'Session notes',
    additionalWorks: 'Extra sessions',
    quoteDescriptionExample: 'Training plan, homework, and session length',
    defaultDurationUnit: 'weeks',
  },
  cleaning: {
    job: 'Visit',
    jobs: 'Visits',
    siteNotes: 'Property notes',
    serviceReminder: 'Next visit',
    addJob: 'New visit',
    todaysJobs: "Today's visits",
    serviceExample: 'Fortnightly house clean',
    clientNotesExample: 'Alarm codes, pets, priority rooms…',
    jobAddressPlaceholder: 'Property address',
    additionalMaterials: 'Cleaning supplies',
    quoteDescriptionExample: 'Rooms included and visit frequency',
    defaultDurationUnit: 'weeks',
  },
  gardening: {
    job: 'Visit',
    jobs: 'Visits',
    materials: 'Plants & supplies',
    siteNotes: 'Garden notes',
    addJob: 'New visit',
    todaysJobs: "Today's visits",
    serviceExample: 'Monthly garden maintenance',
    clientNotesExample: 'Access, green waste, lawn areas…',
    jobAddressPlaceholder: 'Property address',
    additionalMaterials: 'Plants & supplies',
    quoteDescriptionExample: 'Tasks each visit and waste removal',
    defaultDurationUnit: 'months',
  },
  tutor: {
    client: 'Student',
    clients: 'Students',
    job: 'Lesson',
    jobs: 'Lessons',
    siteNotes: 'Lesson notes',
    addJob: 'New lesson',
    todaysJobs: "Today's lessons",
    serviceExample: 'GCSE maths weekly lesson',
    clientNotesExample: 'Exam board, weak topics, parent contact…',
    jobAddressPlaceholder: 'Lesson location',
    materials: 'Learning materials',
    quoteDescriptionExample: 'Subject, level, and term length',
    defaultDurationUnit: 'weeks',
  },
  mechanic: {
    job: 'Service',
    jobs: 'Services',
    materials: 'Parts used',
    siteNotes: 'Vehicle notes',
    serviceReminder: 'Next service',
    addJob: 'New service',
    todaysJobs: "Today's services",
    serviceExample: 'Full service and brake check',
    clientNotesExample: 'Registration, mileage, known faults…',
    jobAddressPlaceholder: 'Vehicle location',
    additionalMaterials: 'Parts supplied',
    quoteDescriptionExample: 'Work required and parts allowance',
    defaultDurationUnit: 'mins',
  },
  freelance: {
    job: 'Project',
    jobs: 'Projects',
    siteNotes: 'Project notes',
    addJob: 'New project',
    todaysJobs: 'Active projects',
    serviceExample: 'Website design project',
    clientNotesExample: 'Brief, deadlines, stakeholders…',
    jobAddressPlaceholder: 'Client site or remote',
    workCompleted: 'Deliverables completed',
    additionalWorks: 'Change requests',
    quoteDescriptionExample: 'Scope, milestones, and timeline',
    defaultDurationUnit: 'weeks',
  },
  property: {
    job: 'Job',
    siteNotes: 'Property notes',
    todaysJobs: "Today's jobs",
    serviceExample: 'Property inspection report',
    clientNotesExample: 'Tenant access, keys, report deadline…',
    jobAddressPlaceholder: 'Property address',
    quoteDescriptionExample: 'Inspection type and turnaround',
    defaultDurationUnit: 'days',
  },
  other: {
    serviceExample: 'Describe the service needed',
    quoteDescriptionExample: 'What is included in this quote',
  },
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

export const QUOTE_DURATION_UNITS: { id: QuoteDurationUnit; label: string }[] = [
  { id: 'mins', label: 'mins' },
  { id: 'days', label: 'days' },
  { id: 'weeks', label: 'weeks' },
  { id: 'months', label: 'months' },
];

export const DEFAULT_QUOTE_LINE_ITEMS: Record<BusinessType, QuoteLineItemDraft[]> = {
  trades: [
    { label: 'Labour', amount: '', durationQty: '1', durationUnit: 'days' },
    { label: 'Materials', amount: '', durationQty: '', durationUnit: '' },
    { label: 'Waste disposal', amount: '', durationQty: '', durationUnit: '' },
  ],
  hair: [
    { label: 'Cut & style', amount: '', durationQty: '45', durationUnit: 'mins' },
    { label: 'Colour / treatment', amount: '', durationQty: '90', durationUnit: 'mins' },
    { label: 'Product top-up', amount: '', durationQty: '', durationUnit: '' },
  ],
  beauty: [
    { label: 'Treatment', amount: '', durationQty: '60', durationUnit: 'mins' },
    { label: 'Products used', amount: '', durationQty: '', durationUnit: '' },
    { label: 'Consultation', amount: '', durationQty: '15', durationUnit: 'mins' },
  ],
  pt: [
    { label: 'Training session', amount: '', durationQty: '60', durationUnit: 'mins' },
    { label: 'Programme plan', amount: '', durationQty: '4', durationUnit: 'weeks' },
    { label: 'Nutrition check-in', amount: '', durationQty: '30', durationUnit: 'mins' },
  ],
  photographer: [
    { label: 'Shoot fee', amount: '', durationQty: '2', durationUnit: 'days' },
    { label: 'Editing & retouching', amount: '', durationQty: '5', durationUnit: 'days' },
    { label: 'Print / licence package', amount: '', durationQty: '', durationUnit: '' },
  ],
  dog_groomer: [
    { label: 'Full groom', amount: '', durationQty: '90', durationUnit: 'mins' },
    { label: 'Nail trim & ears', amount: '', durationQty: '15', durationUnit: 'mins' },
    { label: 'De-shed treatment', amount: '', durationQty: '', durationUnit: '' },
  ],
  dog_walker: [
    { label: 'Solo walk (1 dog)', amount: '', durationQty: '60', durationUnit: 'mins' },
    { label: 'Weekly walks (5 days)', amount: '', durationQty: '1', durationUnit: 'weeks' },
    { label: 'Monthly walking package', amount: '', durationQty: '1', durationUnit: 'months' },
  ],
  dog_trainer: [
    { label: '1-to-1 training session', amount: '', durationQty: '60', durationUnit: 'mins' },
    { label: '6-week training course', amount: '', durationQty: '6', durationUnit: 'weeks' },
    { label: 'Home visit assessment', amount: '', durationQty: '90', durationUnit: 'mins' },
  ],
  cleaning: [
    { label: 'Regular clean', amount: '', durationQty: '2', durationUnit: 'weeks' },
    { label: 'Deep clean', amount: '', durationQty: '240', durationUnit: 'mins' },
    { label: 'Cleaning supplies', amount: '', durationQty: '', durationUnit: '' },
  ],
  gardening: [
    { label: 'Garden maintenance visit', amount: '', durationQty: '1', durationUnit: 'months' },
    { label: 'Lawn & hedge work', amount: '', durationQty: '1', durationUnit: 'days' },
    { label: 'Green waste removal', amount: '', durationQty: '', durationUnit: '' },
  ],
  tutor: [
    { label: 'Lesson', amount: '', durationQty: '60', durationUnit: 'mins' },
    { label: 'Term block (10 lessons)', amount: '', durationQty: '10', durationUnit: 'weeks' },
    { label: 'Workbooks & materials', amount: '', durationQty: '', durationUnit: '' },
  ],
  mechanic: [
    { label: 'Labour', amount: '', durationQty: '120', durationUnit: 'mins' },
    { label: 'Parts', amount: '', durationQty: '', durationUnit: '' },
    { label: 'Oil & fluids disposal', amount: '', durationQty: '', durationUnit: '' },
  ],
  freelance: [
    { label: 'Project fee', amount: '', durationQty: '2', durationUnit: 'weeks' },
    { label: 'Revisions allowance', amount: '', durationQty: '5', durationUnit: 'days' },
    { label: 'Expenses', amount: '', durationQty: '', durationUnit: '' },
  ],
  property: [
    { label: 'Inspection visit', amount: '', durationQty: '90', durationUnit: 'mins' },
    { label: 'Written report', amount: '', durationQty: '3', durationUnit: 'days' },
    { label: 'Travel', amount: '', durationQty: '', durationUnit: '' },
  ],
  other: [
    { label: 'Service', amount: '', durationQty: '1', durationUnit: 'days' },
    { label: 'Materials', amount: '', durationQty: '', durationUnit: '' },
    { label: 'Other', amount: '', durationQty: '', durationUnit: '' },
  ],
};

export function getDefaultQuoteLineItems(businessType: BusinessType | null | undefined): QuoteLineItemDraft[] {
  const items = DEFAULT_QUOTE_LINE_ITEMS[businessType ?? 'trades'] ?? DEFAULT_QUOTE_LINE_ITEMS.other;
  return items.map((item) => ({ ...item }));
}
