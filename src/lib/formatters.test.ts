import { describe, it, expect } from 'vitest';
import {
  formatWifi,
  formatVCard,
  formatEmail,
  formatSms,
  formatPhone,
  formatGeo,
  formatUrl,
  formatCalendarEvent,
  formatBitcoin,
  isValidBitcoinAmount,
  formatGoogleReview,
  isValidGooglePlaceId,
  detectQrType,
} from './formatters';

describe('formatWifi', () => {
  it('formats basic WPA WiFi config', () => {
    const result = formatWifi({
      ssid: 'MyNetwork',
      password: 'secret123',
      encryption: 'WPA',
      hidden: false,
    });
    expect(result).toBe('WIFI:T:WPA;S:MyNetwork;P:secret123;;');
  });

  it('formats WEP WiFi config', () => {
    const result = formatWifi({
      ssid: 'OldNetwork',
      password: 'wepkey',
      encryption: 'WEP',
      hidden: false,
    });
    expect(result).toBe('WIFI:T:WEP;S:OldNetwork;P:wepkey;;');
  });

  it('formats open WiFi without password', () => {
    const result = formatWifi({
      ssid: 'OpenNetwork',
      password: '',
      encryption: 'nopass',
      hidden: false,
    });
    expect(result).toBe('WIFI:T:nopass;S:OpenNetwork;;');
  });

  it('includes hidden flag when true', () => {
    const result = formatWifi({
      ssid: 'HiddenNetwork',
      password: 'secret',
      encryption: 'WPA',
      hidden: true,
    });
    expect(result).toBe('WIFI:T:WPA;S:HiddenNetwork;P:secret;H:true;;');
  });

  it('escapes special characters in SSID', () => {
    const result = formatWifi({
      ssid: 'My;Network:Test',
      password: 'pass',
      encryption: 'WPA',
      hidden: false,
    });
    expect(result).toBe('WIFI:T:WPA;S:My\\;Network\\:Test;P:pass;;');
  });

  it('escapes special characters in password', () => {
    const result = formatWifi({
      ssid: 'Network',
      password: 'pass;word:test',
      encryption: 'WPA',
      hidden: false,
    });
    expect(result).toBe('WIFI:T:WPA;S:Network;P:pass\\;word\\:test;;');
  });
});

