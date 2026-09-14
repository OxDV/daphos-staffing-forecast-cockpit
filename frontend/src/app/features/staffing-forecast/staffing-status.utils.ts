export type StaffingStatusKind = 'short' | 'balanced' | 'surplus';
export type ConfidenceBandKind = 'low' | 'medium' | 'high';

export interface StaffingStatusView {
  kind: StaffingStatusKind;
  amount: number;
  label: string;
  marker: string;
}

export interface ConfidenceBandView {
  kind: ConfidenceBandKind;
  label: string;
}

function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

export function staffingStatus(effectiveDemand: number, plannedStaffing: number): StaffingStatusView {
  const gap = effectiveDemand - plannedStaffing;

  if (gap > 0) {
    return {
      kind: 'short',
      amount: gap,
      label: `Short ${formatAmount(gap)}`,
      marker: '▲',
    };
  }

  if (gap < 0) {
    const amount = Math.abs(gap);
    return {
      kind: 'surplus',
      amount,
      label: `Surplus ${formatAmount(amount)}`,
      marker: '▼',
    };
  }

  return {
    kind: 'balanced',
    amount: 0,
    label: 'Balanced',
    marker: '▬',
  };
}

export function confidenceBand(confidence: number): ConfidenceBandView {
  if (confidence < 0.6) {
    return { kind: 'low', label: 'Low' };
  }
  if (confidence < 0.8) {
    return { kind: 'medium', label: 'Medium' };
  }
  return { kind: 'high', label: 'High' };
}
