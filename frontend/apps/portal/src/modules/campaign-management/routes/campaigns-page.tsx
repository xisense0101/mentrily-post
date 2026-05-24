'use client';

import { useEffect, useState } from 'react';
import type {
  CampaignAudiencePreviewResponseContract,
  CampaignChannelContract,
  CampaignContract,
  CampaignMessagePreviewResponseContract,
  CampaignStatusContract,
  NotificationTemplateContract,
} from '@mentrily/domain-contracts';
import { campaignApiClient } from '../api/campaign-api-client';

const audienceOptions = [
  'ALL_WORKSPACE_MEMBERS',
  'WORKSPACE_ADMINS',
  'COURSE_LEARNERS',
  'ASSESSMENT_PARTICIPANTS',
  'CONTENT_AUTHORS',
  'MEDIA_OWNERS',
  'CUSTOM_USER_IDS',
] as const;

type AudienceType = (typeof audienceOptions)[number];

export function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignContract[]>([]);
  const [templates, setTemplates] = useState<NotificationTemplateContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [audiencePreview, setAudiencePreview] =
    useState<CampaignAudiencePreviewResponseContract | null>(null);
  const [messagePreview, setMessagePreview] =
    useState<CampaignMessagePreviewResponseContract | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    channel: 'EMAIL' as CampaignChannelContract,
    templateId: '',
    subject: '',
    body: '',
    audienceType: 'ALL_WORKSPACE_MEMBERS' as AudienceType,
  });

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [loadedCampaigns, loadedTemplates] = await Promise.all([
          campaignApiClient.listCampaigns(),
          campaignApiClient.listTemplates(),
        ]);

        if (!active) {
          return;
        }

        setCampaigns(loadedCampaigns);
        setTemplates(loadedTemplates);
        setLoading(false);
      } catch (error) {
        if (!active) {
          return;
        }

        const message = error instanceof Error ? error.message : 'Failed to load campaigns';
        setLoading(false);
        setForbidden(/forbidden|denied|403/i.test(message));
        setError(/forbidden|denied|403/i.test(message) ? null : message);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, []);

  const saveDisabled = form.name.trim().length === 0 || form.body.trim().length === 0;

  if (forbidden) {
    return (
      <section data-testid="campaigns-forbidden">
        <h1>Campaign access denied</h1>
        <p>You do not have permission to create or manage workspace campaigns.</p>
      </section>
    );
  }

  return (
    <section data-testid="campaigns-page" style={{ display: 'grid', gap: '1.5rem' }}>
      <header>
        <h1 style={{ marginBottom: '0.5rem' }}>Campaigns</h1>
        <p style={{ margin: 0, color: '#52606d' }}>
          Draft, preview, archive, and schedule campaigns. Live delivery remains backend-controlled.
        </p>
      </header>

      {loading ? <p data-testid="campaigns-loading">Loading campaigns...</p> : null}
      {error ? <p data-testid="campaigns-error">{error}</p> : null}

      {!loading ? (
        <div
          style={{
            display: 'grid',
            gap: '1.5rem',
            gridTemplateColumns: 'minmax(240px, 320px) 1fr',
          }}
        >
          <div>
            <h2 style={{ marginTop: 0 }}>Drafts</h2>
            {campaigns.length === 0 ? (
              <p data-testid="campaigns-empty">No campaigns created yet.</p>
            ) : (
              <ul data-testid="campaigns-list" style={{ paddingLeft: '1rem' }}>
                {campaigns.map((campaign) => (
                  <li key={campaign.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setForm({
                          name: campaign.name,
                          description: campaign.description ?? '',
                          channel: campaign.channel,
                          templateId: campaign.templateId ?? '',
                          subject: campaign.subject ?? '',
                          body: campaign.body,
                          audienceType: campaign.audienceType,
                        });
                      }}
                    >
                      {campaign.name} <CampaignStatus status={campaign.status} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            <label>
              Name
              <input
                data-testid="campaign-name-input"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <label>
              Description
              <textarea
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
              />
            </label>
            <label>
              Channel
              <select
                value={form.channel}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    channel: event.target.value as CampaignChannelContract,
                  }))
                }
              >
                <option value="EMAIL">Email</option>
                <option value="IN_APP">In App</option>
                <option value="SMS">SMS</option>
              </select>
            </label>
            <label>
              Template
              <select
                value={form.templateId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, templateId: event.target.value }))
                }
              >
                <option value="">Custom Message</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Subject
              <input
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({ ...current, subject: event.target.value }))
                }
              />
            </label>
            <label>
              Body
              <textarea
                data-testid="campaign-body-input"
                value={form.body}
                onChange={(event) =>
                  setForm((current) => ({ ...current, body: event.target.value }))
                }
              />
            </label>
            <label>
              Audience
              <select
                data-testid="campaign-audience-select"
                value={form.audienceType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    audienceType: event.target.value as AudienceType,
                  }))
                }
              >
                {audienceOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                data-testid="campaign-preview-audience"
                type="button"
                onClick={async () => {
                  const preview = await campaignApiClient.previewAudience({
                    audienceType: form.audienceType,
                  });
                  setAudiencePreview(preview);
                }}
              >
                Preview Audience
              </button>
              <button
                data-testid="campaign-preview-message"
                type="button"
                onClick={async () => {
                  const preview = await campaignApiClient.previewMessage({
                    templateId: form.templateId || undefined,
                    subject: form.subject || undefined,
                    body: form.body,
                    variables: { name: 'Jordan' },
                  });
                  setMessagePreview(preview);
                }}
              >
                Preview Message
              </button>
              <button data-testid="campaign-save-button" type="button" disabled={saveDisabled}>
                Save Draft
              </button>
            </div>

            {audiencePreview ? (
              <p data-testid="campaign-audience-preview">
                Audience preview: {audiencePreview.totalCount} recipients
              </p>
            ) : null}
            {messagePreview ? (
              <div data-testid="campaign-message-preview">
                <strong>{messagePreview.subject ?? 'No subject'}</strong>
                <p>{messagePreview.body}</p>
              </div>
            ) : null}

            <p data-testid="campaign-live-delivery-note">
              Live campaign fanout is disabled by default and still requires backend delivery gates.
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CampaignStatus(props: { status: CampaignStatusContract }) {
  return <span>({props.status})</span>;
}
