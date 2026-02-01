import { describe, it, expect } from 'vitest';
import {
  formatWifi,
  formatVCard,
  formatEmail,
  formatSms,
  formatPhone,
  formatGeo,
  formatUrl,
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
      latitude: 37.7749,
      longitude: -122.4194,
    });
    expect(result).toBe('geo:37.7749,-122.4194');
  });

  it('handles negative coordinates', () => {
    const result = formatGeo({
      latitude: -33.8688,
      longitude: 151.2093,
    });
    expect(result).toBe('geo:-33.8688,151.2093');
  });

  it('handles zero coordinates', () => {
    const result = formatGeo({
      latitude: 0,
      longitude: 0,
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
    expect(detectQrType('BEGIN:VEVENT\nSUMMARY:Meeting\nEND:VEVENT')).toBe('calendar');
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
