import { Card } from '@mentrily/ui-system';
import type { NotificationPreference } from '../types';

const CATEGORY_LABELS: Record<NotificationPreference['category'], string> = {
  ANNOUNCEMENT: 'Announcements',
  ASSESSMENT: 'Assessments',
  BILLING: 'Billing',
  COURSE: 'Courses',
  MEDIA: 'Media',
  SECURITY: 'Security',
  SYSTEM: 'System',
};

const CHANNEL_LABELS: Record<NotificationPreference['channel'], string> = {
  EMAIL: 'Email',
  IN_APP: 'In-app',
  SMS: 'SMS',
};

export function NotificationPreferencesForm({
  preferences,
  savingKey,
  onToggle,
}: {
  preferences: NotificationPreference[];
  savingKey: string | null;
  onToggle: (preference: NotificationPreference, enabled: boolean) => void;
}) {
  const grouped = preferences.reduce<
    Record<NotificationPreference['category'], NotificationPreference[]>
  >(
    (current, preference) => {
      current[preference.category] ??= [];
      current[preference.category].push(preference);
      return current;
    },
    {
      ANNOUNCEMENT: [],
      ASSESSMENT: [],
      BILLING: [],
      COURSE: [],
      MEDIA: [],
      SECURITY: [],
      SYSTEM: [],
    },
  );

  return (
    <div className="grid gap-4" data-testid="notification-preferences-form">
      {Object.entries(grouped).map(([category, categoryPreferences]) => (
        <Card className="rounded-[2rem]" key={category}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-950">
              {CATEGORY_LABELS[category as NotificationPreference['category']]}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              These settings only store workspace preferences. They do not enable live provider
              delivery.
            </p>
          </div>
          <div className="grid gap-3">
            {categoryPreferences.map((preference) => {
              const key = `${preference.channel}:${preference.category}`;
              return (
                <label
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3"
                  data-testid={`preference-row-${key}`}
                  key={key}
                >
                  <div>
                    <div className="font-medium text-slate-900">
                      {CHANNEL_LABELS[preference.channel]}
                    </div>
                    <div className="text-sm text-slate-600">
                      Save whether {CHANNEL_LABELS[preference.channel].toLowerCase()} updates are
                      preferred for this category.
                    </div>
                  </div>
                  <input
                    aria-label={`${CHANNEL_LABELS[preference.channel]} ${CATEGORY_LABELS[preference.category]}`}
                    checked={preference.enabled}
                    data-testid={`preference-toggle-${key}`}
                    disabled={savingKey === key}
                    onChange={(event) => onToggle(preference, event.target.checked)}
                    type="checkbox"
                  />
                </label>
              );
            })}
          </div>
        </Card>
      ))}
    </div>
  );
}
