import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  CreateDemandOverrideRequest,
  CreateDemandOverrideResponse,
  DemandOverrideHistoryResponse,
  StaffingWeek,
} from '../staffing.models';

@Injectable({ providedIn: 'root' })
export class StaffingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  getStaffingWeek(weekStart: string): Observable<StaffingWeek> {
    return this.http.get<StaffingWeek>(`${this.baseUrl}/staffing-weeks`, {
      params: { weekStart },
    });
  }

  createOverride(
    wardId: string,
    serviceDate: string,
    payload: CreateDemandOverrideRequest,
  ): Observable<CreateDemandOverrideResponse> {
    return this.http.post<CreateDemandOverrideResponse>(
      `${this.baseUrl}/wards/${wardId}/staffing-days/${serviceDate}/overrides`,
      payload,
    );
  }

  getOverrideHistory(
    wardId: string,
    serviceDate: string,
  ): Observable<DemandOverrideHistoryResponse> {
    return this.http.get<DemandOverrideHistoryResponse>(
      `${this.baseUrl}/wards/${wardId}/staffing-days/${serviceDate}/overrides`,
    );
  }
}
