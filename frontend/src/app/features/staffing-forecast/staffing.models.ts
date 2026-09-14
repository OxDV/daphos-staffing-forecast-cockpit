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

export interface DemandOverride {
  id: string;
  previousDemand: number;
  correctedDemand: number;
  justification: string;
  correctedBy: string;
  correctedAt: string;
}

export interface CreateDemandOverrideRequest {
  correctedDemand: number;
  justification: string;
}

export interface CreateDemandOverrideResponse {
  override: DemandOverride;
  day: StaffingDay;
  summary: WardWeekSummary;
}

export interface DemandOverrideHistoryResponse {
  items: DemandOverride[];
}

export interface SelectedStaffingDay {
  wardId: string;
  wardCode: string;
  wardName: string;
  day: StaffingDay;
}
