import { WardWeek } from './staffing.models';

export function filterVisibleWards(
  wards: WardWeek[],
  hiddenWardIds: ReadonlySet<string>,
): WardWeek[] {
  if (hiddenWardIds.size === 0) {
    return wards;
  }
  return wards.filter((ward) => !hiddenWardIds.has(ward.id));
}
