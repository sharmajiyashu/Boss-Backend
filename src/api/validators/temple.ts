import { z } from 'zod';

// Helper to coerce strings to numbers/booleans for multipart form data
const coerceNumber = z.coerce.number();
const coerceBoolean = z.coerce.boolean();

// Time regex that supports HH:mm (00:00 to 23:59) and HHmm
const timeRegex = /^([0-1]?[0-9]|2[0-3]):?([0-5][0-9])(\s?[AP]M)?$/i;

export const templeValidationSchema = z.object({
  nameEn: z.string().min(1, 'Name in English is required'),
  nameHi: z.string().min(1, 'Name in Hindi is required'),
  addressEn: z.string().min(1, 'Address in English is required'),
  addressHi: z.string().min(1, 'Address in Hindi is required'),
  cityEn: z.string().min(1, 'City in English is required'),
  cityHi: z.string().min(1, 'City in Hindi is required'),
  stateEn: z.string().min(1, 'State in English is required'),
  stateHi: z.string().min(1, 'State in Hindi is required'),
  lat: coerceNumber.min(-90).max(90),
  long: coerceNumber.min(-180).max(180),
  descriptionEn: z.string().min(1, 'Description in English is required'),
  descriptionHi: z.string().min(1, 'Description in Hindi is required'),
  establishedEn: z.string().optional().nullable(),
  establishedHi: z.string().optional().nullable(),

  morningTimings: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (!val || val === '[]') return [];
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val;
  }, z.array(z.object({
    nameEn: z.string().min(1, 'Shift name is required'),
    nameHi: z.string().min(1, 'Shift name in Hindi is required'),
    startTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
    endTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)')
  }))).default([]),

  eveningTimings: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (!val || val === '[]') return [];
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val;
  }, z.array(z.object({
    nameEn: z.string().min(1, 'Shift name is required'),
    nameHi: z.string().min(1, 'Shift name in Hindi is required'),
    startTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)'),
    endTime: z.string().regex(timeRegex, 'Invalid time format (HH:mm)')
  }))).default([]),

  imageIds: z.preprocess((val) => {
    if (typeof val === 'string') {
      if (!val || val === '[]') return [];
      try { return JSON.parse(val); } catch (e) { return []; }
    }
    return val;
  }, z.array(z.number())).default([]),

  thumbnailId: coerceNumber.optional().nullable(),
  audioGuideEnId: coerceNumber.optional().nullable(),
  audioGuideHiId: coerceNumber.optional().nullable(),
  documentaryVideoId: coerceNumber.optional().nullable(),

  audioGuideEn: z.string().url().optional().nullable().or(z.literal('')),
  audioGuideHi: z.string().url().optional().nullable().or(z.literal('')),
  documentaryVideoUrl: z.string().url().optional().nullable().or(z.literal('')),

  bestTimeEn: z.string().optional().nullable(),
  bestTimeHi: z.string().optional().nullable(),
  historyEn: z.string().optional().nullable(),
  historyHi: z.string().optional().nullable(),

  listenToHistoryUrlEn: z.string().optional().nullable(),
  listenToHistoryUrlHi: z.string().optional().nullable(),

  isActive: coerceBoolean.default(true),
});

export const updateTempleValidationSchema = templeValidationSchema.partial();
