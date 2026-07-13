import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SECTIONS } from '../data/content';
import { CwndChart } from '../components/cwnd-chart';
import { TcpSeq } from '../components/detail/tcp-seq';
import { GbnSim } from '../components/detail/gbn-sim';
import { NatDetail } from '../components/detail/nat-detail';
import { EncapAnim } from '../components/detail/encap-anim';
import { SwitchDetail } from '../components/detail/switch-detail';
import { DnsDetail } from '../components/detail/dns-detail';
import { DayDetail } from '../components/detail/day-detail';
import { DelaysDetail } from '../components/detail/delays-detail';
import { CdnDetail } from '../components/detail/cdn-detail';
import { MitmDetail } from '../components/detail/mitm-detail';
import { DhcpDetail } from '../components/detail/dhcp-detail';
import { TracerouteDetail } from '../components/detail/traceroute-detail';
import { ArpDetail } from '../components/detail/arp-detail';
import { WifiDetail } from '../components/detail/wifi-detail';
import { TlsDetail } from '../components/detail/tls-detail';
import { FragDetail } from '../components/detail/frag-detail';
import { DijkstraDetail } from '../components/detail/dijkstra-detail';
import { BgpDetail } from '../components/detail/bgp-detail';
import { SubnetDetail } from '../components/detail/subnet-detail';
import { CsmacdDetail } from '../components/detail/csmacd-detail';
import { QuizDetail } from '../components/detail/quiz-detail';
import { RouterDetail } from '../components/detail/router-detail';
import { SdnDetail } from '../components/detail/sdn-detail';
import { DvDetail } from '../components/detail/dv-detail';
import { Http2Detail } from '../components/detail/http2-detail';
import { WpaDetail } from '../components/detail/wpa-detail';
import { IpsecDetail } from '../components/detail/ipsec-detail';
import { PlayoutDetail } from '../components/detail/playout-detail';
import { TcpSim } from '../components/detail/tcp-sim';
import { CrcDetail } from '../components/detail/crc-detail';
import { SwitchingDetail } from '../components/detail/switching-detail';
import { FlowctlDetail } from '../components/detail/flowctl-detail';
import { MacDetail } from '../components/detail/mac-detail';