describe('formatVCard', () => {
  it('formats basic vCard with name only', () => {
    const result = formatVCard({
      firstName: 'John',
      lastName: 'Doe',
    });
    expect(result).toContain('BEGIN:VCARD');
    expect(result).toContain('VERSION:3.0');
    expect(result).toContain('N:Doe;John;;;');
    expect(result).toContain('FN:John Doe');
    expect(result).toContain('END:VCARD');
  });

  it('formats vCard with all fields', () => {
    const result = formatVCard({
      firstName: 'Jane',
      lastName: 'Smith',
      organization: 'Acme Inc',
      title: 'CEO',
      phone: '+1-555-1234',
      email: 'jane@acme.com',
      url: 'https://acme.com',
      address: {
        street: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        zip: '94105',
        country: 'USA',
      },
    });
    expect(result).toContain('ORG:Acme Inc');
    expect(result).toContain('TITLE:CEO');
    expect(result).toContain('TEL:+1-555-1234');
    expect(result).toContain('EMAIL:jane@acme.com');
    expect(result).toContain('URL:https://acme.com');
    expect(result).toContain('ADR:;;123 Main St;San Francisco;CA;94105;USA');
  });

  it('handles missing optional fields', () => {
    const result = formatVCard({
      firstName: 'Test',
      lastName: '',
    });
    expect(result).toContain('N:;Test;;;');
    expect(result).toContain('FN:Test');
    expect(result).not.toContain('ORG:');
    expect(result).not.toContain('TEL:');
  });

  // vCard 3.0 (RFC 2426) treats `;` and `,` as structural delimiters in TEXT
  // values. An unescaped comma in ORG causes parsers to split the field; an
  // unescaped semicolon in the N property shifts every name component, producing
  // a wrong name on import. These are silent data-corruption bugs on a contact QR.
  it('backslash-escapes commas in TEXT fields so parsers do not split on them', () => {
    const result = formatVCard({
      firstName: 'John',
      lastName: 'Doe',
      organization: 'Acme, Inc.',
      title: 'VP, Engineering',
    });
    // Exact-line assertions: if escapeVCardText's comma rule were removed,
    // these would produce 'ORG:Acme, Inc.' and 'TITLE:VP, Engineering' and fail.
    const lines = result.split('\r\n');
    const orgLine = lines.find((l) => l.startsWith('ORG:'));
    const titleLine = lines.find((l) => l.startsWith('TITLE:'));
    expect(orgLine).toBe('ORG:Acme\\, Inc.');
    expect(titleLine).toBe('TITLE:VP\\, Engineering');
    // No unescaped comma may appear anywhere in either value (negative-lookbehind guard)
    expect(orgLine).not.toMatch(/(?<!\\),/);
    expect(titleLine).not.toMatch(/(?<!\\),/);
  });

  it('backslash-escapes semicolons in N and ADR so field components are not shifted', () => {
    // An unescaped ; in lastName shifts the N components: "Doe;Jr" → the parser
    // reads "Jr" as the first name, discarding the rest. Same in ADR: an unescaped
    // ; in street shifts city/state/zip/country into the wrong positions.
    const result = formatVCard({
      firstName: 'John',
      lastName: 'Doe;Jr',
      address: {
        street: '1 Main; Suite 2',
        city: 'Springfield',
        state: 'IL',
        zip: '62701',
        country: 'USA',
      },
    });
    expect(result).toContain('N:Doe\\;Jr;John;;;');
    expect(result).toContain('ADR:;;1 Main\\; Suite 2;Springfield;IL;62701;USA');
  });

  it('backslash-escapes backslash characters before other escaping', () => {
    // A literal backslash in a value must be doubled first; otherwise the escape
    // sequences we add would produce incorrect output (e.g. "C:\\n" would be read
    // as "C:" + escaped-newline instead of "C:\n").
    const result = formatVCard({
      firstName: 'John',
      lastName: 'Doe',
      organization: 'C:\\Corp',
    });
    expect(result).toContain('ORG:C:\\\\Corp');
  });

  it('converts raw newlines in TEXT fields to the literal \\n escape sequence', () => {
    // A raw newline inside a vCard property value creates a new top-level vCard
    // line, which strict parsers (iOS, Android) reject or import as garbage.
    // RFC 2426 §4: newlines in TEXT must be represented as the two-char sequence \n.
    const result = formatVCard({
      firstName: 'John',
      lastName: 'Doe',
      title: 'Engineer\nArchitect',
    });
    expect(result).toContain('TITLE:Engineer\\nArchitect');
    // The raw newline must not appear inside any property value line
    const titleLine = result.split('\r\n').find((l) => l.startsWith('TITLE:'));
    expect(titleLine).toBeDefined();
    expect(titleLine).not.toContain('\n');
  });

  it('joins vCard lines with CRLF per RFC 2426 so strict parsers accept it', () => {
    // RFC 2426 §2.1 mandates CRLF as the content line separator.
    // A bare LF is accepted by many parsers but rejected by strict ones (e.g. iOS
    // Contacts on older OS versions). The calendar formatter already uses CRLF;
    // vCard must match.
    const result = formatVCard({
      firstName: 'Jane',
      lastName: 'Doe',
    });
    expect(result).toContain('\r\n');
    // Every line break must be CRLF — no bare LF
    expect(result).not.toMatch(/[^\r]\n/);
  });

  // vCard line injection: a raw CR or LF embedded in TEL, EMAIL, or URL would
  // split the value across two content lines, injecting attacker-controlled or
  // malformed vCard properties. These fields are stripped (not \n-escaped) because
  // a newline in a phone number, email address, or URI is always malformed input.
  it('strips embedded newlines from TEL to prevent vCard line injection', () => {
    const result = formatVCard({
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1-555-0100\r\nBEGIN:VCARD\r\nVERSION:3.0\r\nFN:Injected',
    });
    const lines = result.split('\r\n');
    const telLine = lines.find((l) => l.startsWith('TEL:'));
    // The injected CRLF must be stripped — TEL value is all on one line, no embedded breaks
    expect(telLine).toBeDefined();
    expect(telLine).toBe('TEL:+1-555-0100BEGIN:VCARDVERSION:3.0FN:Injected');
    // Only one BEGIN:VCARD line — the injected one was stripped into the TEL value
    expect(lines.filter((l) => l === 'BEGIN:VCARD').length).toBe(1);
    // TEL line must not contain a newline
    expect(telLine).not.toMatch(/[\r\n]/);
  });

  it('strips embedded newlines from EMAIL to prevent vCard line injection', () => {
    const result = formatVCard({
      firstName: 'John',
      lastName: 'Doe',
      email: 'user@example.com\nBEGIN:VCARD',
    });
    const lines = result.split('\r\n');
    const emailLine = lines.find((l) => l.startsWith('EMAIL:'));
    expect(emailLine).toBeDefined();
    expect(emailLine).not.toMatch(/[\r\n]/);
    // Only one BEGIN:VCARD line — the injected one was stripped
    expect(lines.filter((l) => l === 'BEGIN:VCARD').length).toBe(1);
  });

  it('strips embedded newlines from URL to prevent vCard line injection', () => {
    const result = formatVCard({
      firstName: 'John',
      lastName: 'Doe',
      url: 'https://example.com\r\nBEGIN:VCARD',
    });
    const lines = result.split('\r\n');
    const urlLine = lines.find((l) => l.startsWith('URL:'));
    expect(urlLine).toBeDefined();
    expect(urlLine).not.toMatch(/[\r\n]/);
    // Only one BEGIN:VCARD line — the injected one was stripped
    expect(lines.filter((l) => l === 'BEGIN:VCARD').length).toBe(1);
  });
});

