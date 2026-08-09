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
import { CastDetail } from '../components/detail/cast-detail';
import { DvconvDetail } from '../components/detail/dvconv-detail';
import { MobilityDetail } from '../components/detail/mobility-detail';
import { MediumDetail } from '../components/detail/medium-detail';
import { CellularDetail } from '../components/detail/cellular-detail';
import { AssocDetail } from '../components/detail/assoc-detail';
import { CsmacaDetail } from '../components/detail/csmaca-detail';
import { Frame80211Detail } from '../components/detail/frame80211-detail';
import { CryptoDetail } from '../components/detail/crypto-detail';
import { CbcDetail } from '../components/detail/cbc-detail';
import { SignDetail } from '../components/detail/sign-detail';
import { AuthprotoDetail } from '../components/detail/authproto-detail';
import { FirewallDetail } from '../components/detail/firewall-detail';
import { SecpropsDetail } from '../components/detail/secprops-detail';
import { FabricDetail } from '../components/detail/fabric-detail';
import { BgppropagDetail } from '../components/detail/bgppropag-detail';
import { OspfDetail } from '../components/detail/ospf-detail';
import { RipDetail } from '../components/detail/rip-detail';

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
    CastDetail,
    DvconvDetail,
    MobilityDetail,
    MediumDetail,
    CellularDetail,
    AssocDetail,
    CsmacaDetail,
    Frame80211Detail,
    CryptoDetail,
    CbcDetail,
    SignDetail,
    AuthprotoDetail,
    FirewallDetail,
    SecpropsDetail,
    FabricDetail,
    BgppropagDetail,
    OspfDetail,
    RipDetail,
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
            <a [routerLink]="['/s', sec.slug]" [fragment]="'t' + i" class="toc-item">{{ i + 1 }}. {{ t.title }}</a>
          }
        </nav>

        @for (t of sec.topics; track $index; let i = $index) {
          <article class="topic" [id]="'t' + i">
            <h2><span class="num">{{ i + 1 }}</span> {{ t.title }}</h2>
            <div class="topic-body" [innerHTML]="t.html"></div>
            @switch (t.widget) {
              @case ('cwnd') {
                @defer (on viewport; prefetch on idle) { <app-cwnd-chart /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('tcp-seq') {
                @defer (on viewport; prefetch on idle) { <app-tcp-seq /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('gbn-sim') {
                @defer (on viewport; prefetch on idle) { <app-gbn-sim /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('nat-detail') {
                @defer (on viewport; prefetch on idle) { <app-nat-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('encap') {
                @defer (on viewport; prefetch on idle) { <app-encap-anim /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('switch-detail') {
                @defer (on viewport; prefetch on idle) { <app-switch-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('dns-detail') {
                @defer (on viewport; prefetch on idle) { <app-dns-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('day-detail') {
                @defer (on viewport; prefetch on idle) { <app-day-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('delays-detail') {
                @defer (on viewport; prefetch on idle) { <app-delays-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('cdn-detail') {
                @defer (on viewport; prefetch on idle) { <app-cdn-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('mitm-detail') {
                @defer (on viewport; prefetch on idle) { <app-mitm-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('dhcp-detail') {
                @defer (on viewport; prefetch on idle) { <app-dhcp-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('traceroute-detail') {
                @defer (on viewport; prefetch on idle) { <app-traceroute-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('arp-detail') {
                @defer (on viewport; prefetch on idle) { <app-arp-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('wifi-detail') {
                @defer (on viewport; prefetch on idle) { <app-wifi-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('tls-detail') {
                @defer (on viewport; prefetch on idle) { <app-tls-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('frag-detail') {
                @defer (on viewport; prefetch on idle) { <app-frag-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('dijkstra-detail') {
                @defer (on viewport; prefetch on idle) { <app-dijkstra-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('bgp-detail') {
                @defer (on viewport; prefetch on idle) { <app-bgp-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('subnet-detail') {
                @defer (on viewport; prefetch on idle) { <app-subnet-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('csmacd-detail') {
                @defer (on viewport; prefetch on idle) { <app-csmacd-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('quiz-detail') {
                @defer (on viewport; prefetch on idle) { <app-quiz-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('router-detail') {
                @defer (on viewport; prefetch on idle) { <app-router-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('sdn-detail') {
                @defer (on viewport; prefetch on idle) { <app-sdn-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('dv-detail') {
                @defer (on viewport; prefetch on idle) { <app-dv-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('http2-detail') {
                @defer (on viewport; prefetch on idle) { <app-http2-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('wpa-detail') {
                @defer (on viewport; prefetch on idle) { <app-wpa-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('ipsec-detail') {
                @defer (on viewport; prefetch on idle) { <app-ipsec-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('playout-detail') {
                @defer (on viewport; prefetch on idle) { <app-playout-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('tcp-sim') {
                @defer (on viewport; prefetch on idle) { <app-tcp-sim /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('crc-detail') {
                @defer (on viewport; prefetch on idle) { <app-crc-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('switching-detail') {
                @defer (on viewport; prefetch on idle) { <app-switching-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('flowctl-detail') {
                @defer (on viewport; prefetch on idle) { <app-flowctl-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('mac-detail') {
                @defer (on viewport; prefetch on idle) { <app-mac-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('cast-detail') {
                @defer (on viewport; prefetch on idle) { <app-cast-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('dvconv-detail') {
                @defer (on viewport; prefetch on idle) { <app-dvconv-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('mobility-detail') {
                @defer (on viewport; prefetch on idle) { <app-mobility-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('medium-detail') {
                @defer (on viewport; prefetch on idle) { <app-medium-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('cellular-detail') {
                @defer (on viewport; prefetch on idle) { <app-cellular-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('assoc-detail') {
                @defer (on viewport; prefetch on idle) { <app-assoc-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('csmaca-detail') {
                @defer (on viewport; prefetch on idle) { <app-csmaca-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('frame80211-detail') {
                @defer (on viewport; prefetch on idle) { <app-frame80211-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('crypto-detail') {
                @defer (on viewport; prefetch on idle) { <app-crypto-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('cbc-detail') {
                @defer (on viewport; prefetch on idle) { <app-cbc-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('sign-detail') {
                @defer (on viewport; prefetch on idle) { <app-sign-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('authproto-detail') {
                @defer (on viewport; prefetch on idle) { <app-authproto-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('firewall-detail') {
                @defer (on viewport; prefetch on idle) { <app-firewall-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('secprops-detail') {
                @defer (on viewport; prefetch on idle) { <app-secprops-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('fabric-detail') {
                @defer (on viewport; prefetch on idle) { <app-fabric-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('bgppropag-detail') {
                @defer (on viewport; prefetch on idle) { <app-bgppropag-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('ospf-detail') {
                @defer (on viewport; prefetch on idle) { <app-ospf-detail /> }
                @placeholder { <div class="wph"></div> }
              }
              @case ('rip-detail') {
                @defer (on viewport; prefetch on idle) { <app-rip-detail /> }
                @placeholder { <div class="wph"></div> }
              }
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

    /* Placeholder mientras el diagrama (lazy) entra en viewport.
       El min-height evita que el scroll salte cuando se carga. */
    .wph {
      min-height: 420px;
      margin: 18px 0;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background:
        linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.035) 50%, transparent 70%),
        var(--panel);
      background-size: 220% 100%, auto;
      animation: wph-shimmer 1.6s ease-in-out infinite;
    }
    @keyframes wph-shimmer { from { background-position: 180% 0, 0 0; } to { background-position: -80% 0, 0 0; } }
    @media (prefers-reduced-motion: reduce) { .wph { animation: none; } }

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
