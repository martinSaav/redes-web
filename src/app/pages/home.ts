import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SECTIONS } from '../data/content';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="hero">
      <div class="hero-tag">Kurose &amp; Ross · Computer Networking, 8ª ed. · Final oral FIUBA</div>
      <h1>Redes <span class="grad">capa por capa</span></h1>
      <p class="sub">
        El resumen completo de la materia, organizado por capas del modelo TCP/IP + seguridad,
        con <strong>animaciones interactivas</strong> de los protocolos clave: DNS, TCP, DHCP, NAT,
        ARP, traceroute, TLS y el viaje completo de una petición web.
      </p>
      <div class="stack">
        @for (s of layers; track s.slug) {
          <a class="layer" [routerLink]="['/s', s.slug]" [style.--c]="s.color">
            <span class="icon">{{ s.icon }}</span>
            <span class="name">{{ s.title }}</span>
            <span class="arrow">→</span>
          </a>
        }
      </div>
    </div>

    <h2 class="grid-title">Todas las secciones</h2>
    <div class="grid">
      @for (s of sections; track s.slug) {
        <a class="card" [routerLink]="['/s', s.slug]" [style.--c]="s.color">
          <div class="card-top">
            <span class="card-icon">{{ s.icon }}</span>
            <span class="chip">{{ s.layerTag }}</span>
          </div>
          <div class="card-title">{{ s.title }}</div>
          <div class="card-tag">{{ s.tagline }}</div>
          <div class="card-meta">
            {{ s.topics.length }} temas
            @if (animCount(s.slug); as n) {
              · {{ n }} animación{{ n > 1 ? 'es' : '' }} ▶
            }
          </div>
        </a>
      }
    </div>
  `,
  styles: `
    .hero {
      text-align: center;
      padding: 40px 16px 26px;
      max-width: 880px;
      margin: 0 auto;
    }
    .hero-tag {
      display: inline-block;
      font-size: 0.8rem;
      color: var(--text-dim);
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 20px;
      padding: 5px 14px;
      margin-bottom: 18px;
    }
    h1 { font-size: clamp(2rem, 5vw, 3.2rem); margin: 0 0 14px; line-height: 1.15; }
    .grad {
      background: linear-gradient(90deg, #58a6ff, #a78bfa, #ec4899);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .sub { color: var(--text-dim); font-size: 1.05rem; max-width: 640px; margin: 0 auto 28px; }
    .sub strong { color: var(--text); }

    .stack { display: flex; flex-direction: column; gap: 6px; max-width: 480px; margin: 0 auto; }
    .layer {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--panel);
      border: 1px solid var(--border);
      border-left: 4px solid var(--c);
      border-radius: 10px;
      padding: 11px 18px;
      color: var(--text);
      font-weight: 600;
      transition: transform 0.15s, border-color 0.15s, background 0.15s;
    }
    .layer:hover { transform: translateX(6px); background: var(--panel-2); border-color: var(--c); }
    .layer .icon { font-size: 1.2rem; }
    .layer .arrow { margin-left: auto; color: var(--c); }

    .grid-title { max-width: 1180px; margin: 40px auto 14px; padding: 0 16px; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 14px;
      max-width: 1180px;
      margin: 0 auto 56px;
      padding: 0 16px;
    }
    .card {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 18px;
      color: var(--text);
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
    }
    .card:hover {
      transform: translateY(-3px);
      border-color: var(--c);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    }
    .card-top { display: flex; justify-content: space-between; align-items: center; }
    .card-icon { font-size: 1.6rem; }
    .chip {
      font-size: 0.7rem;
      color: var(--c);
      border: 1px solid var(--c);
      border-radius: 12px;
      padding: 2px 9px;
      opacity: 0.9;
    }
    .card-title { font-weight: 700; font-size: 1.1rem; }
    .card-tag { color: var(--text-dim); font-size: 0.87rem; flex: 1; }
    .card-meta { color: var(--c); font-size: 0.8rem; font-weight: 600; }
  `,
})
export class Home {
  readonly sections = SECTIONS;
  // pila de capas estilo modelo TCP/IP (de aplicación hacia abajo) + extras
  readonly layers = [
    this.find('aplicacion'),
    this.find('transporte'),
    this.find('red-data'),
    this.find('red-control'),
    this.find('enlace'),
    this.find('wireless'),
    this.find('seguridad'),
  ];

  private find(slug: string) {
    return SECTIONS.find((s) => s.slug === slug)!;
  }

  animCount(slug: string): number {
    const s = SECTIONS.find((x) => x.slug === slug)!;
    return s.topics.filter((t) => t.widget).length;
  }
}
