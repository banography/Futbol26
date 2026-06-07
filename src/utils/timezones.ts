const DEVICE_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export type TimezoneOption = {
  id: string;
  label: string;
  value: string;
};

export const TIMEZONES: TimezoneOption[] = [
  { id: 'local',       label: 'My Local Time', value: DEVICE_TZ },
  { id: 'eastern',     label: 'Eastern Time',  value: 'America/New_York' },
  { id: 'central',     label: 'Central Time',  value: 'America/Chicago' },
  { id: 'pacific',     label: 'Pacific Time',  value: 'America/Los_Angeles' },
  { id: 'mexico-city', label: 'Mexico City',   value: 'America/Mexico_City' },
  { id: 'toronto',     label: 'Toronto',       value: 'America/Toronto' },
  { id: 'vancouver',   label: 'Vancouver',     value: 'America/Vancouver' },
  { id: 'london',      label: 'London',        value: 'Europe/London' },
];
