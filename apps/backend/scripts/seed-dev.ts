import 'dotenv/config';
import bcrypt from 'bcrypt';
import { Pool } from 'pg';

type ZoneSeed = {
  id: string;
  code: string;
  name: string;
  description: string;
  timezone: string;
};

type UserSeed = {
  id: string;
  email: string;
  passwordHash: string | null;
  activationCode: string | null;
  activationExpiresAt: string | null;
  firstName: string;
  lastName: string;
  role: 'caregiver' | 'coordinator' | 'admin' | 'family';
  zoneId: string | null;
  phone: string | null;
  deviceLimit: number;
};

type ClientSeed = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  zoneId: string;
  carePlanSummary: string;
  specialInstructions: string | null;
};

type EmergencyContactSeed = {
  id: string;
  clientId: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
};

type MedicationSeed = {
  id: string;
  clientId: string;
  name: string;
  dosage: string;
  frequency: string;
  instructions: string | null;
};

type VisitSeed = {
  id: string;
  clientId: string;
  staffId: string | null;
  scheduledStartTime: string;
  checkInTime: string | null;
  checkInLatitude: number | null;
  checkInLongitude: number | null;
  checkOutTime: string | null;
  checkOutLatitude: number | null;
  checkOutLongitude: number | null;
  durationMinutes: number | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
};

type VisitDocumentationSeed = {
  id: string;
  visitId: string;
  vitalSigns: Record<string, unknown>;
  activities: Record<string, unknown>;
  observations: string;
  concerns: string | null;
  signatureUrl: string | null;
};

type PhotoSeed = {
  id: string;
  visitId: string;
  s3Key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
};

type AlertSeed = {
  id: string;
  clientId: string | null;
  createdByUserId: string | null;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  message: string;
  resolvedAt: string | null;
};

type AlertRecipientSeed = {
  id: string;
  alertId: string;
  userId: string | null;
  readAt: string | null;
};

type SyncLogSeed = {
  id: string;
  userId: string | null;
  deviceId: string | null;
  entityType: string;
  entityId: string | null;
  operation: 'create' | 'update' | 'delete';
  syncTimestamp: string;
  clientTimestamp: string | null;
  conflictResolved: boolean;
  metadata: Record<string, unknown>;
};

const resolveDatabaseUrl = (): string => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const user = process.env.POSTGRES_USER ?? 'berthcare';
  const password = process.env.POSTGRES_PASSWORD ?? 'berthcare';
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  const database = process.env.POSTGRES_DB ?? 'berthcare_dev';

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
};

const zoneIds = {
  north: '11111111-1111-1111-1111-111111111111',
  south: '22222222-2222-2222-2222-222222222222',
} as const;

const userIds = {
  admin: '33333333-3333-3333-3333-333333333333',
  coordinatorNorth: '44444444-4444-4444-4444-444444444444',
  caregiverNorth: '55555555-5555-5555-5555-555555555555',
  caregiverSouth: '66666666-6666-6666-6666-666666666666',
  family: '77777777-7777-7777-7777-777777777777',
} as const;

