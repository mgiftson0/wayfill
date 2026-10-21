/**
 * App settings schema – stored in chrome.storage.local.
 * Sensitive fields (API key) are encrypted when a passphrase is set.
 */
import { z } from 'zod';
import { JobTypeSchema } from './profile-schema';

export const AppSettingsSchema = z.object({
  // Active profile ID
  activeProfileId:  z.string().optional(),
  // Active job type (quick selector in popup)
  activeJobType:    JobTypeSchema.default('Full-time'),
  // Per-hostname enable/disable toggle
  siteEnabled:      z.record(z.boolean()).default({}),
  // AI settings (key may be encrypted – stored as ciphertext string when encrypted)
  anthropicKey:     z.string().optional(),
  anthropicModel:   z.string().default('claude-sonnet-4-6'),
  // Encryption: true when a passphrase has been set
  encryptionEnabled: z.boolean().default(false),
  // Salt for PBKDF2 (base64-encoded) – stored plaintext
  kdfSalt:          z.string().optional(),
  // Per-site AI preview acknowledgement
  aiPreviewSites:   z.record(z.boolean()).default({}),
  // Last fill summary
  lastSummary:      z.object({
    filled:  z.number(),
    review:  z.number(),
    skipped: z.number(),
    url:     z.string(),
    ts:      z.number(),
  }).optional(),
  // One-time disclaimer shown
  disclaimerShown: z.boolean().default(false),
  // Teach-mode mappings: hostname → fieldKey → profilePath
  teachMappings: z.record(z.record(z.string())).default({}),
});
export type AppSettings = z.infer<typeof AppSettingsSchema>;
