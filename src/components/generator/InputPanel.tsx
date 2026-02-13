import { useQrStore } from '../../stores/qrStore';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import {
  formatWifi,
  formatVCard,
  formatEmail,
  formatSms,
  formatPhone,
  formatGeo,
  formatUrl,
} from '../../lib/formatters';
import type { QrType } from '../../types/qr';

const INPUT_TYPES: { id: QrType; label: string }[] = [
  { id: 'url', label: 'URL' },
  { id: 'text', label: 'Text' },
  { id: 'wifi', label: 'WiFi' },
  { id: 'phone', label: 'Phone' },
  { id: 'vcard', label: 'vCard' },
  { id: 'email', label: 'Email' },
  { id: 'sms', label: 'SMS' },
  { id: 'geo', label: 'Location' },
];

export function InputPanel() {
  const {
    content,
    inputType,
    wifiConfig,
    vcardConfig,
    emailConfig,
    smsConfig,
    geoConfig,
    isDynamic,
    dynamicShortCode,
    dynamicLabel,
    setContent,
    setInputType,
    setWifiConfig,
    setVcardConfig,
    setEmailConfig,
    setSmsConfig,
    setGeoConfig,
    setIsDynamic,
    setDynamicLabel,
  } = useQrStore();

  const { requireAccess } = useFeatureAccess('dynamic_codes');

  const handleDynamicToggle = () => {
    if (!isDynamic) {
      if (!requireAccess()) return;
    }
    setIsDynamic(!isDynamic);
  };

  const inputClassName =
    'w-full text-sm rounded-sm px-3 py-2.5 outline-none transition-all' +
    ' border-2' +
    ' focus:shadow-[0_0_0_3px_var(--accent-focus-ring)]';

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    borderColor: 'var(--input-border)',
    color: 'var(--text-primary)',
  };

  const inputFocusColor = 'var(--accent)';

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = inputFocusColor;
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = 'var(--input-border)';
  };

  const renderInputFields = () => {
    switch (inputType) {
      case 'wifi':
        return (
          <div className="flex flex-col gap-2">
            <input
              value={wifiConfig.ssid}
              onChange={(e) => {
                setWifiConfig({ ssid: e.target.value });
                setContent(formatWifi({ ...wifiConfig, ssid: e.target.value }));
              }}
              placeholder="Network name (SSID)"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <input
              value={wifiConfig.password}
              onChange={(e) => {
                setWifiConfig({ password: e.target.value });
                setContent(formatWifi({ ...wifiConfig, password: e.target.value }));
              }}
              placeholder="Password"
              type="password"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <select
              value={wifiConfig.encryption}
              onChange={(e) => {
                const encryption = e.target.value as 'WPA' | 'WEP' | 'nopass';
                setWifiConfig({ encryption });
                setContent(formatWifi({ ...wifiConfig, encryption }));
              }}
              className={`${inputClassName} cursor-pointer appearance-none`}
              style={{
                ...inputStyle,
                paddingRight: '32px',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 8px center',
                backgroundSize: '16px 16px',
              }}
              onFocus={handleInputFocus as unknown as React.FocusEventHandler<HTMLSelectElement>}
              onBlur={handleInputBlur as unknown as React.FocusEventHandler<HTMLSelectElement>}
            >
              <option value="WPA">WPA/WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">No Password</option>
            </select>
            <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={wifiConfig.hidden}
                onChange={(e) => {
                  setWifiConfig({ hidden: e.target.checked });
                  setContent(formatWifi({ ...wifiConfig, hidden: e.target.checked }));
                }}
                className="accent-accent"
              />
              Hidden network
            </label>
          </div>
        );

      case 'vcard':
        return (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                value={vcardConfig.firstName}
                onChange={(e) => {
                  setVcardConfig({ firstName: e.target.value });
                  setContent(formatVCard({ ...vcardConfig, firstName: e.target.value }));
                }}
                placeholder="First name"
                className={inputClassName}
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <input
                value={vcardConfig.lastName}
                onChange={(e) => {
                  setVcardConfig({ lastName: e.target.value });
                  setContent(formatVCard({ ...vcardConfig, lastName: e.target.value }));
                }}
                placeholder="Last name"
                className={inputClassName}
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>
            <input
              value={vcardConfig.organization || ''}
              onChange={(e) => {
                setVcardConfig({ organization: e.target.value });
                setContent(formatVCard({ ...vcardConfig, organization: e.target.value }));
              }}
              placeholder="Organization"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <input
              value={vcardConfig.phone || ''}
              onChange={(e) => {
                setVcardConfig({ phone: e.target.value });
                setContent(formatVCard({ ...vcardConfig, phone: e.target.value }));
              }}
              placeholder="Phone"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <input
              value={vcardConfig.email || ''}
              onChange={(e) => {
                setVcardConfig({ email: e.target.value });
                setContent(formatVCard({ ...vcardConfig, email: e.target.value }));
              }}
              placeholder="Email"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <input
              value={vcardConfig.url || ''}
              onChange={(e) => {
                setVcardConfig({ url: e.target.value });
                setContent(formatVCard({ ...vcardConfig, url: e.target.value }));
              }}
              placeholder="Website"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
        );

      case 'email':
        return (
          <div className="flex flex-col gap-2">
            <input
              value={emailConfig.to}
              onChange={(e) => {
                setEmailConfig({ to: e.target.value });
                setContent(formatEmail({ ...emailConfig, to: e.target.value }));
              }}
              placeholder="Recipient email"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <input
              value={emailConfig.subject || ''}
              onChange={(e) => {
                setEmailConfig({ subject: e.target.value });
                setContent(formatEmail({ ...emailConfig, subject: e.target.value }));
              }}
              placeholder="Subject"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <textarea
              value={emailConfig.body || ''}
              onChange={(e) => {
                setEmailConfig({ body: e.target.value });
                setContent(formatEmail({ ...emailConfig, body: e.target.value }));
              }}
              placeholder="Body"
              rows={2}
              className={`${inputClassName} resize-y`}
              style={inputStyle}
              onFocus={handleInputFocus as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
              onBlur={handleInputBlur as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
            />
          </div>
        );

      case 'sms':
        return (
          <div className="flex flex-col gap-2">
            <input
              value={smsConfig.phone}
              onChange={(e) => {
                setSmsConfig({ phone: e.target.value });
                setContent(formatSms({ ...smsConfig, phone: e.target.value }));
              }}
              placeholder="Phone number"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <textarea
              value={smsConfig.message || ''}
              onChange={(e) => {
                setSmsConfig({ message: e.target.value });
                setContent(formatSms({ ...smsConfig, message: e.target.value }));
              }}
              placeholder="Message (optional)"
              rows={2}
              className={`${inputClassName} resize-y`}
              style={inputStyle}
              onFocus={handleInputFocus as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
              onBlur={handleInputBlur as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
            />
          </div>
        );

      case 'phone':
        return (
          <input
            value={content.replace('tel:', '')}
            onChange={(e) => setContent(formatPhone(e.target.value))}
            placeholder="+1 555-0123"
            className={inputClassName}
            style={inputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        );

      case 'geo':
        return (
          <div className="flex gap-2">
            <input
              value={geoConfig.latitude}
              onChange={(e) => {
                setGeoConfig({ latitude: e.target.value });
                setContent(formatGeo({ ...geoConfig, latitude: e.target.value }));
              }}
              placeholder="Latitude"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
            <input
              value={geoConfig.longitude}
              onChange={(e) => {
                setGeoConfig({ longitude: e.target.value });
                setContent(formatGeo({ ...geoConfig, longitude: e.target.value }));
              }}
              placeholder="Longitude"
              className={inputClassName}
              style={inputStyle}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
            />
          </div>
        );

      case 'url':
        return (
          <input
            value={content}
            onChange={(e) => setContent(formatUrl(e.target.value))}
            placeholder="https://example.com"
            className={inputClassName}
            style={inputStyle}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
          />
        );

      default: // text
        return (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your text..."
            rows={3}
            className={`${inputClassName} resize-y min-h-[60px]`}
            style={inputStyle}
            onFocus={handleInputFocus as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
            onBlur={handleInputBlur as unknown as React.FocusEventHandler<HTMLTextAreaElement>}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Type Selector */}
      <div>
        <div
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-2.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Type
        </div>
        <div className="flex flex-wrap gap-1.5">
          {INPUT_TYPES.map((type) => {
            const isActive = inputType === type.id;
            return (
              <button
                key={type.id}
                onClick={() => setInputType(type.id)}
                className="flex items-center gap-1 rounded-sm text-[12px] font-medium transition-colors"
                style={{
                  padding: '5px 10px',
                  background: isActive ? 'var(--active-bg)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  border: isActive ? '1px solid var(--accent)' : '1px solid var(--input-border)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--hover-bg)';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-muted)';
                  }
                }}
              >
                {type.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Input */}
      <div>
        <div
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-2.5"
          style={{ color: 'var(--text-muted)' }}
        >
          Content
        </div>
        {renderInputFields()}
        <div className="text-[11px] font-mono mt-1.5" style={{ color: 'var(--text-faint)' }}>
          {content.length} chars
        </div>
      </div>

      {/* Dynamic Code Toggle */}
      {inputType === 'url' && (
        <div>
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Dynamic Code
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="#f59e0b" stroke="none">
                <path d="M13 2L4.5 13H11L10 22L19.5 11H13L13 2Z" />
              </svg>
            </div>
            <button
              onClick={handleDynamicToggle}
              className="relative w-9 h-5 rounded-full transition-colors"
              style={{
                background: isDynamic ? 'var(--accent)' : 'var(--input-border)',
              }}
              role="switch"
              aria-checked={isDynamic}
              aria-label="Enable dynamic code"
            >
              <span
                className="absolute top-0.5 w-4 h-4 rounded-full transition-transform"
                style={{
                  background: 'white',
                  transform: isDynamic ? 'translateX(16px)' : 'translateX(0)',
                  left: '2px',
                }}
              />
            </button>
          </div>
          {isDynamic && (
            <div className="mt-2 space-y-2">
              <input
                type="text"
                value={dynamicLabel}
                onChange={(e) => setDynamicLabel(e.target.value)}
                placeholder="Label (optional)"
                className={inputClassName}
                style={inputStyle}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
              <div className="text-[11px] leading-relaxed" style={{ color: 'var(--text-faint)' }}>
                QR will redirect via qrfo.link. You can change the destination later.
              </div>
              {dynamicShortCode && (
                <div
                  className="text-[11px] font-mono font-medium px-2 py-1 rounded-sm inline-block"
                  style={{
                    background: 'var(--accent-bg-tint)',
                    color: 'var(--accent)',
                  }}
                >
                  qrfo.link/{dynamicShortCode}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
