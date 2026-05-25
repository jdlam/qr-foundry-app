import type { WifiConfig, VCardConfig, EmailConfig, SmsConfig, GeoConfig, CalendarConfig, BitcoinConfig, GoogleReviewConfig } from '../types/qr';

/**
 * Format WiFi credentials for QR code
 * Format: WIFI:T:<encryption>;S:<ssid>;P:<password>;H:<hidden>;;
 */
export function formatWifi(config: WifiConfig): string {
  const { ssid, password, encryption, hidden } = config;
  let result = `WIFI:T:${encryption};S:${escapeWifiField(ssid)};`;

  if (encryption !== 'nopass' && password) {
    result += `P:${escapeWifiField(password)};`;
  }

  if (hidden) {
    result += 'H:true;';
  }

  return result + ';';
}

/**
 * Escape special characters in WiFi fields
 */
function escapeWifiField(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/:/g, '\\:')
    .replace(/"/g, '\\"');
}

/**
 * Escape special characters in vCard 3.0 TEXT values per RFC 2426 §4.
 * The semicolon and comma are structural delimiters in vCard properties;
 * an unescaped comma in ORG causes parsers to split the value into a list,
 * and an unescaped semicolon in N shifts name components, corrupting the
 * contact on import. Raw newlines create bogus top-level content lines that
 * strict parsers (iOS, Android Contacts) reject or import as garbage.
 */
function escapeVCardText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n/g, '\\n')
    .replace(/\r/g, '\\n')
    .replace(/\n/g, '\\n');
}

/**
 * Format vCard for QR code
 * Using vCard 3.0 format for compatibility
 */
export function formatVCard(config: VCardConfig): string {
  const lines: string[] = [
    'BEGIN:VCARD',
    'VERSION:3.0',
  ];

  // Name (required) — lastName and firstName are N components separated by `;`
  // so each must be escaped independently to avoid shifting the component order
  lines.push(`N:${escapeVCardText(config.lastName || '')};${escapeVCardText(config.firstName || '')};;;`);
  lines.push(`FN:${escapeVCardText([config.firstName, config.lastName].filter(Boolean).join(' '))}`);

  // Organization
  if (config.organization) {
    lines.push(`ORG:${escapeVCardText(config.organization)}`);
  }

  // Title
  if (config.title) {
    lines.push(`TITLE:${escapeVCardText(config.title)}`);
  }

  // Phone
  if (config.phone) {
    lines.push(`TEL:${config.phone}`);
  }

  // Email
  if (config.email) {
    lines.push(`EMAIL:${config.email}`);
  }

  // URL
  if (config.url) {
    lines.push(`URL:${config.url}`);
  }

  // Address — street is a TEXT component within the ADR structured value;
  // escape it so a semicolon in the street does not shift city/state/zip/country
  if (config.address) {
    const { street, city, state, zip, country } = config.address;
    lines.push(`ADR:;;${escapeVCardText(street || '')};${escapeVCardText(city || '')};${escapeVCardText(state || '')};${escapeVCardText(zip || '')};${escapeVCardText(country || '')}`);
  }

  lines.push('END:VCARD');

  // RFC 2426 §2.1: content lines are separated by CRLF
  return lines.join('\r\n');
}

/**
 * Format email for QR code
 * Format: mailto:<to>?subject=<subject>&body=<body>
 */
export function formatEmail(config: EmailConfig): string {
  const params: string[] = [];

  if (config.subject) {
    params.push(`subject=${encodeURIComponent(config.subject)}`);
  }

  if (config.body) {
    params.push(`body=${encodeURIComponent(config.body)}`);
  }

  let result = `mailto:${config.to}`;
  if (params.length > 0) {
    result += `?${params.join('&')}`;
  }

  return result;
}

/**
 * Format SMS for QR code
 * Format: sms:<phone>?body=<message> or smsto:<phone>:<message>
 */
export function formatSms(config: SmsConfig): string {
  let result = `sms:${config.phone}`;

  if (config.message) {
    result += `?body=${encodeURIComponent(config.message)}`;
  }

  return result;
}

/**
 * Format phone number for QR code
 * Format: tel:<number>
 */
export function formatPhone(phone: string): string {
  return `tel:${phone.replace(/\s/g, '')}`;
}

/**
 * Format geo coordinates for QR code
 * Format: geo:<lat>,<lng>
 */
export function formatGeo(config: GeoConfig): string {
  return `geo:${config.latitude},${config.longitude}`;
}

/**
 * Format URL - ensures it has a protocol
 */
export function formatUrl(url: string): string {
  if (!url) return '';

  // If no protocol, add https://
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }

  return url;
}

// BIP 21 amount grammar: non-negative decimal literal (digits, optional fractional part).
// Empty/undefined means "amount omitted" — the field is optional.
const BITCOIN_AMOUNT_RE = /^\d+(\.\d+)?$/;

export function isValidBitcoinAmount(amount: string | undefined): boolean {
  if (!amount) return true;
  return BITCOIN_AMOUNT_RE.test(amount);
}

/**
 * Format Bitcoin payment URI (BIP 21)
 * Format: bitcoin:<address>?amount=<amount>&label=<label>&message=<message>
 *
 * Returns an empty string if the address is blank — a bare "bitcoin:" URI
 * is not a valid payment request and would generate a confusing QR.
 * An invalid amount is silently dropped from the params so the URI stays
 * well-formed; the UI surfaces the validation warning separately.
 */
