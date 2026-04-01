/**
 * BusinessBreakdownCard Renderer
 *
 * Shows a structured overview of the business for the concierge side panel.
 * Always-visible default panel item. Each section independently shows data
 * or a "Not captured" indicator. Supports i18n via optional labels prop.
 */

'use client';

import { type CSSProperties } from 'react';
import type { BusinessBreakdownLabels } from '../validation/card-labels.js';

const DEFAULT_LABELS: BusinessBreakdownLabels = {
  services: 'Services',
  products: 'Products',
  todaysHours: "Today's Hours",
  contact: 'Contact',
  faqAvailable: '{count} FAQ available',
  faqsAvailable: '{count} FAQs available',
  closedToday: 'Closed today',
  emptyState: 'Business data not yet captured',
  moreItems: '+{count} more',
};

interface BusinessBreakdownData {
  businessName: string;
  category: string;
  services?: Array<{
    name: string;
    available: boolean;
  }>;
  products?: Array<{
    name: string;
    price: number;
    currency: string;
  }>;
  hours?: {
    today: string | null;
    timezone: string;
  };
  faqCount?: number;
  contactEmail?: string;
  contactPhone?: string;
}

interface BusinessBreakdownCardProps {
  data: BusinessBreakdownData;
  /** Override labels for i18n. Falls back to English defaults. */
  labels?: Partial<BusinessBreakdownLabels>;
}

function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in values ? String(values[key]) : `{${key}}`;
  });
}

const notCapturedStyle: CSSProperties = {
  color: '#9ca3af',
  fontStyle: 'italic',
  fontSize: '12px',
};

export function BusinessBreakdownCard({ data, labels: labelOverrides }: BusinessBreakdownCardProps) {
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };

  const containerStyle: CSSProperties = {
    padding: '12px',
    fontSize: '13px',
    lineHeight: 1.6,
    color: '#374151',
  };

  const headingStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '8px',
  };

  const sectionStyle: CSSProperties = {
    marginBottom: '12px',
  };

  const labelStyle: CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px',
  };

  const chipStyle: CSSProperties = {
    display: 'inline-block',
    padding: '2px 8px',
    fontSize: '12px',
    borderRadius: '4px',
    marginRight: '4px',
    marginBottom: '4px',
  };

  const availableChipStyle: CSSProperties = {
    ...chipStyle,
    background: '#ecfdf5',
    color: '#065f46',
  };

  const unavailableChipStyle: CSSProperties = {
    ...chipStyle,
    background: '#fef2f2',
    color: '#991b1b',
  };

  const hasServices = data.services && data.services.length > 0;
  const hasProducts = data.products && data.products.length > 0;
  const hasHours = data.hours != null;
  const hasContact = Boolean(data.contactEmail || data.contactPhone);
  const hasFaq = data.faqCount != null && data.faqCount > 0;
  const isFullyEmpty = !hasServices && !hasProducts && !hasHours && !hasContact && !hasFaq;

  return (
    <div style={containerStyle}>
      <div style={headingStyle}>{data.businessName}</div>
      <div style={{ ...chipStyle, background: '#f3f4f6', color: '#374151', marginBottom: '12px' }}>
        {data.category}
      </div>

      {/* Fully empty state */}
      {isFullyEmpty && (
        <div style={notCapturedStyle}>
          {labels.emptyState}
        </div>
      )}

      {/* Services */}
      {!isFullyEmpty && (
        <div style={sectionStyle}>
          <div style={labelStyle}>{labels.services}</div>
          {hasServices ? (
            <div>
              {data.services!.map((s) => (
                <span
                  key={s.name}
                  style={s.available ? availableChipStyle : unavailableChipStyle}
                >
                  {s.name}
                </span>
              ))}
            </div>
          ) : (
            <div style={notCapturedStyle}>—</div>
          )}
        </div>
      )}

      {/* Products */}
      {!isFullyEmpty && (
        <div style={sectionStyle}>
          <div style={labelStyle}>{labels.products}</div>
          {hasProducts ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {data.products!.slice(0, 5).map((p) => (
                <div
                  key={p.name}
                  style={{ display: 'flex', justifyContent: 'space-between' }}
                >
                  <span>{p.name}</span>
                  <span style={{ fontWeight: 500 }}>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: p.currency,
                    }).format(p.price)}
                  </span>
                </div>
              ))}
              {data.products!.length > 5 && (
                <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                  {interpolate(labels.moreItems, { count: data.products!.length - 5 })}
                </span>
              )}
            </div>
          ) : (
            <div style={notCapturedStyle}>—</div>
          )}
        </div>
      )}

      {/* Hours */}
      {!isFullyEmpty && (
        <div style={sectionStyle}>
          <div style={labelStyle}>{labels.todaysHours}</div>
          {hasHours ? (
            <div>
              {data.hours!.today ?? (
                <span style={notCapturedStyle}>{labels.closedToday}</span>
              )}
            </div>
          ) : (
            <div style={notCapturedStyle}>—</div>
          )}
        </div>
      )}

      {/* Contact */}
      {!isFullyEmpty && (
        <div style={sectionStyle}>
          <div style={labelStyle}>{labels.contact}</div>
          {hasContact ? (
            <>
              {data.contactEmail && <div>{data.contactEmail}</div>}
              {data.contactPhone && <div>{data.contactPhone}</div>}
            </>
          ) : (
            <div style={notCapturedStyle}>—</div>
          )}
        </div>
      )}

      {/* FAQs */}
      {hasFaq && (
        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
          {interpolate(
            data.faqCount === 1 ? labels.faqAvailable : labels.faqsAvailable,
            { count: data.faqCount! },
          )}
        </div>
      )}
    </div>
  );
}
