/* 식단 & 영양 대시보드 — 화면 렌더링
   data.json 하나만 읽어서 요약·차트·타임라인을 모두 그립니다.
   평균/달성일수/비율은 여기서 계산하므로 data.json에 손으로 넣지 않습니다. */

const $ = (sel) => document.querySelector(sel);
const nf = (n, d = 0) =>
  Number(n).toLocaleString('ko-KR', { minimumFractionDigits: d, maximumFractionDigits: d });
const g = (n) => nf(Number(n).toFixed(1).replace(/\.0$/, ''));

let DATA = null;
let THEME_COLORS = {};

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (name) => cs.getPropertyValue(name).trim();
  THEME_COLORS = {
    green: v('--green'), greenMid: v('--green-mid'), gold: v('--gold'),
    slate: v('--slate'), ink: v('--ink'), ink2: v('--ink-2'), ink3: v('--ink-3'),
    ink4: v('--ink-4'), line: v('--line'), lineSoft: v('--line-soft'),
    panel: v('--panel'), bgSoft: v('--bg-soft'), red: v('--red'),
  };
}

/* ── 집계 ─────────────────────────────────── */
function summarize(data) {
  const days = data.days;
  const t = data.targets;
  const recorded = days.filter((d) => d.recorded);
  const complete = days.filter((d) => d.complete);
  const num = (arr, k) => arr.reduce((s, d) => s + (d[k] || 0), 0);

  const avgKcal = complete.length ? num(complete, 'kcal') / complete.length : 0;
  const avgP = complete.length ? num(complete, 'protein') / complete.length : 0;
  const avgC = complete.length ? num(complete, 'carb') / complete.length : 0;
  const avgF = complete.length ? num(complete, 'fat') / complete.length : 0;

  const ec = num(complete, 'carb') * 4;
  const ep = num(complete, 'protein') * 4;
  const ef = num(complete, 'fat') * 9;
  const et = ec + ep + ef || 1;
  const pct = { carb: (ec / et) * 100, protein: (ep / et) * 100, fat: (ef / et) * 100 };

  const mid = (t.kcalMin + t.kcalMax) / 2;
  const proteinHits = days.filter((d) => d.protein >= t.proteinMin);

  return { days, recorded, complete, avgKcal, avgP, avgC, avgF, pct, mid, proteinHits, targets: t };
}

/* ── KPI 카드 ─────────────────────────────── */
function renderKpis(s) {
  const deficit = s.mid - s.avgKcal;
  const deficitPct = Math.round((deficit / s.mid) * 100);
  const cards = [
    {
      lab: '기록 일수',
      num: s.recorded.length,
      unit: '일',
      sub: `${s.days.length}일 중 · 3식 완전 기록 <b>${s.complete.length}일</b>`,
    },
    {
      lab: '평균 섭취 열량',
      accent: true,
      flag: deficit > 0 ? `적자 ${deficitPct}%` : null,
      num: nf(s.avgKcal),
      unit: 'kcal',
      sub: `완전 기록일 기준 · 권장 중간값(${nf(s.mid)}) 대비 <b>${deficit > 0 ? '−' : '+'}${nf(Math.abs(deficit))} kcal</b>`,
    },
    {
      lab: '평균 단백질',
      num: Number(s.avgP.toFixed(1)),
      unit: 'g',
      sub: `목표 ${s.targets.proteinMin}–${s.targets.proteinMax}g 대비 <b>목표의 ${Math.round((s.avgP / s.targets.proteinMin) * 100)}%</b> · 하루 ${(s.targets.proteinMin - s.avgP).toFixed(1)}g 부족`,
    },
    {
      lab: '단백질 목표 달성',
      num: s.proteinHits.length,
      unit: '일',
      sub: s.proteinHits.length
        ? `${s.proteinHits.map((d) => d.date.slice(5).replace('-', '/')).join(' · ')}`
        : '아직 달성한 날이 없습니다',
    },
  ];

  $('#kpis').innerHTML = cards
    .map(
      (c) => `
    <article class="kpi ${c.accent ? 'kpi--accent' : ''}">
      ${c.flag ? `<span class="kpi__flag">${c.flag}</span>` : ''}
      <p class="kpi__lab">${c.lab}</p>
      <p class="kpi__num">${c.num}<span>${c.unit}</span></p>
      <p class="kpi__sub">${c.sub}</p>
    </article>`
    )
    .join('');
}

