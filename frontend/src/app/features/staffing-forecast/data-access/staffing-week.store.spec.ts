import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { StaffingWeekStore } from './staffing-week.store';
import { StaffingWeek } from '../staffing.models';

const weekFixture: StaffingWeek = {
  weekStart: '2026-09-14',
  weekEnd: '2026-09-20',
  today: '2026-09-14',
  overridePolicy: {
    absoluteJustificationThreshold: 2,
    relativeJustificationThreshold: 0.2,
  },
  wards: [
    {
      id: 'ward-1',
      code: 'B3',
      name: 'Ward B3',
      timezone: 'Europe/Berlin',
      days: [
        {
          date: '2026-09-14',
          forecastDemand: 12,
          effectiveDemand: 12,
          plannedStaffing: 11,
          confidence: 0.8,
          isCorrected: false,
          canOverride: true,
          understaffing: 1,
        },
      ],
      summary: {
        totalUnderstaffing: 1,
        manualCorrectionCount: 0,
        averageAbsoluteDeviation: null,
      },
    },
  ],
};

describe('StaffingWeekStore', () => {
  let store: StaffingWeekStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(StaffingWeekStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('exposes idle status before the first load', () => {
    expect(store.status()).toBe('idle');
    expect(store.dayHeaders()).toEqual([]);
  });

  it('loads a week and exposes ready status', () => {
    store.loadWeek('2026-09-16');
    expect(store.status()).toBe('loading');

    const request = httpMock.expectOne(
      (req) => req.params.get('weekStart') === '2026-09-14',
    );
    request.flush(weekFixture);

    expect(store.weekStart()).toBe('2026-09-14');
    expect(store.data()).toEqual(weekFixture);
    expect(store.status()).toBe('ready');
    expect(store.dayHeaders()).toEqual(['2026-09-14']);
  });

  it('exposes empty status when the API returns no wards', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush({ ...weekFixture, wards: [] });

    expect(store.status()).toBe('empty');
    expect(store.dayHeaders()).toEqual([]);
  });

  it('exposes error status and supports retry', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush('fail', { status: 500, statusText: 'Server Error' });

    expect(store.status()).toBe('error');
    expect(store.error()).toBe('Unable to load staffing week');

    store.retry();
    httpMock.expectOne(() => true).flush(weekFixture);
    expect(store.status()).toBe('ready');
  });

  it('navigates to previous and next weeks', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush(weekFixture);

    store.goToNextWeek();
    httpMock.expectOne((req) => req.params.get('weekStart') === '2026-09-21').flush({
      ...weekFixture,
      weekStart: '2026-09-21',
      weekEnd: '2026-09-27',
    });
    expect(store.weekStart()).toBe('2026-09-21');

    store.goToPreviousWeek();
    httpMock.expectOne((req) => req.params.get('weekStart') === '2026-09-14').flush(weekFixture);
    expect(store.weekStart()).toBe('2026-09-14');
  });
});
