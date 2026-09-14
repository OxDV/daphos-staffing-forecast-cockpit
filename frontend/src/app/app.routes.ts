import { Routes } from '@angular/router';

import { ForecastCockpitPage } from './features/staffing-forecast/pages/forecast-cockpit-page/forecast-cockpit-page';

export const routes: Routes = [
  {
    path: '',
    component: ForecastCockpitPage,
  },
  {
    path: '**',
    redirectTo: '',
  },
];