const visitIds = {
  completed: [
    '88888888-1111-1111-1111-111111111111',
    '88888888-2222-2222-2222-222222222222',
    '88888888-3333-3333-3333-333333333333',
    '88888888-4444-4444-4444-444444444444',
    '88888888-5555-5555-5555-555555555555',
    '88888888-6666-6666-6666-666666666666',
    '88888888-7777-7777-7777-777777777777',
    '88888888-8888-8888-8888-888888888888',
    '88888888-9999-9999-9999-999999999999',
    '88888888-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  ],
  scheduled: [
    '99999999-1111-1111-1111-111111111111',
    '99999999-2222-2222-2222-222222222222',
    '99999999-3333-3333-3333-333333333333',
    '99999999-4444-4444-4444-444444444444',
    '99999999-5555-5555-5555-555555555555',
    '99999999-6666-6666-6666-666666666666',
    '99999999-7777-7777-7777-777777777777',
    '99999999-8888-8888-8888-888888888888',
    '99999999-9999-9999-9999-999999999999',
    '99999999-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  ],
} as const;

const clientIds = [
  'aaaa1111-1111-1111-1111-111111111111',
  'aaaa2222-2222-2222-2222-222222222222',
  'aaaa3333-3333-3333-3333-333333333333',
  'aaaa4444-4444-4444-4444-444444444444',
  'aaaa5555-5555-5555-5555-555555555555',
  'bbbb1111-1111-1111-1111-111111111111',
  'bbbb2222-2222-2222-2222-222222222222',
  'bbbb3333-3333-3333-3333-333333333333',
  'bbbb4444-4444-4444-4444-444444444444',
  'bbbb5555-5555-5555-5555-555555555555',
] as const;

const zones: ZoneSeed[] = [
  {
    id: zoneIds.north,
    code: 'north-shore',
    name: 'North Shore',
    description: 'Downtown pilot coverage zone focused on waterfront communities.',
    timezone: 'America/Toronto',
  },
  {
    id: zoneIds.south,
    code: 'south-ridge',
    name: 'South Ridge',
    description: 'Suburban pilot zone for high-density retirement residences.',
    timezone: 'America/Toronto',
  },
];

const users: UserSeed[] = [
  {
    id: userIds.admin,
    email: 'admin@berthcare.dev',
    passwordHash: 'development-admin-hash',
    activationCode: null,
    activationExpiresAt: null,
    firstName: 'Avery',
    lastName: 'Admin',
    role: 'admin',
    zoneId: null,
    phone: '+16475550100',
    deviceLimit: 3,
  },
  {
    id: userIds.coordinatorNorth,
    email: 'coordinator.north@berthcare.dev',
    passwordHash: 'development-coordinator-hash',
    activationCode: null,
    activationExpiresAt: null,
    firstName: 'Bianca',
    lastName: 'Coordinator',
    role: 'coordinator',
    zoneId: zoneIds.north,
    phone: '+16475550101',
    deviceLimit: 2,
  },
  {
    id: userIds.caregiverNorth,
    email: 'caregiver.north@berthcare.dev',
    passwordHash: null,
    activationCode: '7583-1204',
    activationExpiresAt: '2024-12-31T23:59:59Z',
    firstName: 'Carlos',
    lastName: 'Caregiver',
    role: 'caregiver',
    zoneId: zoneIds.north,
    phone: '+16475550102',
    deviceLimit: 1,
  },
  {
    id: userIds.caregiverSouth,
    email: 'caregiver.south@berthcare.dev',
    passwordHash: null,
    activationCode: '9156-4720',
    activationExpiresAt: '2024-12-31T23:59:59Z',
    firstName: 'Dana',
    lastName: 'Caregiver',
    role: 'caregiver',
    zoneId: zoneIds.south,
    phone: '+16475550103',
    deviceLimit: 1,
  },
  {
    id: userIds.family,
    email: 'family.member@berthcare.dev',
    passwordHash: null,
    activationCode: null,
    activationExpiresAt: null,
    firstName: 'Elliott',
    lastName: 'Family',
    role: 'family',
    zoneId: zoneIds.north,
    phone: '+16475550104',
    deviceLimit: 1,
  },
];

const clients: ClientSeed[] = [
  {
    id: clientIds[0],
    firstName: 'Evelyn',
    lastName: 'Hart',
    dateOfBirth: '1941-04-12',
    address: '123 North Bay Rd, Toronto, ON',
    latitude: 43.644,
    longitude: -79.3802,
    phone: '+16475550200',
    zoneId: zoneIds.north,
    carePlanSummary: 'Morning medication reminders and daily mobility check.',
    specialInstructions: 'Prefers visits before 10 AM.',
  },
  {
    id: clientIds[1],
    firstName: 'Joseph',
    lastName: 'Nguyen',
    dateOfBirth: '1938-09-25',
    address: '45 Front St E, Toronto, ON',
    latitude: 43.6476,
    longitude: -79.3775,
    phone: '+16475550201',
    zoneId: zoneIds.north,
    carePlanSummary: 'Weekly medication reconciliation and exercise support.',
    specialInstructions: 'Requires translator for Vietnamese.',
  },
  {
    id: clientIds[2],
    firstName: 'Margot',
    lastName: 'Singh',
    dateOfBirth: '1945-01-19',
    address: '201 Wellington St W, Toronto, ON',
    latitude: 43.6468,
    longitude: -79.3871,
    phone: '+16475550202',
    zoneId: zoneIds.north,
    carePlanSummary: 'Cognitive stimulation activities and hydration checks.',
    specialInstructions: null,
  },
  {
    id: clientIds[3],
    firstName: 'Lionel',
    lastName: 'Fraser',
    dateOfBirth: '1936-07-02',
    address: '12 Spadina Ave, Toronto, ON',
    latitude: 43.6405,
    longitude: -79.3854,
    phone: '+16475550203',
    zoneId: zoneIds.north,
    carePlanSummary: 'Post-surgery mobility and wound care support.',
    specialInstructions: 'Allergies: latex gloves.',
  },
  {
    id: clientIds[4],
    firstName: 'Penelope',
    lastName: 'Rowe',
    dateOfBirth: '1947-11-08',
    address: '78 King St W, Toronto, ON',
    latitude: 43.6487,
    longitude: -79.3817,
    phone: '+16475550204',
    zoneId: zoneIds.north,
    carePlanSummary: 'Daily wellness check and meal preparation.',
    specialInstructions: 'Leave detailed notes for daughter.',
  },
  {
    id: clientIds[5],
    firstName: 'Arthur',
    lastName: 'Bennett',
    dateOfBirth: '1939-03-30',
    address: '12 Ridgeview Dr, Mississauga, ON',
    latitude: 43.589,
    longitude: -79.6441,
    phone: '+19055550110',
    zoneId: zoneIds.south,
    carePlanSummary: 'Daily blood pressure monitoring and medication reminders.',
    specialInstructions: null,
  },
  {
    id: clientIds[6],
    firstName: 'Lucia',
    lastName: 'Costa',
    dateOfBirth: '1943-05-14',
    address: '85 Erin Mills Pkwy, Mississauga, ON',
    latitude: 43.5633,
    longitude: -79.7101,
    phone: '+19055550111',
    zoneId: zoneIds.south,
    carePlanSummary: 'Mobility assistance and fall prevention exercises.',
    specialInstructions: 'Check-in with grandson weekly.',
  },
  {
    id: clientIds[7],
    firstName: 'Noah',
    lastName: 'Desai',
    dateOfBirth: '1942-02-23',
    address: '33 Lakeshore Rd, Mississauga, ON',
    latitude: 43.5514,
    longitude: -79.5793,
    phone: '+19055550112',
    zoneId: zoneIds.south,
    carePlanSummary: 'Diabetes management support and meal planning.',
    specialInstructions: null,
  },
  {
    id: clientIds[8],
    firstName: 'Iris',
    lastName: 'McLeod',
    dateOfBirth: '1937-08-17',
    address: '410 Burnhamthorpe Rd, Mississauga, ON',
    latitude: 43.5934,
    longitude: -79.6432,
    phone: '+19055550113',
    zoneId: zoneIds.south,
    carePlanSummary: 'Cognitive support and companionship visits.',
    specialInstructions: 'Sensitive to loud environments.',
  },
  {
    id: clientIds[9],
    firstName: 'Harold',
    lastName: 'Zimmer',
    dateOfBirth: '1940-12-04',
    address: '5 Clarkson Rd, Mississauga, ON',
    latitude: 43.5087,
    longitude: -79.6242,
    phone: '+19055550114',
    zoneId: zoneIds.south,
    carePlanSummary: 'Physical therapy exercises and mobility checks.',
    specialInstructions: 'Coordinate with clinic ahead of appointments.',
  },
];

const emergencyContacts: EmergencyContactSeed[] = clients.map((client, index) => ({
  id: `cc${index.toString().padStart(2, '0')}0000-0000-0000-0000-000000000000`,
  clientId: client.id,
  name: `${client.firstName} ${client.lastName} Jr.`,
  relationship: 'Family',
  phone: index < 5 ? '+16475550300' : '+19055550300',
  isPrimary: true,
}));

const medications: MedicationSeed[] = [
  {
    id: 'dd111111-1111-1111-1111-111111111111',
    clientId: clientIds[0],
    name: 'Lisinopril',
    dosage: '10mg',
    frequency: 'Every morning',
    instructions: 'Administer with breakfast and full glass of water.',
  },
  {
    id: 'dd222222-2222-2222-2222-222222222222',
    clientId: clientIds[1],
    name: 'Metformin',
    dosage: '500mg',
    frequency: 'Twice daily',
    instructions: 'Check blood sugar prior to administration.',
  },
  {
    id: 'dd333333-3333-3333-3333-333333333333',
    clientId: clientIds[5],
    name: 'Amlodipine',
    dosage: '5mg',
    frequency: 'Every evening',
    instructions: null,
  },
  {
    id: 'dd444444-4444-4444-4444-444444444444',
    clientId: clientIds[8],
    name: 'Donepezil',
    dosage: '10mg',
    frequency: 'Once daily',
    instructions: 'Administer before bedtime.',
  },
];

const visits: VisitSeed[] = [
  // Completed visits (10)
  ...clientIds.slice(0, 10).map<VisitSeed>((clientId, index) => ({
    id: visitIds.completed[index],
    clientId,
    staffId: index < 5 ? userIds.caregiverNorth : userIds.caregiverSouth,
    scheduledStartTime: `2024-06-${(10 + index).toString().padStart(2, '0')}T09:00:00-04:00`,
    checkInTime: `2024-06-${(10 + index).toString().padStart(2, '0')}T09:05:00-04:00`,
    checkInLatitude: index < 5 ? 43.64 + index * 0.002 : 43.56 + index * 0.002,
    checkInLongitude: index < 5 ? -79.38 - index * 0.002 : -79.63 - index * 0.002,
    checkOutTime: `2024-06-${(10 + index).toString().padStart(2, '0')}T10:20:00-04:00`,
    checkOutLatitude: index < 5 ? 43.64 + index * 0.002 : 43.56 + index * 0.002,
    checkOutLongitude: index < 5 ? -79.38 - index * 0.002 : -79.63 - index * 0.002,
    durationMinutes: 75,
    status: 'completed',
  })),
  // Scheduled future visits (10)
  ...clientIds.slice(0, 10).map<VisitSeed>((clientId, index) => ({
    id: visitIds.scheduled[index],
    clientId,
    staffId: index < 5 ? userIds.caregiverNorth : userIds.caregiverSouth,
    scheduledStartTime: `2024-06-${(20 + index).toString().padStart(2, '0')}T14:00:00-04:00`,
    checkInTime: null,
    checkInLatitude: null,
    checkInLongitude: null,
    checkOutTime: null,
    checkOutLatitude: null,
    checkOutLongitude: null,
    durationMinutes: null,
    status: 'scheduled',
  })),
];

const visitDocumentation: VisitDocumentationSeed[] = visitIds.completed.map((visitId, index) => ({
  id: `ee${index.toString().padStart(2, '0')}0000-0000-0000-0000-000000000000`,
  visitId,
  vitalSigns: {
    bloodPressure: '120/80',
    heartRate: 72 + index,
    temperatureC: 36.5,
  },
  activities: {
    mobility: 'Completed all prescribed exercises',
    hydration: 'Encouraged and tracked fluid intake',
  },
  observations: 'Client in good spirits and cooperative.',
  concerns: index % 3 === 0 ? 'Monitor balance during transfers.' : null,
  signatureUrl: `https://assets.berthcare.dev/signatures/${visitId}.png`,
}));

const photos: PhotoSeed[] = visitIds.completed.slice(0, 4).map((visitId, index) => ({
  id: `ff${index.toString().padStart(2, '0')}0000-0000-0000-0000-000000000000`,
  visitId,
  s3Key: `visits/${visitId}/photo-${index + 1}.jpg`,
  fileName: `photo-${index + 1}.jpg`,
  fileSize: 256000 + index * 10240,
  mimeType: 'image/jpeg',
}));

const alerts: AlertSeed[] = [
  {
    id: 'aa111111-1111-1111-1111-111111111111',
    clientId: clientIds[0],
    createdByUserId: userIds.caregiverNorth,
    urgency: 'medium',
    category: 'medication',
    message: 'Client requested review of evening medication dosage.',
    resolvedAt: null,
  },
  {
    id: 'aa222222-2222-2222-2222-222222222222',
    clientId: clientIds[6],
    createdByUserId: userIds.caregiverSouth,
    urgency: 'high',
    category: 'mobility',
    message: 'Client experienced minor fall risk during transfer.',
    resolvedAt: null,
  },
  {
    id: 'aa333333-3333-3333-3333-333333333333',
    clientId: null,
    createdByUserId: userIds.admin,
    urgency: 'low',
    category: 'system',
    message: 'Scheduled maintenance reminder for caregiver tablets.',
    resolvedAt: '2024-06-10T18:00:00Z',
  },
];

const alertRecipients: AlertRecipientSeed[] = [
  {
    id: 'bb111111-1111-1111-1111-111111111111',
    alertId: alerts[0].id,
    userId: userIds.coordinatorNorth,
    readAt: '2024-06-12T13:30:00Z',
  },
  {
    id: 'bb222222-2222-2222-2222-222222222222',
    alertId: alerts[1].id,
    userId: userIds.coordinatorNorth,
    readAt: null,
  },
  {
    id: 'bb333333-3333-3333-3333-333333333333',
    alertId: alerts[1].id,
    userId: userIds.admin,
    readAt: null,
  },
  {
    id: 'bb444444-4444-4444-4444-444444444444',
    alertId: alerts[2].id,
    userId: userIds.family,
    readAt: '2024-06-10T19:00:00Z',
  },
];

const syncLogEntries: SyncLogSeed[] = [
  {
    id: 'cc111111-1111-1111-1111-111111111111',
    userId: userIds.caregiverNorth,
    deviceId: 'north-device-01',
    entityType: 'visit',
    entityId: visitIds.completed[0],
    operation: 'update',
    syncTimestamp: '2024-06-12T15:05:00Z',
    clientTimestamp: '2024-06-12T15:04:30Z',
    conflictResolved: false,
    metadata: { field: 'documentation', status: 'success' },
  },
  {
    id: 'cc222222-2222-2222-2222-222222222222',
    userId: userIds.caregiverSouth,
    deviceId: 'south-device-02',
    entityType: 'alert',
    entityId: alerts[1].id,
    operation: 'create',
    syncTimestamp: '2024-06-13T10:12:00Z',
    clientTimestamp: '2024-06-13T10:11:45Z',
    conflictResolved: false,
    metadata: { urgency: 'high' },
  },
  {
    id: 'cc333333-3333-3333-3333-333333333333',
    userId: userIds.coordinatorNorth,
    deviceId: 'web-dashboard',
    entityType: 'medication',
    entityId: medications[0].id,
    operation: 'update',
    syncTimestamp: '2024-06-11T16:00:00Z',
    clientTimestamp: '2024-06-11T15:59:55Z',
    conflictResolved: true,
    metadata: { resolution: 'coordinator_overrode', field: 'dosage' },
  },
  {
    id: 'cc444444-4444-4444-4444-444444444444',
    userId: userIds.admin,
    deviceId: 'ops-console',
    entityType: 'system',
    entityId: null,
    operation: 'create',
    syncTimestamp: '2024-06-09T08:00:00Z',
    clientTimestamp: null,
    conflictResolved: false,
    metadata: { action: 'maintenance_notice' },
  },
];

// Guard against running the destructive seed script in production.
const productionDbTokens = ['prod', 'berthcare_prod'];

const isProductionEnvironment = (): boolean => {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }

  const databaseUrl = process.env.DATABASE_URL?.toLowerCase() ?? '';
  const postgresDb = process.env.POSTGRES_DB?.toLowerCase() ?? '';

  return productionDbTokens.some(
    (token) => databaseUrl.includes(token) || postgresDb.includes(token),
  );
};

if (isProductionEnvironment()) {
  console.error(
    'Refusing to run apps/backend/scripts/seed-dev.ts: detected production-like environment. Aborting to prevent destructive operations.',
  );
  process.exit(1);
}

const pool = new Pool({
  connectionString: resolveDatabaseUrl(),
  max: 1,
});

const seed = async (): Promise<void> => {
  const client = await pool.connect();

  try {
    console.log('Seeding development database...');
    await client.query('BEGIN');

    await client.query(`
      TRUNCATE TABLE 
        auth_activation_sessions,
        auth_activation_attempts,
        sync_log,
        alert_recipients,
        alerts,
        photos,
        visit_documentation,
        visits,
        medications,
        emergency_contacts,
        clients,
        users,
        zones
      RESTART IDENTITY CASCADE
    `);

    for (const zone of zones) {
      await client.query(
        `
          INSERT INTO zones (id, code, name, description, timezone)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [zone.id, zone.code, zone.name, zone.description, zone.timezone],
      );
    }

    for (const user of users) {
      const normalizedActivationCode = user.activationCode
        ? user.activationCode.replace(/\D/g, '')
        : null;
      const activationCodeHash = normalizedActivationCode
        ? await bcrypt.hash(normalizedActivationCode, 12)
        : null;

      await client.query(
        `
          INSERT INTO users (
            id,
            email,
            password_hash,
            activation_code_hash,
            activation_expires_at,
            first_name,
            last_name,
            role,
            zone_id,
            phone,
            device_limit
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          user.id,
          user.email,
          user.passwordHash,
          activationCodeHash,
          user.activationExpiresAt,
          user.firstName,
          user.lastName,
          user.role,
          user.zoneId,
          user.phone,
          user.deviceLimit,
        ],
      );
    }

    for (const clientSeed of clients) {
      await client.query(
        `
          INSERT INTO clients (
            id,
            first_name,
            last_name,
            date_of_birth,
            address,
            latitude,
            longitude,
            phone,
            zone_id,
            care_plan_summary,
            special_instructions
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `,
        [
          clientSeed.id,
          clientSeed.firstName,
          clientSeed.lastName,
          clientSeed.dateOfBirth,
          clientSeed.address,
          clientSeed.latitude,
          clientSeed.longitude,
          clientSeed.phone,
          clientSeed.zoneId,
          clientSeed.carePlanSummary,
          clientSeed.specialInstructions,
        ],
      );
    }

    for (const contact of emergencyContacts) {
      await client.query(
        `
          INSERT INTO emergency_contacts (
            id,
            client_id,
            name,
            relationship,
            phone,
            is_primary
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          contact.id,
          contact.clientId,
          contact.name,
          contact.relationship,
          contact.phone,
          contact.isPrimary,
        ],
      );
    }

    for (const medication of medications) {
      await client.query(
        `
          INSERT INTO medications (
            id,
            client_id,
            name,
            dosage,
            frequency,
            instructions
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          medication.id,
          medication.clientId,
          medication.name,
          medication.dosage,
          medication.frequency,
          medication.instructions,
        ],
      );
    }

    for (const visit of visits) {
      await client.query(
        `
          INSERT INTO visits (
            id,
            client_id,
            staff_id,
            scheduled_start_time,
            check_in_time,
            check_in_latitude,
            check_in_longitude,
            check_out_time,
            check_out_latitude,
            check_out_longitude,
            duration_minutes,
            status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `,
        [
          visit.id,
          visit.clientId,
          visit.staffId,
          visit.scheduledStartTime,
          visit.checkInTime,
          visit.checkInLatitude,
          visit.checkInLongitude,
          visit.checkOutTime,
          visit.checkOutLatitude,
          visit.checkOutLongitude,
          visit.durationMinutes,
          visit.status,
        ],
      );
    }

    for (const documentation of visitDocumentation) {
      await client.query(
        `
          INSERT INTO visit_documentation (
            id,
            visit_id,
            vital_signs,
            activities,
            observations,
            concerns,
            signature_url
          )
          VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7)
        `,
        [
          documentation.id,
          documentation.visitId,
          JSON.stringify(documentation.vitalSigns),
          JSON.stringify(documentation.activities),
          documentation.observations,
          documentation.concerns,
          documentation.signatureUrl,
        ],
      );
    }

    for (const photo of photos) {
      await client.query(
        `
          INSERT INTO photos (
            id,
            visit_id,
            s3_key,
            file_name,
            file_size,
            mime_type
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [photo.id, photo.visitId, photo.s3Key, photo.fileName, photo.fileSize, photo.mimeType],
      );
    }

    for (const alert of alerts) {
      await client.query(
        `
          INSERT INTO alerts (
            id,
            client_id,
            created_by_user_id,
            urgency,
            category,
            message,
            resolved_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `,
        [
          alert.id,
          alert.clientId,
          alert.createdByUserId,
          alert.urgency,
          alert.category,
          alert.message,
          alert.resolvedAt,
        ],
      );
    }

    for (const recipient of alertRecipients) {
      await client.query(
        `
          INSERT INTO alert_recipients (
            id,
            alert_id,
            user_id,
            read_at
          )
          VALUES ($1, $2, $3, $4)
        `,
        [recipient.id, recipient.alertId, recipient.userId, recipient.readAt],
      );
    }

    for (const entry of syncLogEntries) {
      await client.query(
        `
          INSERT INTO sync_log (
            id,
            user_id,
            device_id,
            entity_type,
            entity_id,
            operation,
            sync_timestamp,
            client_timestamp,
            conflict_resolved,
            metadata
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        `,
        [
          entry.id,
          entry.userId,
          entry.deviceId,
          entry.entityType,
          entry.entityId,
          entry.operation,
          entry.syncTimestamp,
          entry.clientTimestamp,
          entry.conflictResolved,
          JSON.stringify(entry.metadata),
        ],
      );
    }

    await client.query('COMMIT');
    console.log('Development database seeded successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Failed to seed development database:', error);
    throw error;
  } finally {
    client.release();
  }
};

seed()
  .catch((error) => {
    process.exitCode = 1;
    if (error instanceof Error) {
      console.error(error.message);
    }
  })
  .finally(async () => {
    await pool.end();
  });
