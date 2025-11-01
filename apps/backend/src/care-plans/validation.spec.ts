import { sanitiseCarePlanPayload } from './validation';

describe('sanitiseCarePlanPayload', () => {
  const validClientId = '01234567-89ab-cdef-0123-456789abcdef';

  it('returns a sanitised payload when input is valid', () => {
    const result = sanitiseCarePlanPayload({
      clientId: validClientId,
      summary: '  Monitor vitals daily ',
      medications: [
        { name: '  Aspirin  ', dosage: ' 81mg ', frequency: ' Once daily ' },
        { name: 'Metformin' },
      ],
      allergies: ['  Penicillin ', 'Latex'],
      specialInstructions: '  Call coordinator if fever exceeds 38C. ',
    });

    expect(result).toEqual({
      ok: true,
      value: {
        clientId: validClientId,
        summary: 'Monitor vitals daily',
        medications: [
          { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily' },
          { name: 'Metformin', dosage: '', frequency: '' },
        ],
        allergies: ['Penicillin', 'Latex'],
        specialInstructions: 'Call coordinator if fever exceeds 38C.',
      },
    });
  });

  it('rejects payloads with missing clientId and summary', () => {
    const result = sanitiseCarePlanPayload({
      clientId: '',
      summary: '',
    });

    expect(result).toEqual({
      ok: false,
      errors: ['clientId is required', 'summary is required'],
    });
  });

  it('validates clientId format', () => {
    const result = sanitiseCarePlanPayload({
      clientId: 'not-a-uuid',
      summary: 'Valid summary',
      medications: [],
      allergies: [],
    });

    expect(result).toEqual({
      ok: false,
      errors: ['clientId must be a valid UUID'],
    });
  });

  it('validates medication entries', () => {
    const result = sanitiseCarePlanPayload({
      clientId: validClientId,
      summary: 'Plan summary',
      medications: [{ dosage: '50mg' }],
    });

    expect(result).toEqual({
      ok: false,
      errors: ['medications[0].name is required'],
    });
  });

  it('validates allergies array', () => {
    const result = sanitiseCarePlanPayload({
      clientId: validClientId,
      summary: 'Plan summary',
      medications: [],
      allergies: [null],
    });

    expect(result).toEqual({
      ok: false,
      errors: ['allergies[0] must be a non-empty string'],
    });
  });

  it('enforces maximum lengths', () => {
    const longSummary = 'a'.repeat(1001);
    const longInstructions = 'a'.repeat(2001);
    const longMedication = 'a'.repeat(201);

    const result = sanitiseCarePlanPayload({
      clientId: validClientId,
      summary: longSummary,
      medications: [{ name: longMedication }],
      allergies: [],
      specialInstructions: longInstructions,
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        'summary must be 1000 characters or fewer',
        'medications[0].name must be 200 characters or fewer',
        'specialInstructions must be 2000 characters or fewer',
      ],
    });
  });
});