/* ── 게이지 3종 ───────────────────────────── */
function renderGauges(s) {
  const t = s.targets;
  const kcalScale = 2600;
  const pScale = 100;

  const calorieBar = `
    <div class="gauge">
      <div class="gauge__top">
        <span class="gauge__name">평균 열량</span>
        <span class="gauge__val">${nf(s.avgKcal)}<small>kcal</small></span>
      </div>
      <div class="gauge__track">
        <span class="gauge__fill" style="width:${(s.avgKcal / kcalScale) * 100}%"></span>
        <span class="gauge__band" style="left:${(t.kcalMin / kcalScale) * 100}%;width:${((t.kcalMax - t.kcalMin) / kcalScale) * 100}%"></span>
      </div>
      <div class="gauge__scale"><span>0</span><span>권장 ${nf(t.kcalMin)}–${nf(t.kcalMax)}</span><span>${nf(kcalScale)}</span></div>
      <p class="gauge__note">권장 중간값 대비 <b>${nf(Math.round(s.mid - s.avgKcal))} kcal 적자</b> · 감량 페이스 유지 구간</p>
    </div>`;

  const proteinBar = `
    <div class="gauge">
      <div class="gauge__top">
        <span class="gauge__name">평균 단백질</span>
        <span class="gauge__val">${s.avgP.toFixed(1)}<small>g</small></span>
      </div>
      <div class="gauge__track">
        <span class="gauge__fill" style="width:${(s.avgP / pScale) * 100}%;background:var(--gold)"></span>
        <span class="gauge__band gauge__band--gold" style="left:${(t.proteinMin / pScale) * 100}%;width:${((t.proteinMax - t.proteinMin) / pScale) * 100}%"></span>
      </div>
      <div class="gauge__scale"><span>0</span><span>목표 ${t.proteinMin}–${t.proteinMax}g</span><span>100</span></div>
      <p class="gauge__note">목표 하한까지 <b>${(t.proteinMin - s.avgP).toFixed(1)}g</b> 남음 · 달성 ${s.proteinHits.length}일</p>
    </div>`;

  const ratio = Math.round((s.proteinHits.length / (s.complete.length || 1)) * 100);
  const hitBar = `
    <div class="gauge">
      <div class="gauge__top">
        <span class="gauge__name">목표 달성률</span>
        <span class="gauge__val">${ratio}<small>%</small></span>
      </div>
      <div class="gauge__track">
        <span class="gauge__fill" style="width:${ratio}%"></span>
      </div>
      <div class="gauge__scale"><span>완전 기록 ${s.complete.length}일 중 ${s.proteinHits.length}일</span></div>
      <p class="gauge__note">후반 3일 중 2일 달성 — <b>점심에 몰아 채우는 방식</b>이 통한 결과</p>
    </div>`;

  $('#gauges').innerHTML = calorieBar + proteinBar + hitBar;
}

/* ── 추이 차트 ────────────────────────────── */
/* 넓은 화면(1000폭)과 좁은 화면(420폭) 두 가지 기하로 그립니다.
   SVG는 viewBox로 늘어나므로, 좁은 화면에서는 글자를 크게 잡아야 읽힙니다. */