@Component({
  selector: 'app-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CwndChart,
    TcpSeq,
    GbnSim,
    NatDetail,
    EncapAnim,
    SwitchDetail,
    DnsDetail,
    DayDetail,
    DelaysDetail,
    CdnDetail,
    MitmDetail,
    DhcpDetail,
    TracerouteDetail,
    ArpDetail,
    WifiDetail,
    TlsDetail,
    FragDetail,
    DijkstraDetail,
    BgpDetail,
    SubnetDetail,
    CsmacdDetail,
    QuizDetail,
    RouterDetail,
    SdnDetail,
    DvDetail,
    Http2Detail,
    WpaDetail,
    IpsecDetail,
    PlayoutDetail,
    TcpSim,
    CrcDetail,
    SwitchingDetail,
    FlowctlDetail,
    MacDetail,
  ],
  template: `
    @if (section(); as sec) {
      <div class="page" [style.--c]="sec.color">
        <header class="sec-head">
          <div class="chip">{{ sec.layerTag }}</div>
          <h1><span class="icon">{{ sec.icon }}</span> {{ sec.title }}</h1>
          <p class="tagline">{{ sec.tagline }}</p>
        </header>

        <nav class="toc">
          @for (t of sec.topics; track $index; let i = $index) {
            <a [href]="'#t' + i" class="toc-item">{{ i + 1 }}. {{ t.title }}</a>
          }
        </nav>

        @for (t of sec.topics; track $index; let i = $index) {
          <article class="topic" [id]="'t' + i">
            <h2><span class="num">{{ i + 1 }}</span> {{ t.title }}</h2>
            <div class="topic-body" [innerHTML]="t.html"></div>
            @switch (t.widget) {
              @case ('cwnd') { <app-cwnd-chart /> }
              @case ('tcp-seq') { <app-tcp-seq /> }
              @case ('gbn-sim') { <app-gbn-sim /> }
              @case ('nat-detail') { <app-nat-detail /> }
              @case ('encap') { <app-encap-anim /> }
              @case ('switch-detail') { <app-switch-detail /> }
              @case ('dns-detail') { <app-dns-detail /> }
              @case ('day-detail') { <app-day-detail /> }
              @case ('delays-detail') { <app-delays-detail /> }
              @case ('cdn-detail') { <app-cdn-detail /> }
              @case ('mitm-detail') { <app-mitm-detail /> }
              @case ('dhcp-detail') { <app-dhcp-detail /> }
              @case ('traceroute-detail') { <app-traceroute-detail /> }
              @case ('arp-detail') { <app-arp-detail /> }
              @case ('wifi-detail') { <app-wifi-detail /> }
              @case ('tls-detail') { <app-tls-detail /> }
              @case ('frag-detail') { <app-frag-detail /> }
              @case ('dijkstra-detail') { <app-dijkstra-detail /> }
              @case ('bgp-detail') { <app-bgp-detail /> }
              @case ('subnet-detail') { <app-subnet-detail /> }
              @case ('csmacd-detail') { <app-csmacd-detail /> }
              @case ('quiz-detail') { <app-quiz-detail /> }
              @case ('router-detail') { <app-router-detail /> }
              @case ('sdn-detail') { <app-sdn-detail /> }
              @case ('dv-detail') { <app-dv-detail /> }
              @case ('http2-detail') { <app-http2-detail /> }
              @case ('wpa-detail') { <app-wpa-detail /> }
              @case ('ipsec-detail') { <app-ipsec-detail /> }
              @case ('playout-detail') { <app-playout-detail /> }
              @case ('tcp-sim') { <app-tcp-sim /> }
              @case ('crc-detail') { <app-crc-detail /> }
              @case ('switching-detail') { <app-switching-detail /> }
              @case ('flowctl-detail') { <app-flowctl-detail /> }
              @case ('mac-detail') { <app-mac-detail /> }
            }
          </article>
        }

        <nav class="pager">
          @if (prev(); as p) {
            <a class="pg" [routerLink]="['/s', p.slug]">← {{ p.icon }} {{ p.short }}</a>
          } @else {
            <a class="pg" routerLink="/">← 🏠 Inicio</a>
          }
          @if (next(); as n) {
            <a class="pg next" [routerLink]="['/s', n.slug]">{{ n.icon }} {{ n.short }} →</a>
          } @else {
            <a class="pg next" routerLink="/">🏠 Inicio →</a>
          }
        </nav>
      </div>
    } @else {
      <div class="page">
        <h1>Sección no encontrada</h1>
        <p><a routerLink="/">Volver al inicio</a></p>
      </div>
    }
  `,
  styles: `
    .page { width: calc(50% + 590px); max-width: 100%; margin: 0 auto; padding: 28px 24px 60px; }
    .sec-head { margin-bottom: 22px; }
    .chip {
      display: inline-block;
      font-size: 0.75rem;
      color: var(--c);
      border: 1px solid var(--c);
      border-radius: 14px;
      padding: 3px 12px;
      margin-bottom: 10px;
    }
    h1 { margin: 0 0 6px; font-size: clamp(1.6rem, 4vw, 2.3rem); }
    .icon { margin-right: 4px; }
    .tagline { color: var(--text-dim); margin: 0; font-size: 1.02rem; }

    .toc {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 18px 0 30px;
    }
    .toc-item {
      font-size: 0.82rem;
      color: var(--text-dim);
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 4px 12px;
      transition: color 0.15s, border-color 0.15s;
    }
    .toc-item:hover { color: var(--c); border-color: var(--c); }

    .topic { margin-bottom: 36px; scroll-margin-top: 20px; }
    .topic h2 {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 1.25rem;
      border-bottom: 1px solid var(--border);
      padding-bottom: 10px;
      margin: 0 0 14px;
    }
    .num {
      flex-shrink: 0;
      width: 28px;
      height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--c);
      color: #0d1117;
      font-size: 0.9rem;
      font-weight: 800;
      border-radius: 8px;
    }

    .pager { display: flex; justify-content: space-between; gap: 12px; margin-top: 44px; }
    .pg {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 12px 18px;
      color: var(--text);
      font-weight: 600;
      transition: border-color 0.15s, transform 0.15s;
    }
    .pg:hover { border-color: var(--c); transform: translateY(-2px); }
  `,
})
export class SectionPage {
  // route param binding (withComponentInputBinding)
  readonly slug = input.required<string>();

  readonly section = computed(() => SECTIONS.find((s) => s.slug === this.slug()));

  readonly prev = computed(() => {
    const i = SECTIONS.findIndex((s) => s.slug === this.slug());
    return i > 0 ? SECTIONS[i - 1] : null;
  });

  readonly next = computed(() => {
    const i = SECTIONS.findIndex((s) => s.slug === this.slug());
    return i >= 0 && i < SECTIONS.length - 1 ? SECTIONS[i + 1] : null;
  });

}
