import { ResolveFn, Routes } from '@angular/router';
import { Home } from './pages/home';
import { SectionPage } from './pages/section';
import { SECTIONS } from './data/content';

/** título de la pestaña con el nombre real de la sección */
const sectionTitle: ResolveFn<string> = (route) => {
  const s = SECTIONS.find((x) => x.slug === route.paramMap.get('slug'));
  return s ? `${s.icon} ${s.title} — Redes` : 'Redes';
};

export const routes: Routes = [
  { path: '', component: Home, title: 'Redes — TCP/IP capa por capa' },
  { path: 's/:slug', component: SectionPage, title: sectionTitle },
  { path: '**', redirectTo: '' },
];