function renderTrend(s) {
  const c = THEME_COLORS;
  const days = s.days;
  const box = $('#trendChart');
  const narrow = (box.clientWidth || 900) < 620;

  const W = narrow ? 420 : 1000;
  const H = narrow ? 340 : 400;
  const M = narrow ? { l: 30, r: 30, t: 16, b: 44 } : { l: 48, r: 54, t: 22, b: 54 };
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;
  const kcalMax = 2600, pMax = 100;
  const slot = pw / days.length;
  const bw = narrow ? Math.min(20, slot * 0.52) : Math.min(46, slot * 0.5);
  const fs = narrow ? 11 : 11.5;

  const x = (i) => M.l + slot * (i + 0.5);
  const yk = (v) => M.t + ph - (v / kcalMax) * ph;
  const yp = (v) => M.t + ph - (v / pMax) * ph;

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="일자별 열량과 단백질 추이">`);

  // 권장 구간
  parts.push(
    `<rect x="${M.l}" y="${yk(s.targets.kcalMax).toFixed(1)}" width="${pw}" height="${(
      yk(s.targets.kcalMin) - yk(s.targets.kcalMax)
    ).toFixed(1)}" fill="${c.green}" opacity="0.09"/>`
  );
  // 가로 격자 + 좌축 라벨
  const ticks = narrow ? [0, 1000, 2000] : [0, 500, 1000, 1500, 2000, 2500];
  for (const v of ticks) {
    parts.push(`<line x1="${M.l}" x2="${W - M.r}" y1="${yk(v).toFixed(1)}" y2="${yk(v).toFixed(1)}" stroke="${c.lineSoft}" stroke-width="1"/>`);
    parts.push(`<text x="${M.l - 7}" y="${(yk(v) + 4).toFixed(1)}" text-anchor="end" font-size="${narrow ? 10 : 11}" fill="${c.ink4}">${nf(v)}</text>`);
  }
  for (const v of [s.targets.kcalMin, s.targets.kcalMax]) {
    parts.push(`<line x1="${M.l}" x2="${W - M.r}" y1="${yk(v).toFixed(1)}" y2="${yk(v).toFixed(1)}" stroke="${c.green}" stroke-width="1" stroke-dasharray="5 5" opacity="0.5"/>`);
  }
  parts.push(`<text x="${W - M.r + 6}" y="${(yk(s.targets.kcalMax) + 3).toFixed(1)}" font-size="${narrow ? 9.5 : 10.5}" fill="${c.green}" font-weight="700">권장</text>`);

  // 우축 단백질 라벨
  for (const v of narrow ? [50, 100] : [0, 50, 100]) {
    parts.push(`<text x="${W - M.r + 6}" y="${(yp(v) + 4).toFixed(1)}" font-size="${narrow ? 9.5 : 10.5}" fill="${c.gold}">${v}g</text>`);
  }
  // 단백질 목표 밴드
  parts.push(
    `<rect x="${M.l}" y="${yp(s.targets.proteinMax).toFixed(1)}" width="${pw}" height="${(
      yp(s.targets.proteinMin) - yp(s.targets.proteinMax)
    ).toFixed(1)}" fill="${c.gold}" opacity="0.16"/>`
  );
  parts.push(`<line x1="${M.l}" x2="${W - M.r}" y1="${yp(s.targets.proteinMin).toFixed(1)}" y2="${yp(s.targets.proteinMin).toFixed(1)}" stroke="${c.gold}" stroke-width="1" stroke-dasharray="4 4" opacity="0.75"/>`);

  // 막대
  days.forEach((d, i) => {
    if (!d.kcal) {
      parts.push(`<text x="${x(i).toFixed(0)}" y="${(yk(0) - 8).toFixed(0)}" text-anchor="middle" font-size="${narrow ? 9.5 : 10.5}" fill="${c.ink4}">무기록</text>`);
      return;
    }
    const top = yk(d.kcal);
    const h = Math.max(2, yk(0) - top);
    if (d.complete) {
      parts.push(
        `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="4" fill="${c.green}"/>`
      );
    } else {
      parts.push(
        `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw}" height="${h.toFixed(1)}" rx="4" fill="none" stroke="${c.ink4}" stroke-width="1.3" stroke-dasharray="4 3"/>`
      );
    }
    // 좁은 화면에서는 막대 위 숫자가 겹치므로 4자리만 축약
    const label = narrow ? (d.kcal >= 1000 ? (d.kcal / 1000).toFixed(1) + 'k' : String(d.kcal)) : nf(d.kcal);
    parts.push(
      `<text x="${x(i).toFixed(0)}" y="${(top - 6).toFixed(1)}" text-anchor="middle" font-size="${narrow ? 9.5 : 11.5}" font-weight="700" fill="${d.complete ? c.ink : c.ink3}">${label}</text>`
    );
  });

  // 단백질 선(완전 기록일만 연결) + 점
  const full = days.filter((d) => d.complete);
  if (full.length > 1) {
    const pts = full.map((d) => `${x(days.indexOf(d)).toFixed(1)},${yp(d.protein).toFixed(1)}`).join(' ');
    parts.push(`<polyline points="${pts}" fill="none" stroke="${c.gold}" stroke-width="${narrow ? 2 : 2.4}" stroke-linejoin="round" opacity="0.9"/>`);
  }
  days.forEach((d, i) => {
    if (!d.recorded) return;
    const cx0 = x(i), cy0 = yp(d.protein);
    if (d.complete) {
      parts.push(`<circle cx="${cx0.toFixed(1)}" cy="${cy0.toFixed(1)}" r="${narrow ? 3.4 : 5}" fill="${c.gold}" stroke="${c.panel}" stroke-width="1.6"/>`);
    } else {
      parts.push(`<circle cx="${cx0.toFixed(1)}" cy="${cy0.toFixed(1)}" r="${narrow ? 3 : 4.2}" fill="${c.panel}" stroke="${c.gold}" stroke-width="1.8"/>`);
    }
    parts.push(
      `<text x="${cx0.toFixed(0)}" y="${(cy0 - 8).toFixed(1)}" text-anchor="middle" font-size="${narrow ? 9 : 10.5}" font-weight="600" fill="${c.gold}">${g(d.protein)}</text>`
    );
  });

  // x축 라벨 + 히트 영역
  days.forEach((d, i) => {
    const label = narrow ? d.date.slice(8) : d.date.slice(5).replace('-', '.');
    parts.push(
      `<text x="${x(i).toFixed(0)}" y="${(M.t + ph + (narrow ? 16 : 20)).toFixed(0)}" text-anchor="middle" font-size="${fs}" fill="${c.ink3}">${label}</text>`
    );
    if (!narrow) {
      parts.push(
        `<text x="${x(i).toFixed(0)}" y="${(M.t + ph + 34).toFixed(0)}" text-anchor="middle" font-size="10" fill="${c.ink4}">${d.dow}</text>`
      );
    }
    parts.push(
      `<rect class="hit" x="${(M.l + slot * i).toFixed(1)}" y="${M.t}" width="${slot.toFixed(1)}" height="${ph}"
        data-tip="${d.date.replace(/-/g, '.')} (${d.dow}) · ${d.kcal ? nf(d.kcal) + ' kcal' : '기록 없음'}${d.recorded ? ' · 단백질 ' + g(d.protein) + 'g' : ''}"/>
        <line class="hl" x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${M.t}" y2="${M.t + ph}" stroke="${c.ink}" stroke-width="1" opacity="0" pointer-events="none"/>`
    );
  });

  parts.push("</svg>");
  box.innerHTML = parts.join("");
}

