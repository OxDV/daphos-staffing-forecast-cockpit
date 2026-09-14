import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeekNavigation } from './week-navigation';

describe('WeekNavigation', () => {
  let fixture: ComponentFixture<WeekNavigation>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeekNavigation],
    }).compileComponents();

    fixture = TestBed.createComponent(WeekNavigation);
    fixture.componentRef.setInput('weekRangeLabel', '14 – 20 Sep 2026');
    fixture.componentRef.setInput('weekNumberLabel', 'Week 38');
    fixture.componentRef.setInput('todayLabel', 'Today · 2026-09-14');
    fixture.detectChanges();
  });

  it('renders week labels and emits navigation events', () => {
    const previousSpy = jest.fn();
    const nextSpy = jest.fn();
    fixture.componentInstance.previousWeek.subscribe(previousSpy);
    fixture.componentInstance.nextWeek.subscribe(nextSpy);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#week-range-label')?.textContent).toContain('14 – 20 Sep 2026');
    expect(compiled.querySelector('#week-number-label')?.textContent).toContain('Week 38');
    expect(compiled.querySelector('#week-today-badge')?.textContent).toContain(
      'Today · 2026-09-14',
    );

    compiled.querySelector<HTMLButtonElement>('#week-previous-button')?.click();
    compiled.querySelector<HTMLButtonElement>('#week-next-button')?.click();

    expect(previousSpy).toHaveBeenCalledTimes(1);
    expect(nextSpy).toHaveBeenCalledTimes(1);
  });
});
