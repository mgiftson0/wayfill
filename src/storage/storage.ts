/**
 * Storage layer – thin wrappers over chrome.storage.local.
 * Validates all data through Zod schemas before reading/writing.
 */
import { ProfileSchema, createBlankProfile, type Profile } from './profile-schema';
import { AppSettingsSchema, type AppSettings } from './settings-schema';

const PROFILES_KEY = 'profiles';
const SETTINGS_KEY = 'settings';

// ── Settings ───────────────────────────────────────────────────────────────

export async function loadSettings(): Promise<AppSettings> {
  const raw = await chrome.storage.local.get(SETTINGS_KEY);
  const val = raw[SETTINGS_KEY] as unknown;
  if (!val) return AppSettingsSchema.parse({});
  const parsed = AppSettingsSchema.safeParse(val);
  return parsed.success ? parsed.data : AppSettingsSchema.parse({});
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function patchSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await loadSettings();
  const updated = AppSettingsSchema.parse({ ...current, ...patch });
  await saveSettings(updated);
  return updated;
}

// ── Profiles ───────────────────────────────────────────────────────────────

export async function loadProfiles(): Promise<Profile[]> {
  const raw = await chrome.storage.local.get(PROFILES_KEY);
  const val = raw[PROFILES_KEY] as unknown;
  if (!Array.isArray(val)) return [];
  return val.flatMap((item: unknown) => {
    const parsed = ProfileSchema.safeParse(item);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function saveProfiles(profiles: Profile[]): Promise<void> {
  await chrome.storage.local.set({ [PROFILES_KEY]: profiles });
}

export async function loadProfile(id: string): Promise<Profile | undefined> {
  const profiles = await loadProfiles();
  return profiles.find((p) => p.id === id);
}

export async function saveProfile(profile: Profile): Promise<void> {
  const profiles = await loadProfiles();
  const idx = profiles.findIndex((p) => p.id === profile.id);
  const updated = { ...profile, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    profiles[idx] = updated;
  } else {
    profiles.push(updated);
  }
  await saveProfiles(profiles);
}

export async function deleteProfile(id: string): Promise<void> {
  const profiles = await loadProfiles();
  await saveProfiles(profiles.filter((p) => p.id !== id));
}

/** Get the active profile, creating a default one if none exists. */
export async function getActiveProfile(): Promise<Profile> {
  const settings = await loadSettings();
  if (settings.activeProfileId) {
    const profile = await loadProfile(settings.activeProfileId);
    if (profile) return profile;
  }
  // Create a default profile
  const profile = createBlankProfile(settings.activeJobType);
  await saveProfile(profile);
  await patchSettings({ activeProfileId: profile.id });
  return profile;
}

// ── Import / Export ────────────────────────────────────────────────────────

export interface ExportData {
  version: 1;
  exportedAt: string;
  profiles: Profile[];
  settings: AppSettings;
}

export async function exportData(): Promise<ExportData> {
  const [profiles, settings] = await Promise.all([loadProfiles(), loadSettings()]);
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles,
    settings,
  };
}

export async function importData(data: unknown): Promise<void> {
  const raw = data as { version?: number; profiles?: unknown[]; settings?: unknown };
  if (raw.version !== 1) throw new Error('Unsupported export version');
  if (Array.isArray(raw.profiles)) {
    const profiles = raw.profiles.flatMap((item: unknown) => {
      const parsed = ProfileSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    });
    await saveProfiles(profiles);
  }
}

// ── Clear all data ─────────────────────────────────────────────────────────
export async function clearAllData(): Promise<void> {
  await chrome.storage.local.clear();
}