export function formatBitcoin(config: BitcoinConfig): string {
  const address = config.address?.trim() ?? '';
  if (!address) return '';

  let result = `bitcoin:${address}`;

  const params: string[] = [];
  if (config.amount && isValidBitcoinAmount(config.amount)) {
    // BIP 21: amount is a strict decimal literal, not encoded.
    params.push(`amount=${config.amount}`);
  }
  if (config.label) {
    params.push(`label=${encodeURIComponent(config.label)}`);
  }
  if (config.message) {
    params.push(`message=${encodeURIComponent(config.message)}`);
  }

  if (params.length > 0) {
    result += `?${params.join('&')}`;
  }

  return result;
}

// Google Place IDs are URL-safe identifiers (alphanumeric + underscore + dash).
// Reference: https://developers.google.com/maps/documentation/places/web-service/place-id
const GOOGLE_PLACE_ID_RE = /^[A-Za-z0-9_-]+$/;

export function isValidGooglePlaceId(placeId: string): boolean {
  return GOOGLE_PLACE_ID_RE.test(placeId);
}

/**
 * Format Google Review URL for QR code. Place ID is interpolated unencoded —
 * valid Place IDs are URL-safe by spec, and silently encoding bad input would
 * produce a working URL that resolves to no place. Callers should reject
 * invalid input via isValidGooglePlaceId before formatting.
 */
export function formatGoogleReview(config: GoogleReviewConfig): string {
  return `https://search.google.com/local/writereview?placeid=${config.placeId}`;
}

/**
 * Escape special characters in iCalendar TEXT values per RFC 5545 Section 3.3.11.
 * Normalizes CRLF/CR to LF first so a Windows-pasted description doesn't leave
 * stray \r bytes that break the line structure when joined with CRLF below.
 */
function escapeICalText(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Normalize time string to HHMMSS format.
 * Handles both "HH:MM" and "HH:MM:SS" from browser input.
 */
function formatICalTime(time: string): string {
  const parts = time.split(':');
  const hh = parts[0] || '00';
  const mm = parts[1] || '00';
  const ss = parts[2] || '00';
  return `${hh}${mm}${ss}`;
}

/** Current UTC timestamp in iCalendar DTSTAMP form (YYYYMMDDTHHMMSSZ). */
function nowUtcStamp(): string {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

/** Generate a UID for an iCalendar VEVENT. Uses crypto.randomUUID when available. */
function generateUid(): string {
  const uuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${uuid}@qr-foundry`;
}

/**
 * Format calendar event for QR code.
 * Outputs VCALENDAR/VEVENT string per RFC 5545.
 *
 * Returns an empty string when required date fields are missing or
 * malformed — emitting "DTSTART:T000000" produces an invalid event that
 * some parsers reject or silently de-duplicate.
 */
export function formatCalendarEvent(config: CalendarConfig): string {
  if (!config.title?.trim()) return '';
  if (!ISO_DATE_RE.test(config.startDate) || !ISO_DATE_RE.test(config.endDate)) {
    return '';
  }

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//QR Foundry//QR Foundry App//EN',
    'BEGIN:VEVENT',
    `UID:${generateUid()}`,
    `DTSTAMP:${nowUtcStamp()}`,
  ];

  lines.push(`SUMMARY:${escapeICalText(config.title)}`);

  if (config.allDay) {
    const startDate = config.startDate.replace(/-/g, '');
    const endDate = config.endDate.replace(/-/g, '');
    lines.push(`DTSTART;VALUE=DATE:${startDate}`);
    lines.push(`DTEND;VALUE=DATE:${endDate}`);
  } else {
    const startDt = config.startDate.replace(/-/g, '') + 'T' + formatICalTime(config.startTime || '00:00');
    const endDt = config.endDate.replace(/-/g, '') + 'T' + formatICalTime(config.endTime || '00:00');
    lines.push(`DTSTART:${startDt}`);
    lines.push(`DTEND:${endDt}`);
  }

  if (config.location) {
    lines.push(`LOCATION:${escapeICalText(config.location)}`);
  }

  if (config.description) {
    lines.push(`DESCRIPTION:${escapeICalText(config.description)}`);
  }

  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Detect QR type from content
 */
export function detectQrType(content: string): string {
  if (!content) return 'text';

  const lower = content.toLowerCase();

  if (lower.startsWith('wifi:')) return 'wifi';
  if (lower.startsWith('begin:vcard')) return 'vcard';
  if (lower.startsWith('mailto:')) return 'email';
  if (lower.startsWith('sms:') || lower.startsWith('smsto:')) return 'sms';
  if (lower.startsWith('tel:')) return 'phone';
  if (lower.startsWith('geo:')) return 'geo';
  if (lower.startsWith('begin:vcalendar') || lower.startsWith('begin:vevent')) return 'calendar';
  if (lower.startsWith('bitcoin:')) return 'bitcoin';
  if (lower.startsWith('https://search.google.com/local/writereview')) return 'google-review';
  if (/^https?:\/\//i.test(content)) return 'url';
  if (/^[a-z0-9.-]+\.[a-z]{2,}/i.test(content)) return 'url';

  return 'text';
}
