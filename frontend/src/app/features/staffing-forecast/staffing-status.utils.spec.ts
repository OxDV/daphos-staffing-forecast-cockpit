import {
  confidenceBand,
  staffingStatus,
} from './staffing-status.utils';

describe('staffing-status.utils', () => {
  it('classifies short, balanced, and surplus staffing', () => {
    expect(staffingStatus(14, 11)).toEqual({
      kind: 'short',
      amount: 3,
      label: 'Short 3',
      marker: '▲',
    });
    expect(staffingStatus(10, 10)).toEqual({
      kind: 'balanced',
      amount: 0,
      label: 'Balanced',
      marker: '▬',
    });
    expect(staffingStatus(10, 12)).toEqual({
      kind: 'surplus',
      amount: 2,
      label: 'Surplus 2',
      marker: '▼',
    });
  });

  it('formats fractional staffing gaps', () => {
    expect(staffingStatus(10.5, 9).label).toBe('Short 1.5');
  });

  it('classifies confidence bands on exact thresholds', () => {
    expect(confidenceBand(0.59)).toEqual({ kind: 'low', label: 'Low' });
    expect(confidenceBand(0.6)).toEqual({ kind: 'medium', label: 'Medium' });
    expect(confidenceBand(0.79)).toEqual({ kind: 'medium', label: 'Medium' });
    expect(confidenceBand(0.8)).toEqual({ kind: 'high', label: 'High' });
  });
});