/* ── 탄단지 도넛 + 막대 ────────────────────── */
function renderMacro(s) {
  const c = THEME_COLORS;
  const segs = [
    { key: 'carb', name: '탄수화물', val: s.pct.carb, col: c.greenMid, band: s.targets.macro.carb },
    { key: 'protein', name: '단백질', val: s.pct.protein, col: c.gold, band: s.targets.macro.protein },
    { key: 'fat', name: '지방', val: s.pct.fat, col: c.slate, band: s.targets.macro.fat },
  ];

  // 도넛
  const R = 86, r = 54, cx = 96, cy = 96;
  const pt = (a, rad) => [cx + rad * Math.cos((a * Math.PI) / 180), cy + rad * Math.sin((a * Math.PI) / 180)];
  let a = -90;
  const arcs = segs.map((sg) => {
    const sweep = (sg.val / 100) * 360;
    const [x0o, y0o] = pt(a + 0.8, R);
    const [x1o, y1o] = pt(a + sweep - 0.8, R);
    const [x1i, y1i] = pt(a + sweep - 0.8, r);
    const [x0i, y0i] = pt(a + 0.8, r);
    const large = sweep > 180 ? 1 : 0;
    a += sweep;
    return `<path d="M ${x0o.toFixed(2)} ${y0o.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${x1o.toFixed(2)} ${y1o.toFixed(2)}
      L ${x1i.toFixed(2)} ${y1i.toFixed(2)} A ${r} ${r} 0 ${large} 0 ${x0i.toFixed(2)} ${y0i.toFixed(2)} Z" fill="${sg.col}"/>`;
  });
  const ratioText = `${Math.round(s.pct.carb)}:${Math.round(s.pct.protein)}:${Math.round(s.pct.fat)}`;
  $('#macroDonut').innerHTML = `
    <svg viewBox="0 0 192 192" role="img" aria-label="탄단지 평균 비율 도넛">
      ${arcs.join('')}
      <text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="11" fill="${c.ink3}">탄 : 단 : 지</text>
      <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="21" font-weight="800" fill="${c.ink}">${ratioText}</text>
      <text x="${cx}" y="${cy + 31}" text-anchor="middle" font-size="10" fill="${c.ink4}">완전 기록 ${s.complete.length}일 평균</text>
    </svg>
    <div class="macro__legend">
      ${segs.map((sg) => `<span><i style="background:${sg.col}"></i>${Math.round(sg.val)}%</span>`).join('')}
    </div>`;

  // 권장 구간 대비 막대
  const scaleMax = 75, w = 300;
  $('#macroBars').innerHTML = segs
    .map((sg) => {
      const [lo, hi] = sg.band;
      const fillW = (sg.val / scaleMax) * w;
      const bx = (lo / scaleMax) * w;
      const bw = ((hi - lo) / scaleMax) * w;
      return `
      <div class="mrow">
        <div class="mrow__top">
          <span class="mrow__name"><i style="background:${sg.col}"></i>${sg.name}</span>
          <span class="mrow__val">${Math.round(sg.val)}%<em>권장 ${lo}–${hi}%</em></span>
        </div>
        <svg class="mrow__bar" viewBox="0 0 ${w} 22" preserveAspectRatio="none" role="img" aria-label="${sg.name} ${Math.round(sg.val)}퍼센트">
          <rect x="0" y="7" width="${w}" height="8" rx="4" fill="${c.lineSoft}"/>
          <rect x="0" y="7" width="${fillW.toFixed(1)}" height="8" rx="4" fill="${sg.col}"/>
          <rect x="${bx.toFixed(1)}" y="3" width="${bw.toFixed(1)}" height="16" rx="5" fill="${sg.col}" opacity="0.10"/>
          <rect x="${bx.toFixed(1)}" y="3" width="${bw.toFixed(1)}" height="16" rx="5" fill="none" stroke="${sg.col}" stroke-width="1.2" stroke-dasharray="3 3"/>
        </svg>
      </div>`;
    })
    .join('');
}

