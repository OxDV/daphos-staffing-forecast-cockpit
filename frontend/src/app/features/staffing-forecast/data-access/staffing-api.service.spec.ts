import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { StaffingApiService } from './staffing-api.service';
import { StaffingWeek } from '../staffing.models';

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
});
