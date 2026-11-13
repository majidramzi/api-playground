import { describe, expect, it } from 'vitest';
import { safeUrl, sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('keeps safe markup and text content', () => {
    const out = sanitizeHtml('<h1>Title</h1><p>Hello <strong>world</strong></p>');
    expect(out).toContain('<h1>');
    expect(out).toContain('Title');
    expect(out).toContain('<strong>world</strong>');
  });

  it('removes script tags and their content', () => {
    const out = sanitizeHtml('<p>ok</p><script>alert("xss")</script>');
    expect(out).toContain('<p>ok</p>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('alert');
  });

  it('removes style, iframe and other active elements with their content', () => {
    const out = sanitizeHtml(
      '<style>body{display:none}</style><iframe src="https://evil.test"></iframe><object data="x"></object>',
    );
    expect(out).toBe('');
  });

  it('strips event handler attributes', () => {
    const out = sanitizeHtml('<img src="https://x.test/a.png" onerror="alert(1)" alt="pic">');
    expect(out).not.toContain('onerror');
    expect(out).not.toContain('alert');
    expect(out).toContain('alt="pic"');
  });

  it('removes javascript: and data: URLs from links', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">click</a>');
    expect(out).not.toContain('javascript');
    expect(out).toContain('click');
    const out2 = sanitizeHtml('<a href="data:text/html,<script>1</script>">x</a>');
    expect(out2).not.toContain('data:');
  });

  it('keeps safe link URLs', () => {
    const out = sanitizeHtml('<a href="https://example.com/page" title="t">link</a>');
    expect(out).toContain('href="https://example.com/page"');
    expect(out).toContain('title="t"');
  });

  it('keeps http(s) and base64 image sources only', () => {
    expect(sanitizeHtml('<img src="https://x.test/a.png">')).toContain('src="https://x.test/a.png"');
    expect(
      sanitizeHtml('<img src="data:image/png;base64,iVBORw0KGgo=">'),
    ).toContain('data:image/png;base64');
    expect(sanitizeHtml('<img src="javascript:alert(1)">')).not.toContain('javascript');
  });

  it('unwraps unknown tags but keeps their text', () => {
    const out = sanitizeHtml('<custom-tag>text</custom-tag>');
    expect(out).toBe('text');
    expect(out).not.toContain('custom-tag');
  });

  it('escapes text content that looks like markup', () => {
    const out = sanitizeHtml('<p>&lt;b&gt;not bold&lt;/b&gt;</p>');
    expect(out).toContain('&lt;b&gt;not bold&lt;/b&gt;');
    expect(out).not.toContain('<b>not bold');
  });

  it('returns an empty string for empty input', () => {
    expect(sanitizeHtml('')).toBe('');
  });
});

describe('safeUrl', () => {
  it('allows http, https, mailto and tel schemes', () => {
    expect(safeUrl('https://x.test')).toBe('https://x.test');
    expect(safeUrl('http://x.test')).toBe('http://x.test');
    expect(safeUrl('mailto:a@b.test')).toBe('mailto:a@b.test');
    expect(safeUrl('tel:+123')).toBe('tel:+123');
  });

  it('rejects dangerous schemes', () => {
    expect(safeUrl('javascript:alert(1)')).toBeNull();
    expect(safeUrl('data:text/html,x')).toBeNull();
    expect(safeUrl('vbscript:x')).toBeNull();
    expect(safeUrl('')).toBeNull();
  });
});