describe('formatEmail', () => {
  it('formats email with only recipient', () => {
    const result = formatEmail({
      to: 'test@example.com',
    });
    expect(result).toBe('mailto:test@example.com');
  });

  it('formats email with subject', () => {
    const result = formatEmail({
      to: 'test@example.com',
      subject: 'Hello World',
    });
    expect(result).toBe('mailto:test@example.com?subject=Hello%20World');
  });

  it('formats email with subject and body', () => {
    const result = formatEmail({
      to: 'test@example.com',
      subject: 'Hello',
      body: 'This is a test message.',
    });
    expect(result).toBe(
      'mailto:test@example.com?subject=Hello&body=This%20is%20a%20test%20message.'
    );
  });

  it('formats email with only body', () => {
    const result = formatEmail({
      to: 'test@example.com',
      body: 'Body only',
    });
    expect(result).toBe('mailto:test@example.com?body=Body%20only');
  });

  it('encodes special characters', () => {
    const result = formatEmail({
      to: 'test@example.com',
      subject: 'Test & Demo',
      body: 'Line 1\nLine 2',
    });
    expect(result).toContain('subject=Test%20%26%20Demo');
    expect(result).toContain('body=Line%201%0ALine%202');
  });
});

describe('formatSms', () => {
  it('formats SMS with phone only', () => {
    const result = formatSms({
      phone: '+15551234567',
    });
    expect(result).toBe('sms:+15551234567');
  });

  it('formats SMS with message', () => {
    const result = formatSms({
      phone: '+15551234567',
      message: 'Hello there!',
    });
    expect(result).toBe('sms:+15551234567?body=Hello%20there!');
  });

  it('encodes special characters in message', () => {
    const result = formatSms({
      phone: '+15551234567',
      message: 'Hi & welcome!',
    });
    expect(result).toBe('sms:+15551234567?body=Hi%20%26%20welcome!');
  });
});