/* ── 일자별 타임라인 ──────────────────────── */
function renderDays(s) {
  const t = s.targets;
  $('#days').innerHTML = s.days
    .slice()
    .reverse()
    .map((d) => {
      const hit = d.protein >= t.proteinMin;
      const pill = !d.complete
        ? `<span class="pill pill--part">${d.status}</span>`
        : hit
        ? `<span class="pill pill--ok">단백질 달성</span>`
        : `<span class="pill pill--miss">단백질 미달</span>`;
      const menus = d.meals
        .filter((m) => !m.empty && m.kcal)
        .map((m) => m.menu.split(',')[0].split('+')[0].trim())
        .join(' · ');
      const meals = d.meals.length
        ? d.meals
            .map(
              (m) => `
          <div class="meal ${m.empty ? 'meal--empty' : ''}">
            <div class="meal__slot">${m.slot}${m.time ? `<span>${m.time}</span>` : ''}</div>
            <div>
              <div class="meal__menu">${m.menu}</div>
              ${m.note ? `<div class="meal__note">${m.note}</div>` : ''}
            </div>
            <div class="meal__k">
              ${m.kcal ? `${nf(m.kcal)}<i>kcal</i>` : '—'}
              ${m.protein !== undefined && m.kcal ? `<div class="meal__macro">탄 ${g(m.carb)} · 단 ${g(m.protein)} · 지 ${g(m.fat)}</div>` : ''}
            </div>
          </div>`
            )
            .join('')
        : `<div class="meal meal--empty"><div class="meal__slot">—</div><div class="meal__menu">이 날은 기록이 없습니다.</div><div></div></div>`;

      return `
      <details class="day" ${d.date === s.days[s.days.length - 1].date ? 'open' : ''}>
        <summary class="day__sum">
          <div class="day__date">${d.date.slice(5).replace('-', '.')}<span>${d.dow}</span></div>
          <div class="day__menus">${menus || '기록 없음'}</div>
          <div class="day__kcal">${d.kcal ? `${nf(d.kcal)}<i>kcal</i>` : '—'}</div>
          <div class="day__tags">${pill}</div>
        </summary>
        <div class="day__body">
          <div class="meals">${meals}</div>
          <div class="advice"><b>총평</b> · ${d.advice}</div>
        </div>
      </details>`;
    })
    .join('');
}

