import { OverridePolicy, StaffingDay } from '../../staffing.models';

export interface OverrideDialogData {
  wardId: string;
  wardName: string;
  day: StaffingDay;
  policy: OverridePolicy;
}
