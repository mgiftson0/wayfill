/**
 * Profile schema – Zod-validated, serialisable to chrome.storage.local.
 * NEVER store SSN, bank info, or passwords.
 */
import { z } from 'zod';

// ── Job types ──────────────────────────────────────────────────────────────
export const JobTypeSchema = z.enum([
  'Internship',
  'Co-op',
  'Full-time',
  'Part-time',
  'Contract/Temporary',
  'New Grad/Entry Level',
  'Apprenticeship',
  'Seasonal',
]);
export type JobType = z.infer<typeof JobTypeSchema>;

// ── Education entry ────────────────────────────────────────────────────────
export const EducationEntrySchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  gpa: z.string().optional(),
  startDate: z.string().optional(), // YYYY-MM
  endDate: z.string().optional(),   // YYYY-MM or 'Present'
  expected: z.boolean().optional(),
});
export type EducationEntry = z.infer<typeof EducationEntrySchema>;

// ── Work experience entry ──────────────────────────────────────────────────
export const WorkExperienceEntrySchema = z.object({
  id: z.string(),
  company: z.string(),
  title: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),  // YYYY-MM
  endDate: z.string().optional(),    // YYYY-MM or 'Present'
  current: z.boolean().optional(),
  description: z.string().optional(),
});
export type WorkExperienceEntry = z.infer<typeof WorkExperienceEntrySchema>;

// ── Q&A bank entry ─────────────────────────────────────────────────────────
export const QAEntrySchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  variants: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
});
export type QAEntry = z.infer<typeof QAEntrySchema>;

// ── EEO self-identification ────────────────────────────────────────────────
const DeclineDefault = z.string().default('Decline to self-identify');

export const EEOSchema = z.object({
  gender:     DeclineDefault,
  race:       DeclineDefault,
  veteran:    DeclineDefault,
  disability: DeclineDefault,
});
export type EEO = z.infer<typeof EEOSchema>;

// ── Common yes/no questions ────────────────────────────────────────────────
// ── Certification entry ────────────────────────────────────────────────────
export const CertificationEntrySchema = z.object({
  id:        z.string(),
  name:      z.string(),
  issuer:    z.string().optional(),
  url:       z.string().optional(),
  startDate: z.string().optional(), // YYYY-MM
  endDate:   z.string().optional(), // YYYY-MM or 'No expiry'
});
export type CertificationEntry = z.infer<typeof CertificationEntrySchema>;

export const CommonAnswersSchema = z.object({
  previousEmployee:      z.string().optional(), // 'Yes' | 'No' | ''
  relativesAtCompany:    z.string().optional(),
  backgroundCheck:       z.string().optional(),
  drugTest:              z.string().optional(),
  nonCompete:            z.string().optional(),
  referralSource:        z.string().optional(),
  interviewAvailability: z.string().optional(),
});
export type CommonAnswers = z.infer<typeof CommonAnswersSchema>;

// ── Work authorization ─────────────────────────────────────────────────────
export const WorkAuthSchema = z.object({
  authorized:         z.string().optional(), // 'Yes' | 'No'
  sponsorshipNow:     z.string().optional(),
  sponsorshipFuture:  z.string().optional(),
  visaType:           z.string().optional(),
  over18:             z.string().optional(),
  clearance:          z.string().optional(),
});
export type WorkAuth = z.infer<typeof WorkAuthSchema>;

// ── Internship availability ────────────────────────────────────────────────
export const InternAvailabilitySchema = z.object({
  startDate:    z.string().optional(),  // YYYY-MM-DD
  endDate:      z.string().optional(),
  hoursPerWeek: z.number().optional(),
  relocation:   z.string().optional(),  // 'Yes' | 'No' | 'Maybe'
  workMode:     z.string().optional(),  // 'Remote' | 'Hybrid' | 'On-site' | 'Any'
  travel:       z.string().optional(),  // '0%' | '25%' | etc.
});
export type InternAvailability = z.infer<typeof InternAvailabilitySchema>;

// ── Pay expectations ───────────────────────────────────────────────────────
export const PayExpectationsSchema = z.object({
  minimum:   z.string().optional(),
  desired:   z.string().optional(),
  currency:  z.string().default('USD'),
  period:    z.string().default('annual'), // 'annual' | 'hourly'
});
export type PayExpectations = z.infer<typeof PayExpectationsSchema>;

// ── Personal info ──────────────────────────────────────────────────────────
export const PersonalInfoSchema = z.object({
  firstName:     z.string().default(''),
  lastName:      z.string().default(''),
  highestDegree: z.string().optional(),
  email:       z.string().default(''),
  phone:       z.string().default(''),
  city:        z.string().default(''),
  state:       z.string().default(''),
  zip:         z.string().default(''),
  country:     z.string().default('United States'),
  address1:    z.string().optional(),
  address2:    z.string().optional(),
  linkedin:    z.string().optional(),
  github:      z.string().optional(),
  portfolio:   z.string().optional(),
  otherLink:   z.string().optional(),
  summary:     z.string().optional(),
});
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;

// ── Root profile ───────────────────────────────────────────────────────────
export const ProfileSchema = z.object({
  id:             z.string(),
  name:           z.string().default('Default'),
  jobType:        JobTypeSchema.default('Full-time'),
  personal:       PersonalInfoSchema.default({}),
  education:      z.array(EducationEntrySchema).default([]),
  experience:     z.array(WorkExperienceEntrySchema).default([]),
  skills:         z.array(z.string()).default([]),
  certifications: z.array(CertificationEntrySchema).default([]),
  languages:      z.array(z.string()).default([]),
  workAuth:       WorkAuthSchema.default({}),
  eeo:            EEOSchema.default({}),
  common:         CommonAnswersSchema.default({}),
  internAvail:    InternAvailabilitySchema.default({}),
  pay:            PayExpectationsSchema.default({}),
  qa:             z.array(QAEntrySchema).default([]),
  updatedAt:      z.string().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

/** Create a new blank profile with sane defaults */
export function createBlankProfile(jobType: JobType = 'Full-time'): Profile {
  return ProfileSchema.parse({
    id: crypto.randomUUID(),
    name: jobType,
    jobType,
  });
}
