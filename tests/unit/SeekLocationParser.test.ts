import { describe, expect, it } from 'vitest';
import { parseSeekLocation } from '../../src/parsing/SeekLocationParser.js';

describe('parseSeekLocation', () => {
  it('splits suburb and maps NSW metro state', () => {
    expect(parseSeekLocation('Richmond, Sydney NSW')).toEqual({
      suburbs: 'Richmond',
      state: 'Sydney (NSW)',
    });
  });

  it('maps VIC and QLD metros', () => {
    expect(parseSeekLocation('Southbank, Melbourne VIC')).toEqual({
      suburbs: 'Southbank',
      state: 'Melbourne (VIC)',
    });
    expect(parseSeekLocation('Fortitude Valley, Brisbane QLD')).toEqual({
      suburbs: 'Fortitude Valley',
      state: 'Brisbane (QLD)',
    });
  });

  it('keeps non-metro state text as-is', () => {
    expect(parseSeekLocation('Hobart, TAS')).toEqual({
      suburbs: 'Hobart',
      state: 'TAS',
    });
  });
});