/* ── 툴팁 ─────────────────────────────────── */
function bindTooltip() {
  const tip = $('#tooltip');
  document.addEventListener('mousemove', (e) => {
    const t = e.target.closest('[data-tip]');
    if (!t) {
      tip.classList.remove('on');
      return;
    }
    tip.textContent = t.dataset.tip;
    tip.style.left = `${e.clientX}px`;
    tip.style.top = `${e.clientY - 8}px`;
    tip.classList.add('on');
  });
  document.addEventListener('mouseleave', () => tip.classList.remove('on'));
}

/* ── 테마 ─────────────────────────────────── */
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $('#themeLabel').textContent = theme === 'dark' ? '다크' : '라이트';
  $('#themeToggle').setAttribute('aria-pressed', theme === 'dark');
  try { localStorage.setItem('diet-theme', theme); } catch (e) {}
  readColors();
  if (DATA) {
    const s = summarize(DATA);
    renderTrend(s);
    renderMacro(s);
  }
}

function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('diet-theme'); } catch (e) {}
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  $('#themeToggle').addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
  });
}

/* ── 시작 ─────────────────────────────────── */
async function boot() {
  readColors();
  bindTooltip();
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`data.json ${res.status}`);
    DATA = await res.json();
  } catch (err) {
    $('#kpis').innerHTML = `<article class="kpi"><p class="kpi__lab">데이터를 읽지 못했습니다</p>
      <p class="kpi__sub">${err.message} · 잠시 후 새로고침해 주세요.</p></article>`;
    return;
  }

  const s = summarize(DATA);
  $('#updated').textContent = DATA.site.updated.replace(/-/g, '.');
  $('#completeCount').textContent = s.complete.length;
  $('#siteNote').textContent = DATA.site.note;

  renderKpis(s);
  renderGauges(s);
  renderTrend(s);
  renderMacro(s);
  renderDays(s);

  // 테마 초기화는 데이터 렌더 뒤에 (차트 색을 다시 칠하기 위해)
  initTheme();
  let rt = null;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      const st = summarize(DATA);
      renderTrend(st);
      renderMacro(st);
    }, 160);
  });
}

boot();