describe('formatPhone', () => {
  it('formats phone number with tel: prefix', () => {
    const result = formatPhone('+15551234567');
    expect(result).toBe('tel:+15551234567');
  });

  it('removes spaces from phone number', () => {
    const result = formatPhone('+1 555 123 4567');
    expect(result).toBe('tel:+15551234567');
  });

  it('handles formatted phone numbers', () => {
    const result = formatPhone('(555) 123 4567');
    expect(result).toBe('tel:(555)1234567');
  });
});

describe('formatGeo', () => {
  it('formats geo coordinates', () => {
    const result = formatGeo({
      latitude: '37.7749',
      longitude: '-122.4194',
    });
    expect(result).toBe('geo:37.7749,-122.4194');
  });

  it('handles negative coordinates', () => {
    const result = formatGeo({
      latitude: '-33.8688',
      longitude: '151.2093',
    });
    expect(result).toBe('geo:-33.8688,151.2093');
  });

  it('handles zero coordinates', () => {
    const result = formatGeo({
      latitude: '0',
      longitude: '0',
    });
    expect(result).toBe('geo:0,0');
  });
});

describe('formatUrl', () => {
  it('returns empty string for empty input', () => {
    const result = formatUrl('');
    expect(result).toBe('');
  });

  it('adds https:// to URLs without protocol', () => {
    const result = formatUrl('example.com');
    expect(result).toBe('https://example.com');
  });

  it('preserves existing https:// protocol', () => {
    const result = formatUrl('https://example.com');
    expect(result).toBe('https://example.com');
  });

  it('preserves existing http:// protocol', () => {
    const result = formatUrl('http://example.com');
    expect(result).toBe('http://example.com');
  });

  it('handles URLs with paths', () => {
    const result = formatUrl('example.com/path/to/page');
    expect(result).toBe('https://example.com/path/to/page');
  });

  it('is case-insensitive for protocol check', () => {
    const result = formatUrl('HTTPS://EXAMPLE.COM');
    expect(result).toBe('HTTPS://EXAMPLE.COM');
  });
});

