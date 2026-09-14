import { filterVisibleWards } from './ward-visibility.utils';
import { WardWeek } from './staffing.models';

const wards: WardWeek[] = [
  {
    id: 'ward-1',
    code: 'B3',
    name: 'Ward B3',
    timezone: 'Europe/Berlin',
    days: [],
    summary: {
      totalUnderstaffing: 0,
      manualCorrectionCount: 0,
      averageAbsoluteDeviation: null,
    },
  },
  {
    id: 'ward-2',
    code: 'ICU',
    name: 'ICU',
    timezone: 'Europe/Berlin',
    days: [],
    summary: {
      totalUnderstaffing: 0,
      manualCorrectionCount: 0,
      averageAbsoluteDeviation: null,
    },
  },
];

describe('filterVisibleWards', () => {
  it('returns all wards when none are hidden', () => {
    expect(filterVisibleWards(wards, new Set())).toEqual(wards);
  });

  it('hides unchecked wards', () => {
    expect(filterVisibleWards(wards, new Set(['ward-1']))).toEqual([wards[1]]);
  });
});
