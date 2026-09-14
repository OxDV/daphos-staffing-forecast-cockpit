import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { StaffingWeek } from '../staffing.models';

@Injectable({ providedIn: 'root' })
export class StaffingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  getStaffingWeek(weekStart: string): Observable<StaffingWeek> {
    return this.http.get<StaffingWeek>(`${this.baseUrl}/staffing-weeks`, {
      params: { weekStart },
    });
  }
}