describe('formatCalendarEvent', () => {
  it('formats a standard timed event with CRLF and PRODID', () => {
    const result = formatCalendarEvent({
      title: 'Team Meeting',
      location: 'Conference Room A',
      startDate: '2026-04-15',
      startTime: '09:00',
      endDate: '2026-04-15',
      endTime: '10:00',
      description: 'Weekly sync',
    });
    expect(result).toContain('BEGIN:VCALENDAR');
    expect(result).toContain('PRODID:-//QR Foundry//QR Foundry App//EN');
    expect(result).toContain('BEGIN:VEVENT');
    expect(result).toContain('SUMMARY:Team Meeting');
    expect(result).toContain('DTSTART:20260415T090000');
    expect(result).toContain('DTEND:20260415T100000');
    expect(result).toContain('LOCATION:Conference Room A');
    expect(result).toContain('DESCRIPTION:Weekly sync');
    expect(result).toContain('END:VEVENT');
    expect(result).toContain('END:VCALENDAR');
    // RFC 5545 requires UID + DTSTAMP on every VEVENT
    expect(result).toMatch(/UID:.+@qr-foundry/);
    expect(result).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    // RFC 5545 requires CRLF line endings
    expect(result).toContain('\r\n');
    expect(result).not.toMatch(/[^\r]\n/);
  });

  it('generates a unique UID per call', () => {
    const a = formatCalendarEvent({
      title: 'A',
      startDate: '2026-01-01',
      startTime: '09:00',
      endDate: '2026-01-01',
      endTime: '10:00',
    });
    const b = formatCalendarEvent({
      title: 'B',
      startDate: '2026-01-01',
      startTime: '09:00',
      endDate: '2026-01-01',
      endTime: '10:00',
    });
    const uidA = a.match(/UID:(.+)/)?.[1];
    const uidB = b.match(/UID:(.+)/)?.[1];
    expect(uidA).toBeTruthy();
    expect(uidB).toBeTruthy();
    expect(uidA).not.toBe(uidB);
  });

  it('returns empty string when required fields are missing', () => {
    // No title
    expect(
      formatCalendarEvent({
        title: '',
        startDate: '2026-01-01',
        startTime: '09:00',
        endDate: '2026-01-01',
        endTime: '10:00',
      }),
    ).toBe('');
    // Empty startDate (store default before user input)
    expect(
      formatCalendarEvent({
        title: 'Event',
        startDate: '',
        startTime: '09:00',
        endDate: '2026-01-01',
        endTime: '10:00',
      }),
    ).toBe('');
    // Malformed date
    expect(
      formatCalendarEvent({
        title: 'Event',
        startDate: '2026/01/01',
        startTime: '09:00',
        endDate: '2026-01-01',
        endTime: '10:00',
      }),
    ).toBe('');
  });

  it('normalizes Windows CRLF in description before escaping', () => {
    const result = formatCalendarEvent({
      title: 'Event',
      startDate: '2026-01-01',
      startTime: '09:00',
      endDate: '2026-01-01',
      endTime: '10:00',
      description: 'Line 1\r\nLine 2\rLine 3',
    });
    expect(result).toContain('DESCRIPTION:Line 1\\nLine 2\\nLine 3');
    // No stray \r in the description value would survive the join
    expect(result).not.toMatch(/DESCRIPTION:[^\r]*\r[^\n]/);
  });

  it('formats an all-day event', () => {
    const result = formatCalendarEvent({
      title: 'Company Holiday',
      startDate: '2026-12-25',
      startTime: '',
      endDate: '2026-12-26',
      endTime: '',
      allDay: true,
    });
    expect(result).toContain('DTSTART;VALUE=DATE:20261225');
    expect(result).toContain('DTEND;VALUE=DATE:20261226');
    expect(result).not.toContain('DTSTART:');
    expect(result).not.toMatch(/^DTEND:\d{8}T/m);
  });

  it('formats minimal fields (title + dates only)', () => {
    const result = formatCalendarEvent({
      title: 'Quick Event',
      startDate: '2026-01-01',
      startTime: '12:00',
      endDate: '2026-01-01',
      endTime: '13:00',
    });
    expect(result).toContain('SUMMARY:Quick Event');
    expect(result).toContain('DTSTART:20260101T120000');
    expect(result).toContain('DTEND:20260101T130000');
    expect(result).not.toContain('LOCATION:');
    expect(result).not.toContain('DESCRIPTION:');
  });

  it('escapes special characters per RFC 5545', () => {
    const result = formatCalendarEvent({
      title: 'Meeting; recap, Q1 & Q2',
      startDate: '2026-03-01',
      startTime: '14:00',
      endDate: '2026-03-01',
      endTime: '15:00',
      description: 'Line 1\nLine 2',
      location: 'Room A; Building 2',
    });
    expect(result).toContain('SUMMARY:Meeting\\; recap\\, Q1 & Q2');
    expect(result).toContain('DESCRIPTION:Line 1\\nLine 2');
    expect(result).toContain('LOCATION:Room A\\; Building 2');
  });

  it('normalizes HH:MM:SS time format from browser', () => {
    const result = formatCalendarEvent({
      title: 'Event',
      startDate: '2026-01-01',
      startTime: '09:30:45',
      endDate: '2026-01-01',
      endTime: '10:00:00',
    });
    expect(result).toContain('DTSTART:20260101T093045');
    expect(result).toContain('DTEND:20260101T100000');
  });

  it('defaults empty time to 000000 for timed events', () => {
    const result = formatCalendarEvent({
      title: 'Event',
      startDate: '2026-01-01',
      startTime: '',
      endDate: '2026-01-01',
      endTime: '',
    });
    expect(result).toContain('DTSTART:20260101T000000');
    expect(result).toContain('DTEND:20260101T000000');
  });
});

