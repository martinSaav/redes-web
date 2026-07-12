import { Routes } from '@angular/router';
import { Home } from './pages/home';
import { SectionPage } from './pages/section';

export const routes: Routes = [
  { path: '', component: Home, title: 'Redes — TCP/IP capa por capa' },
  { path: 's/:slug', component: SectionPage, title: 'Redes — Sección' },
  { path: '**', redirectTo: '' },
];
