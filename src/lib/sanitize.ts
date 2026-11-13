/**
 * HTML sanitizer used for the response "Preview" tab.
 *
 * The preview never executes JavaScript: active content (script/style/iframe...),
 * event handler attributes and dangerous URL schemes are stripped, and the
 * sanitized markup is rendered inside a sandboxed iframe (no allow-scripts) as
 * a second line of defense.
 */

const ALLOWED_TAGS = new Set([
  'A', 'ABBR', 'ARTICLE', 'ASIDE', 'B', 'BLOCKQUOTE', 'BR', 'CAPTION', 'CITE',
  'CODE', 'DD', 'DEL', 'DETAILS', 'DFN', 'DIV', 'DL', 'DT', 'EM', 'FIGCAPTION',
  'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'I',
  'IMG', 'INS', 'KBD', 'LI', 'MAIN', 'MARK', 'NAV', 'OL', 'P', 'PRE', 'Q', 'S',
  'SECTION', 'SMALL', 'SPAN', 'STRONG', 'SUB', 'SUMMARY', 'SUP', 'TABLE',
  'TBODY', 'TD', 'TFOOT', 'TH', 'THEAD', 'TIME', 'TR', 'U', 'UL',
]);

const DROP_WITH_CONTENT = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE',
  'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SELECT', 'OPTION', 'SVG', 'MATH',
  'LINK', 'META', 'BASE', 'TITLE', 'FRAME', 'FRAMESET', 'APPLET', 'DIALOG',
]);

const VOID_TAGS = new Set(['BR', 'HR', 'IMG']);

const GLOBAL_ATTRS = new Set(['title', 'lang', 'dir']);

const TAG_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href']),
  IMG: new Set(['src', 'alt', 'width', 'height']),
  OL: new Set(['start', 'type']),
  TD: new Set(['colspan', 'rowspan']),
  TH: new Set(['colspan', 'rowspan', 'scope']),
  TIME: new Set(['datetime']),
  DEL: new Set(['datetime']),
  INS: new Set(['datetime']),
  Q: new Set(['cite']),
  BLOCKQUOTE: new Set(['cite']),
};

function escapeText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Returns the URL when it is safe to link/embed, otherwise null. */
export function safeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  // Relative URLs are allowed (they resolve against the data: srcdoc doc, harmless).
  if (/^[#./]/.test(trimmed) && !/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return null;
}

function isSafeImageSource(value: string): boolean {
  const trimmed = value.trim();
  if (/^https?:/i.test(trimmed)) return true;
  if (/^data:image\/(png|jpe?g|gif|webp|bmp);base64,/i.test(trimmed)) return true;
  return false;
}

/**
 * Sanitizes untrusted HTML into a conservative allowlist-based subset.
 * All script execution vectors are removed; the result is inert markup.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';

  // Prefer DOMParser so no external resources are fetched during parsing.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const output: string[] = [];

  const walk = (node: Node): void => {
    if (node.nodeType === Node.TEXT_NODE) {
      output.push(escapeText(node.textContent ?? ''));
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as Element;
    const tag = el.tagName.toUpperCase();

    if (DROP_WITH_CONTENT.has(tag)) return; // drop element and its subtree

    if (!ALLOWED_TAGS.has(tag)) {
      // Unknown-but-harmless tag: unwrap, keep children.
      for (const child of Array.from(el.childNodes)) walk(child);
      return;
    }

    const attrs: string[] = [];
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) continue; // event handlers never allowed

      const allowed = TAG_ATTRS[tag];
      const isAllowed =
        (allowed !== undefined && allowed.has(name)) || GLOBAL_ATTRS.has(name);
      if (!isAllowed) continue;

      if (name === 'href') {
        const url = safeUrl(attr.value);
        if (!url) continue;
        attrs.push(`href="${escapeAttr(url)}"`);
      } else if (name === 'src') {
        if (!isSafeImageSource(attr.value)) continue;
        attrs.push(`src="${escapeAttr(attr.value.trim())}"`);
      } else {
        attrs.push(`${name}="${escapeAttr(attr.value)}"`);
      }
    }

    const attrString = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
    const lower = tag.toLowerCase();

    if (VOID_TAGS.has(tag)) {
      output.push(`<${lower}${attrString}>`);
      return;
    }

    output.push(`<${lower}${attrString}>`);
    for (const child of Array.from(el.childNodes)) walk(child);
    output.push(`</${lower}>`);
  };

  for (const child of Array.from(doc.body.childNodes)) walk(child);
  return output.join('');
}