describe('formatBitcoin', () => {
  it('formats with address only', () => {
    const result = formatBitcoin({ address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa' });
    expect(result).toBe('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  });

  it('formats with all fields', () => {
    const result = formatBitcoin({
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '0.5',
      label: 'Donation',
      message: 'Thanks for your support',
    });
    expect(result).toBe(
      'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.5&label=Donation&message=Thanks%20for%20your%20support'
    );
  });

  it('formats with partial optional fields', () => {
    const result = formatBitcoin({
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '1.0',
    });
    expect(result).toBe('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=1.0');
  });

  it('does not include empty optional fields', () => {
    const result = formatBitcoin({
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '',
      label: '',
      message: '',
    });
    expect(result).toBe('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
    expect(result).not.toContain('?');
  });

  it('encodes special characters in label and message', () => {
    const result = formatBitcoin({
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      label: 'Coffee & Cake',
      message: 'Pay for order #123',
    });
    expect(result).toContain('label=Coffee%20%26%20Cake');
    expect(result).toContain('message=Pay%20for%20order%20%23123');
  });

  it('returns empty string when address is blank', () => {
    expect(formatBitcoin({ address: '' })).toBe('');
    expect(formatBitcoin({ address: '   ' })).toBe('');
    expect(formatBitcoin({ address: '', amount: '0.5', label: 'L' })).toBe('');
  });

  it('drops invalid amount from the URI', () => {
    // Invalid amount must not be passed through — would otherwise inject
    // query-param chars (e.g. "amount=0.5&label=x" via "0.5&label=x").
    const result = formatBitcoin({
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '12.5x',
      label: 'Donation',
    });
    expect(result).toBe(
      'bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?label=Donation'
    );
  });

  it('drops amount injection attempt', () => {
    const result = formatBitcoin({
      address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
      amount: '0.5&label=evil',
    });
    expect(result).toBe('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
  });
});

describe('isValidBitcoinAmount', () => {
  it('treats empty/undefined as valid (amount is optional)', () => {
    expect(isValidBitcoinAmount('')).toBe(true);
    expect(isValidBitcoinAmount(undefined)).toBe(true);
  });

  it('accepts whole-number amounts', () => {
    expect(isValidBitcoinAmount('0')).toBe(true);
    expect(isValidBitcoinAmount('1')).toBe(true);
    expect(isValidBitcoinAmount('21000000')).toBe(true);
  });

  it('accepts fractional amounts', () => {
    expect(isValidBitcoinAmount('0.5')).toBe(true);
    expect(isValidBitcoinAmount('1.00000001')).toBe(true);
    expect(isValidBitcoinAmount('12.34')).toBe(true);
  });

  it('rejects non-numeric input', () => {
    expect(isValidBitcoinAmount('abc')).toBe(false);
    expect(isValidBitcoinAmount('12.5x')).toBe(false);
    expect(isValidBitcoinAmount('1,000.5')).toBe(false);
  });

  it('rejects negatives', () => {
    expect(isValidBitcoinAmount('-1')).toBe(false);
    expect(isValidBitcoinAmount('-0.5')).toBe(false);
  });

  it('rejects malformed decimals', () => {
    expect(isValidBitcoinAmount('.5')).toBe(false);
    expect(isValidBitcoinAmount('12.')).toBe(false);
    expect(isValidBitcoinAmount('1..5')).toBe(false);
    expect(isValidBitcoinAmount(' 1.5')).toBe(false);
    expect(isValidBitcoinAmount('1.5 ')).toBe(false);
  });

  it('rejects scientific notation', () => {
    // BIP 21 grammar is a strict decimal literal, no exponent.
    expect(isValidBitcoinAmount('1e8')).toBe(false);
  });
});

describe('formatGoogleReview', () => {
  it('formats Google Review URL with Place ID', () => {
    const result = formatGoogleReview({ placeId: 'ChIJN1t_tDeuEmsRUsoyG83frY4' });
    expect(result).toBe('https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4');
  });

  it('formats with empty Place ID', () => {
    // The formatter does not sanitize — invalid input is the caller's responsibility.
    const result = formatGoogleReview({ placeId: '' });
    expect(result).toBe('https://search.google.com/local/writereview?placeid=');
  });

  it('passes Place ID through unencoded so invalid input produces an obviously-broken URL', () => {
    const result = formatGoogleReview({ placeId: 'foo&bar=baz' });
    // Note: this URL has stray query params from the unsafe `&` — by design.
    // Callers should reject invalid input via isValidGooglePlaceId.
    expect(result).toBe('https://search.google.com/local/writereview?placeid=foo&bar=baz');
  });
});

describe('isValidGooglePlaceId', () => {
  it('accepts a real Place ID', () => {
    expect(isValidGooglePlaceId('ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe(true);
  });

  it('accepts dashes and underscores', () => {
    expect(isValidGooglePlaceId('ChIJ-foo_bar123')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidGooglePlaceId('')).toBe(false);
  });

  it('rejects whitespace', () => {
    expect(isValidGooglePlaceId('ChIJ N1t_t')).toBe(false);
    expect(isValidGooglePlaceId(' ChIJN1t_t')).toBe(false);
  });

  it('rejects URL special characters', () => {
    expect(isValidGooglePlaceId('foo&bar=baz')).toBe(false);
    expect(isValidGooglePlaceId('foo?bar')).toBe(false);
    expect(isValidGooglePlaceId('foo/bar')).toBe(false);
  });

  it('rejects non-ASCII characters', () => {
    expect(isValidGooglePlaceId('ChIJé')).toBe(false);
  });
});

describe('detectQrType', () => {
  it('returns text for empty content', () => {
    expect(detectQrType('')).toBe('text');
  });

  it('detects WiFi content', () => {
    expect(detectQrType('WIFI:T:WPA;S:Network;P:pass;;')).toBe('wifi');
    expect(detectQrType('wifi:T:WPA;S:Network;;')).toBe('wifi');
  });

  it('detects vCard content', () => {
    expect(detectQrType('BEGIN:VCARD\nVERSION:3.0\nN:Doe;John\nEND:VCARD')).toBe('vcard');
    expect(detectQrType('begin:vcard')).toBe('vcard');
  });

  it('detects email content', () => {
    expect(detectQrType('mailto:test@example.com')).toBe('email');
    expect(detectQrType('MAILTO:test@example.com?subject=Hi')).toBe('email');
  });

  it('detects SMS content', () => {
    expect(detectQrType('sms:+15551234567')).toBe('sms');
    expect(detectQrType('smsto:+15551234567:message')).toBe('sms');
    expect(detectQrType('SMS:+15551234567?body=Hello')).toBe('sms');
  });

  it('detects phone content', () => {
    expect(detectQrType('tel:+15551234567')).toBe('phone');
    expect(detectQrType('TEL:5551234567')).toBe('phone');
  });

  it('detects geo content', () => {
    expect(detectQrType('geo:37.7749,-122.4194')).toBe('geo');
    expect(detectQrType('GEO:0,0')).toBe('geo');
  });

  it('detects calendar event content', () => {
    expect(detectQrType('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT')).toBe('calendar');
    expect(detectQrType('BEGIN:VEVENT\nSUMMARY:Meeting\nEND:VEVENT')).toBe('calendar');
    expect(detectQrType('begin:vcalendar')).toBe('calendar');
  });

  it('detects Bitcoin content', () => {
    expect(detectQrType('bitcoin:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa')).toBe('bitcoin');
    expect(detectQrType('BITCOIN:1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa?amount=0.5')).toBe('bitcoin');
  });

  it('detects Google Review content', () => {
    expect(detectQrType('https://search.google.com/local/writereview?placeid=ChIJN1t_tDeuEmsRUsoyG83frY4')).toBe('google-review');
  });

  it('detects URL content with protocol', () => {
    expect(detectQrType('https://example.com')).toBe('url');
    expect(detectQrType('http://example.com/path')).toBe('url');
    expect(detectQrType('HTTP://EXAMPLE.COM')).toBe('url');
  });

  it('detects URL content without protocol', () => {
    expect(detectQrType('example.com')).toBe('url');
    expect(detectQrType('sub.example.co.uk')).toBe('url');
    expect(detectQrType('test.org')).toBe('url');
  });

  it('returns text for plain text content', () => {
    expect(detectQrType('Hello, World!')).toBe('text');
    expect(detectQrType('Just some text')).toBe('text');
    expect(detectQrType('12345')).toBe('text');
  });
});
