export interface OverridePolicy {
  absoluteJustificationThreshold: number;
  relativeJustificationThreshold: number;
}

export interface WardWeekSummary {
  totalUnderstaffing: number;
  manualCorrectionCount: number;
  averageAbsoluteDeviation: number | null;
}

export interface StaffingDay {
  date: string;
  forecastDemand: number;
  effectiveDemand: number;
  plannedStaffing: number;
  confidence: number;
  isCorrected: boolean;
  canOverride: boolean;
  understaffing: number;
}

export interface WardWeek {
  id: string;
  code: string;
  name: string;
  timezone: string;
  days: StaffingDay[];
  summary: WardWeekSummary;
}

export interface StaffingWeek {
  weekStart: string;
  weekEnd: string;
  today: string;
  overridePolicy: OverridePolicy;
  wards: WardWeek[];
}
