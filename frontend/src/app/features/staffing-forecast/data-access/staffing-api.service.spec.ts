import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { StaffingApiService } from './staffing-api.service';
import { CreateDemandOverrideResponse, StaffingWeek } from '../staffing.models';

describe('StaffingApiService', () => {
  let service: StaffingApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(StaffingApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('requests a staffing week by weekStart', () => {
    const response = {
      weekStart: '2026-09-14',
      weekEnd: '2026-09-20',
      today: '2026-09-14',
      overridePolicy: {
        absoluteJustificationThreshold: 2,
        relativeJustificationThreshold: 0.2,
      },
      wards: [],
    } satisfies StaffingWeek;

    let actual: StaffingWeek | undefined;
    service.getStaffingWeek('2026-09-14').subscribe((week) => {
      actual = week;
    });

    const request = httpMock.expectOne(
      (req) =>
        req.url === '/api/v1/staffing-weeks' && req.params.get('weekStart') === '2026-09-14',
    );
    expect(request.request.method).toBe('GET');
    request.flush(response);
    expect(actual).toEqual(response);
  });

  it('creates overrides and loads history', () => {
    const createResponse = {
      override: {
        id: 'ov-1',
        previousDemand: 12,
        correctedDemand: 14,
        justification: 'Needed',
        correctedBy: 'demo.ward.manager@daphos.test',
        correctedAt: '2026-09-14T10:00:00Z',
      },
      day: {
        date: '2026-09-16',
        forecastDemand: 12,
        effectiveDemand: 14,
        plannedStaffing: 11,
        confidence: 0.7,
        isCorrected: true,
        canOverride: true,
        understaffing: 3,
      },
      summary: {
        totalUnderstaffing: 3,
        manualCorrectionCount: 1,
        averageAbsoluteDeviation: 2,
      },
    } satisfies CreateDemandOverrideResponse;

    let created: CreateDemandOverrideResponse | undefined;
    service
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 14,
        justification: 'Needed',
      })
      .subscribe((response) => {
        created = response;
      });

    const createRequest = httpMock.expectOne(
      '/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides',
    );
    expect(createRequest.request.method).toBe('POST');
    createRequest.flush(createResponse);
    expect(created).toEqual(createResponse);

    let historyItems = 0;
    service.getOverrideHistory('ward-1', '2026-09-16').subscribe((response) => {
      historyItems = response.items.length;
    });
    const historyRequest = httpMock.expectOne(
      '/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides',
    );
    historyRequest.flush({ items: [createResponse.override] });
    expect(historyItems).toBe(1);
  });
});
