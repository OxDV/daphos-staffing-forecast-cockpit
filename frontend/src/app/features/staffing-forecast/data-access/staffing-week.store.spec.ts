import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { throwError } from 'rxjs';

import { StaffingApiService } from './staffing-api.service';
import { StaffingWeekStore } from './staffing-week.store';
import { CreateDemandOverrideResponse, StaffingWeek } from '../staffing.models';

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
          date: '2026-09-16',
          forecastDemand: 12,
          effectiveDemand: 12,
          plannedStaffing: 11,
          confidence: 0.8,
          isCorrected: false,
          canOverride: true,
          understaffing: 1,
        },
        {
          date: '2026-09-17',
          forecastDemand: 11,
          effectiveDemand: 11,
          plannedStaffing: 11,
          confidence: 0.75,
          isCorrected: false,
          canOverride: true,
          understaffing: 0,
        },
      ],
      summary: {
        totalUnderstaffing: 1,
        manualCorrectionCount: 0,
        averageAbsoluteDeviation: null,
      },
    },
    {
      id: 'ward-2',
      code: 'ICU',
      name: 'ICU',
      timezone: 'Europe/Berlin',
      days: [
        {
          date: '2026-09-16',
          forecastDemand: 8,
          effectiveDemand: 8,
          plannedStaffing: 8,
          confidence: 0.9,
          isCorrected: false,
          canOverride: true,
          understaffing: 0,
        },
      ],
      summary: {
        totalUnderstaffing: 0,
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

    const request = httpMock.expectOne((req) => req.params.get('weekStart') === '2026-09-14');
    request.flush(weekFixture);

    expect(store.weekStart()).toBe('2026-09-14');
    expect(store.data()).toEqual(weekFixture);
    expect(store.status()).toBe('ready');
    expect(store.dayHeaders()).toEqual(['2026-09-16', '2026-09-17']);
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
    httpMock
      .expectOne((req) => req.params.get('weekStart') === '2026-09-21')
      .flush({
        ...weekFixture,
        weekStart: '2026-09-21',
        weekEnd: '2026-09-27',
      });
    expect(store.weekStart()).toBe('2026-09-21');

    store.goToPreviousWeek();
    httpMock.expectOne((req) => req.params.get('weekStart') === '2026-09-14').flush(weekFixture);
    expect(store.weekStart()).toBe('2026-09-14');
  });

  it('selects a day, loads history, and applies override results', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush(weekFixture);

    store.selectDay({
      wardId: 'ward-1',
      wardCode: 'B3',
      wardName: 'Ward B3',
      day: weekFixture.wards[0].days[0],
    });
    httpMock
      .expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides')
      .flush({ items: [] });

    const overrideResponse: CreateDemandOverrideResponse = {
      override: {
        id: 'ov-1',
        previousDemand: 12,
        correctedDemand: 15,
        justification: 'Needed',
        correctedBy: 'demo.ward.manager@daphos.test',
        correctedAt: '2026-09-14T10:00:00Z',
      },
      day: {
        ...weekFixture.wards[0].days[0],
        effectiveDemand: 15,
        isCorrected: true,
        understaffing: 4,
      },
      summary: {
        totalUnderstaffing: 4,
        manualCorrectionCount: 1,
        averageAbsoluteDeviation: 3,
      },
    };

    let completed = false;
    store
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 15,
        justification: 'Needed',
      })
      .subscribe({
        next: () => {
          completed = true;
        },
      });

    httpMock
      .expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides')
      .flush(overrideResponse);

    expect(completed).toBe(true);
    expect(store.data()?.wards[0].days[0].effectiveDemand).toBe(15);
    expect(store.data()?.wards[0].days[1].effectiveDemand).toBe(11);
    expect(store.data()?.wards[0].summary.manualCorrectionCount).toBe(1);
    expect(store.data()?.wards[1].days[0].effectiveDemand).toBe(8);
    expect(store.history()[0].id).toBe('ov-1');
    expect(store.selectedDay()?.day.effectiveDemand).toBe(15);

    store.clearSelection();
    expect(store.selectedDay()).toBeNull();
    expect(store.history()).toEqual([]);
  });

  it('deletes an audit record and restores the selected day', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush(weekFixture);

    store.selectDay({
      wardId: 'ward-1',
      wardCode: 'B3',
      wardName: 'Ward B3',
      day: {
        ...weekFixture.wards[0].days[0],
        effectiveDemand: 15,
        isCorrected: true,
      },
    });
    httpMock.expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides').flush({
      items: [
        {
          id: 'ov-1',
          previousDemand: 12,
          correctedDemand: 15,
          justification: 'Needed',
          correctedBy: 'demo.ward.manager@daphos.test',
          correctedAt: '2026-09-14T10:00:00Z',
        },
      ],
    });

    store.deleteOverride('ward-1', '2026-09-16', 'ov-1');
    httpMock.expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides/ov-1').flush({
      day: {
        ...weekFixture.wards[0].days[0],
        effectiveDemand: 12,
        isCorrected: false,
        understaffing: 1,
      },
      summary: {
        totalUnderstaffing: 1,
        manualCorrectionCount: 0,
        averageAbsoluteDeviation: null,
      },
    });

    expect(store.history()).toEqual([]);
    expect(store.selectedDay()?.day.effectiveDemand).toBe(12);
    expect(store.data()?.wards[0].days[0].isCorrected).toBe(false);
    expect(store.deletingOverrideId()).toBeNull();
  });

  it('maps delete failures into history errors', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush(weekFixture);

    store.selectDay({
      wardId: 'ward-1',
      wardCode: 'B3',
      wardName: 'Ward B3',
      day: weekFixture.wards[0].days[0],
    });
    httpMock
      .expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides')
      .flush({ items: [] });

    store.deleteOverride('ward-1', '2026-09-16', 'ov-missing');
    httpMock
      .expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides/ov-missing')
      .flush({ detail: 'gone' }, { status: 404, statusText: 'Not Found' });

    expect(store.historyError()).toBe('Unable to delete audit record');
    expect(store.deletingOverrideId()).toBeNull();
  });

  it('ignores overlapping delete requests', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush(weekFixture);

    store.deleteOverride('ward-1', '2026-09-16', 'ov-1');
    expect(store.deletingOverrideId()).toBe('ov-1');
    store.deleteOverride('ward-1', '2026-09-16', 'ov-2');

    const pending = httpMock.match(
      '/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides/ov-1',
    );
    expect(pending).toHaveLength(1);
    pending[0].flush({
      day: weekFixture.wards[0].days[0],
      summary: weekFixture.wards[0].summary,
    });
    expect(httpMock.match('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides/ov-2')).toEqual(
      [],
    );
  });

  it('applies override without updating an unrelated selection', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush(weekFixture);

    store.selectDay({
      wardId: 'ward-2',
      wardCode: 'ICU',
      wardName: 'ICU',
      day: weekFixture.wards[1].days[0],
    });
    httpMock
      .expectOne('/api/v1/wards/ward-2/staffing-days/2026-09-16/overrides')
      .flush({ items: [] });

    store
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 15,
        justification: 'Needed',
      })
      .subscribe();

    httpMock.expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides').flush({
      override: {
        id: 'ov-3',
        previousDemand: 12,
        correctedDemand: 15,
        justification: 'Needed',
        correctedBy: 'demo.ward.manager@daphos.test',
        correctedAt: '2026-09-14T10:00:00Z',
      },
      day: {
        ...weekFixture.wards[0].days[0],
        effectiveDemand: 15,
        isCorrected: true,
        understaffing: 4,
      },
      summary: {
        totalUnderstaffing: 4,
        manualCorrectionCount: 1,
        averageAbsoluteDeviation: 3,
      },
    });

    expect(store.selectedDay()?.wardId).toBe('ward-2');
    expect(store.selectedDay()?.day.effectiveDemand).toBe(8);
    expect(store.data()?.wards[0].days[0].effectiveDemand).toBe(15);
  });

  it('maps override API errors', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush(weekFixture);

    store
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 20,
        justification: '',
      })
      .subscribe({
        error: () => undefined,
      });

    httpMock.expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides').flush(
      {
        detail: 'Override validation failed',
        fieldErrors: { justification: ['Provide a justification for this correction.'] },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );

    expect(store.overrideError()).toBe('Override validation failed');

    store
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 20,
        justification: '',
      })
      .subscribe({
        error: () => undefined,
      });
    httpMock.expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides').flush(
      {
        fieldErrors: { justification: ['Provide a justification for this correction.'] },
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    expect(store.overrideError()).toBe('Provide a justification for this correction.');

    store
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 20,
        justification: 'x',
      })
      .subscribe({
        error: () => undefined,
      });
    httpMock
      .expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides')
      .flush({}, { status: 500, statusText: 'Server Error' });
    expect(store.overrideError()).toBe('Unable to save correction');

    store
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 20,
        justification: 'x',
      })
      .subscribe({
        error: () => undefined,
      });
    httpMock
      .expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides')
      .flush(
        { fieldErrors: { justification: [] } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    expect(store.overrideError()).toBe('Unable to save correction');

    store
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 20,
        justification: 'x',
      })
      .subscribe({
        error: () => undefined,
      });
    httpMock
      .expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides')
      .flush({ detail: '' }, { status: 422, statusText: 'Unprocessable Entity' });
    expect(store.overrideError()).toBe('Unable to save correction');
  });

  it('maps non-HTTP override failures', () => {
    const api = TestBed.inject(StaffingApiService);
    jest.spyOn(api, 'createOverride').mockReturnValue(throwError(() => new Error('boom')));

    store
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 15,
        justification: 'Needed',
      })
      .subscribe({
        error: () => undefined,
      });

    expect(store.overrideError()).toBe('Unable to save correction');
  });

  it('ignores override results when week data was cleared', () => {
    store
      .createOverride('ward-1', '2026-09-16', {
        correctedDemand: 15,
        justification: 'Needed',
      })
      .subscribe();

    httpMock.expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides').flush({
      override: {
        id: 'ov-2',
        previousDemand: 12,
        correctedDemand: 15,
        justification: 'Needed',
        correctedBy: 'demo.ward.manager@daphos.test',
        correctedAt: '2026-09-14T10:00:00Z',
      },
      day: weekFixture.wards[0].days[0],
      summary: weekFixture.wards[0].summary,
    });

    expect(store.data()).toBeNull();
  });

  it('handles history load errors', () => {
    store.loadWeek('2026-09-14');
    httpMock.expectOne(() => true).flush(weekFixture);

    store.selectDay({
      wardId: 'ward-1',
      wardCode: 'B3',
      wardName: 'Ward B3',
      day: weekFixture.wards[0].days[0],
    });
    httpMock
      .expectOne('/api/v1/wards/ward-1/staffing-days/2026-09-16/overrides')
      .flush('fail', { status: 500, statusText: 'Server Error' });

    expect(store.historyError()).toBe('Unable to load audit history');
  });
});
