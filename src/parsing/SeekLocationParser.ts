export type ParsedLocation = {
  suburbs: string;
  state: string;
};

function applyMetroState(statePart: string): string {
  const s = (statePart || '').trim();
  if (!s) return '';
  if (s.includes('NSW')) return 'Sydney (NSW)';
  if (s.includes('VIC')) return 'Melbourne (VIC)';
  if (s.includes('QLD')) return 'Brisbane (QLD)';
  return s;
}

/** SRP: Seek location string → suburb + state labels used in CSV. */
export function parseSeekLocation(locationRaw: string | null | undefined): ParsedLocation {
  const location = String(locationRaw || '')
    .replace(/，/g, ',')
    .replace(/\s+/g, ' ')
    .trim();

  if (!location) return { suburbs: '', state: '' };

  const parts = location.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    return {
      suburbs: parts[0],
      state: applyMetroState(parts.slice(1).join(', ')),
    };
  }

  return { suburbs: parts[0] || '', state: '' };
}
