export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const LOWER_WORDS = new Set([
  'da',
  'de',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'ao',
  'aos',
  'a',
  'as',
  'o',
  'os',
  'um',
  'uma',
  'por',
  'pra',
  'pro',
  'para',
  'com',
]);

function isAllUpper(word: string): boolean {
  // considera apenas letras
  const letters = word.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  if (!letters) return false;
  return letters === letters.toUpperCase();
}

function formatSegment(segRaw: string, isFirstWord: boolean): string {
  const seg = segRaw.trim();
  if (!seg) return segRaw;

  // manter números/combinações simples
  if (/^\d+$/.test(seg)) return seg;

  // manter siglas curtas (ex.: IF, JW, TV)
  const lettersOnly = seg.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  if (lettersOnly && lettersOnly.length <= 3 && isAllUpper(seg)) {
    return seg.toUpperCase();
  }

  const lower = seg.toLowerCase();
  if (!isFirstWord && LOWER_WORDS.has(lower)) return lower;

  // capitalizar primeira letra (respeitando acentos)
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function formatWord(word: string, isFirstWord: boolean): string {
  // trata "A/B" e "A-B"
  const splitBy = (token: string, sep: string) => token.split(sep).map((p) => p);

  if (word.includes('/')) {
    return splitBy(word, '/')
      .map((part, idx) => formatWord(part, isFirstWord && idx === 0))
      .join('/');
  }
  if (word.includes('-')) {
    return splitBy(word, '-')
      .map((part, idx) => formatWord(part, isFirstWord && idx === 0))
      .join('-');
  }
  return formatSegment(word, isFirstWord);
}

export function formatNomePadrao(value: unknown): string {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';

  const words = raw.split(' ').filter(Boolean);
  const out = words.map((w, idx) => formatWord(w, idx === 0));
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

