import sanitizeHtml from 'sanitize-html';
/** Formatting-only HTML: no media, scripts, event attributes, classes or arbitrary CSS. */
export function cleanPolicyHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: ['h1','h2','h3','h4','p','br','ul','ol','li','strong','b','em','i','u','s','blockquote','span','a'],
    allowedAttributes: {'*': ['style'], a: ['href','title','target','rel']},
    allowedSchemes: ['http','https','mailto'],
    allowProtocolRelative: false,
    allowedStyles: {'*': {
      'text-align': [/^(left|right|center|justify)$/],
      color: [/^#[0-9a-fA-F]{3,8}$/],
      'background-color': [/^#[0-9a-fA-F]{3,8}$/],
      'font-weight': [/^(bold|normal|[1-9]00)$/],
      'font-size': [/^(1[0-9]|2[0-8])px$/],
    }},
    transformTags: {a: (_tag, attributes) => ({tagName: 'a', attribs: {...attributes, target: '_blank', rel: 'noopener noreferrer'}})},
  });
}
export function policyText(value: string, format?: string) {
  return (format === 'html' ? sanitizeHtml(cleanPolicyHtml(value), {allowedTags: [], allowedAttributes: {}}) : value).replace(/&(?:nbsp|#160);/gi, ' ').trim();
}
