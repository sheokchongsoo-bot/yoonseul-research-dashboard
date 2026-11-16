/* ============================================================
   윤슬 · Research & Tech Dashboard
   data.json → DOM. 외부 라이브러리 없음.
   ============================================================ */

(() => {
  'use strict';

  const $ = (sel, root = document) => root.querySelector(sel);
  /* 같은 URL을 다시 받지 않도록 매번 다른 질의를 붙인다 (Pages CDN 캐시 회피) */
  const DATA_URL = `data.json?t=${Date.now()}`;

  /* ---------- helpers ---------- */

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  };

  const dotDate = (iso) => {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${y}.${m}.${d}`;
  };

  const shortDate = (iso) => {
    if (!iso) return '—';
    const [, m, d] = iso.split('-');
    return `${Number(m)}.${String(Number(d)).padStart(2, '0')}`;
  };

  const markReveal = (node) => {
    if (!('IntersectionObserver' in window)) return node;
    node.classList.add('reveal');
    revealObserver.observe(node);
    return node;
  };

  let revealObserver = null;

  /* ---------- theme ---------- */

  const THEME_KEY = 'yoonseul-dashboard-theme';
  const root = document.documentElement;
  const themeToggle = $('#themeToggle');
  const themeLabel = $('#themeLabel');

  const applyTheme = (theme, persist) => {
    root.setAttribute('data-theme', theme);
    const dark = theme === 'dark';
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', dark ? '라이트 모드로 전환' : '다크 모드로 전환');
    if (themeLabel) themeLabel.textContent = dark ? '다크' : '라이트';
    if (persist) {
      try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* 저장 불가 환경 무시 */ }
    }
  };

  const initialTheme = (() => {
    try {
      const saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) { /* 무시 */ }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  })();

  applyTheme(initialTheme, false);

  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ---------- copy ---------- */

  const copyText = async (text) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* 아래 fallback */ }

    const area = el('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(area);
    return ok;
  };

  const flash = (button, ok) => {
    const original = button.dataset.idleLabel || button.textContent;
    button.dataset.idleLabel = original;
    button.textContent = ok ? '복사됨' : '실패';
    button.classList.toggle('is-done', ok);
    window.clearTimeout(button._timer);
    button._timer = window.setTimeout(() => {
      button.textContent = original;
      button.classList.remove('is-done');
    }, 1600);
  };

  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.copy');
    if (!button) return;
    const targetId = button.dataset.copyTarget;
    const source = targetId
      ? document.getElementById(targetId)
      : button.parentElement && button.parentElement.querySelector('code');
    if (!source) return;
    const ok = await copyText(source.textContent);
    flash(button, ok);
  });

  /* ---------- render: stats ---------- */

  const renderStats = (data) => {
    const host = $('#stats');
    if (!host) return;
    host.replaceChildren();

    const aiItems = (data.ai && data.ai.items) || [];
    const prompts = aiItems.reduce((sum, item) => {
      return sum + ((item.steps || []).filter((s) => s.prompt).length);
    }, 0);
    const transport = data.transport || {};
    const tools = (transport.featured || []).length + (transport.tools || []).length;

    const stats = [
      { value: String(aiItems.length), unit: '편', label: 'AI 아카이브', hint: '카드뉴스 · 1일 1스킬' },
      { value: String(prompts), unit: '개', label: '바로 쓰는 프롬프트', hint: '한 번에 복사' },
      { value: String(tools), unit: '개', label: '오픈소스 큐레이션', hint: '교통 · 데이터 도구' },
      { value: shortDate(data.site && data.site.updated), unit: '', label: '최종 갱신', hint: 'data.json 기준' }
    ];

    stats.forEach((s) => {
      const card = el('div', 'stat');
      const value = el('div', 'stat__value');
      value.appendChild(document.createTextNode(s.value));
      if (s.unit) value.appendChild(el('small', null, s.unit));
      card.appendChild(value);
      card.appendChild(el('div', 'stat__label', s.label));
      card.appendChild(el('div', 'stat__hint', s.hint));
      host.appendChild(markReveal(card));
    });
  };

  /* ---------- render: AI ---------- */

  const buildCard = (item) => {
    const card = el('article', 'card');
    card.id = `ai-${item.id || Math.random().toString(36).slice(2)}`;
    card.dataset.tags = (item.tags || []).join('|');

    const meta = el('div', 'card__meta');
    if (item.series) meta.appendChild(el('span', 'card__series', item.series));
    if (item.ep) meta.appendChild(el('span', 'card__ep', item.ep));
    if (item.date) meta.appendChild(el('span', null, dotDate(item.date)));
    if (item.tags && item.tags.length) meta.appendChild(el('span', null, item.tags.join(' · ')));
    card.appendChild(meta);

    card.appendChild(el('h3', null, item.title || ''));
    if (item.summary) card.appendChild(el('p', 'card__summary', item.summary));

    const steps = item.steps || [];
    if (steps.length) {
      const list = el('div', 'steps');
      steps.forEach((step, index) => {
        const row = el('div', 'step');
        row.appendChild(el('span', 'step__num', String(index + 1).padStart(2, '0')));

        const body = el('div');
        if (step.label) body.appendChild(el('div', 'step__label', step.label));
        if (step.text) body.appendChild(el('p', 'step__text', step.text));

        if (step.prompt) {
          const box = el('div', 'prompt');
          box.appendChild(el('code', null, step.prompt));
          const button = el('button', 'copy', '복사');
          button.type = 'button';
          button.setAttribute('aria-label', `${step.label || '프롬프트'} 복사`);
          box.appendChild(button);
          body.appendChild(box);
        }

        row.appendChild(body);
        list.appendChild(row);
      });
      card.appendChild(list);
    }

    if (item.note) card.appendChild(el('p', 'card__note', item.note));

    return card;
  };

  const renderAI = (data) => {
    const host = $('#aiList');
    if (!host) return;
    const items = (data.ai && data.ai.items) || [];
    host.replaceChildren();

    if (!items.length) {
      host.appendChild(el('p', 'cards__empty', '아직 등록된 항목이 없습니다. data.json의 ai.items에 한 건을 추가하면 이곳에 나타납니다.'));
      return;
    }

    items.forEach((item) => host.appendChild(markReveal(buildCard(item))));

    /* chips from tags */
    const chipHost = $('#aiChips');
    const counts = new Map();
    items.forEach((item) => (item.tags || []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }));

    if (chipHost) {
      chipHost.replaceChildren();
      const makeChip = (label, value, count, active) => {
        const chip = el('button', 'chip' + (active ? ' is-active' : ''), count ? `${label} ${count}` : label);
        chip.type = 'button';
        chip.dataset.filter = value;
        chip.setAttribute('aria-pressed', String(active));
        return chip;
      };
      chipHost.appendChild(makeChip('전체', 'all', items.length, true));
      [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ko'))
        .forEach(([tag, count]) => chipHost.appendChild(makeChip(tag, tag, count, false)));
    }

    const countLabel = $('#aiCount');
    if (countLabel) countLabel.textContent = `${items.length}편 수록`;

    const applyFilter = (value) => {
      let shown = 0;
      host.querySelectorAll('.card').forEach((card) => {
        const match = value === 'all' || (card.dataset.tags || '').split('|').includes(value);
        card.hidden = !match;
        if (match) shown += 1;
      });
      if (countLabel) {
        countLabel.textContent = value === 'all' ? `${items.length}편 수록` : `${value} · ${shown}편`;
      }
    };

    if (chipHost) {
      chipHost.addEventListener('click', (event) => {
        const chip = event.target.closest('.chip');
        if (!chip) return;
        chipHost.querySelectorAll('.chip').forEach((c) => {
          c.classList.toggle('is-active', c === chip);
          c.setAttribute('aria-pressed', String(c === chip));
        });
        applyFilter(chip.dataset.filter || 'all');
      });
    }
  };

  /* ---------- render: brief ---------- */

  const renderBrief = (data) => {
    const brief = data.brief;
    if (!brief) return;

    const lead = $('#briefLead');
    if (lead && brief.lead) lead.textContent = brief.lead;

    const dateLabel = $('#briefDate');
    if (dateLabel && brief.date) dateLabel.textContent = `${dotDate(brief.date)} 기준`;

    const note = $('#briefNote');
    if (note && brief.note) note.textContent = brief.note;

    const host = $('#briefList');
    if (!host) return;
    host.replaceChildren();
    (brief.items || []).forEach((item) => {
      const row = el('li');
      if (item.url) {
        const link = el('a', null, item.head || item.area || '');
        link.href = item.url;
        link.target = '_blank';
        link.rel = 'noopener';
        row.appendChild(link);
      } else {
        const label = el('span', null, item.head || item.area || '');
        label.style.fontSize = '14px';
        label.style.fontWeight = '600';
        label.style.color = 'var(--ink)';
        row.appendChild(label);
      }
      row.appendChild(el('span', 'kind', item.area || ''));
      row.appendChild(el('span', 'desc', item.sum || ''));
      host.appendChild(row);
    });
  };

  /* ---------- render: transport ---------- */

  const renderTransport = (data) => {
    const transport = data.transport || {};

    const lead = $('#transportLead');
    if (lead && transport.lead) lead.textContent = transport.lead;

    const featuredHost = $('#featured');
    if (featuredHost) {
      featuredHost.replaceChildren();
      (transport.featured || []).forEach((repo) => {
        const card = el('article', 'feat');
        if (repo.tag) card.appendChild(el('p', 'feat__tag', repo.tag));

        const title = el('h3');
        const link = el('a', null, repo.name || repo.repo || '');
        link.href = repo.url;
        link.target = '_blank';
        link.rel = 'noopener';
        title.appendChild(link);
        card.appendChild(title);

        if (repo.repo) card.appendChild(el('p', 'feat__repo', `github.com/${repo.repo}`));
        if (repo.desc) card.appendChild(el('p', 'feat__desc', repo.desc));

        if (repo.use) {
          const use = el('div', 'feat__use');
          use.appendChild(el('strong', null, '강의·연구 접점'));
          use.appendChild(document.createTextNode(repo.use));
          card.appendChild(use);
        }
        featuredHost.appendChild(markReveal(card));
      });
    }

    const toolHost = $('#tools');
    if (toolHost) {
      toolHost.replaceChildren();
      (transport.tools || []).forEach((tool) => {
        const row = el('li');
        const link = el('a', null, tool.name);
        link.href = tool.url;
        link.target = '_blank';
        link.rel = 'noopener';
        row.appendChild(link);
        row.appendChild(el('span', 'kind', tool.kind || ''));
        row.appendChild(el('span', 'desc', tool.desc || ''));
        toolHost.appendChild(row);
      });
    }

    const courseHost = $('#course');
    const course = transport.course;
    if (courseHost && course) {
      courseHost.replaceChildren();
      courseHost.appendChild(el('p', 'kicker', '강의 사이트'));
      const title = el('h3');
      title.id = 'courseTitle';
      title.textContent = course.name || '';
      courseHost.appendChild(title);
      if (course.desc) courseHost.appendChild(el('p', 'desc', course.desc));

      if (course.items && course.items.length) {
        const list = el('ul', 'list');
        course.items.forEach((line) => list.appendChild(el('li', null, line)));
        courseHost.appendChild(list);
      }

      const cta = el('div', 'cta');
      if (course.url) {
        const go = el('a', null, '블로그 열기');
        go.href = course.url;
        go.target = '_blank';
        go.rel = 'noopener';
        cta.appendChild(go);
      }
      if (course.repo) {
        const repo = el('a', 'ghost', '저장소');
        repo.href = course.repo;
        repo.target = '_blank';
        repo.rel = 'noopener';
        cta.appendChild(repo);
      }
      courseHost.appendChild(cta);
    }
  };

  /* ---------- render: hobby ---------- */

  const renderHobby = (data) => {
    const hobby = data.hobby || {};
    const lead = $('#hobbyLead');
    if (lead && hobby.lead) lead.textContent = hobby.lead;

    const riding = hobby.riding;
    const rideHost = $('#riding');
    if (rideHost && riding) {
      rideHost.replaceChildren();
      const title = el('h3');
      title.id = 'ridingTitle';
      title.textContent = riding.title || '';
      rideHost.appendChild(title);
      if (riding.lead) rideHost.appendChild(el('p', 'lead-in', riding.lead));

      if (riding.facts && riding.facts.length) {
        const dl = el('dl', 'facts');
        riding.facts.forEach((fact) => {
          const row = el('div');
          row.appendChild(el('dt', null, fact.k || ''));
          row.appendChild(el('dd', null, fact.v || ''));
          dl.appendChild(row);
        });
        rideHost.appendChild(dl);
      }

      if (riding.links) rideHost.appendChild(buildLinks(riding.links));
      markReveal(rideHost);
    }

    const brompton = hobby.brompton;
    const bromHost = $('#brompton');
    if (bromHost && brompton) {
      bromHost.replaceChildren();
      const title = el('h3');
      title.id = 'bromptonTitle';
      title.textContent = brompton.title || '정비 메모';
      bromHost.appendChild(title);

      const block = el('div', 'subblock');
      if (brompton.title) block.appendChild(el('h4', null, brompton.title));
      const list = el('ul');
      (brompton.items || []).forEach((line) => list.appendChild(el('li', null, line)));
      block.appendChild(list);
      if (brompton.links) block.appendChild(buildLinks(brompton.links));
      bromHost.appendChild(block);
      markReveal(bromHost);
    }

    const craft = hobby.craft;
    const craftHost = $('#craft');
    if (craftHost && craft) {
      craftHost.replaceChildren();
      const title = el('h3');
      title.id = 'craftTitle';
      title.textContent = craft.title || '';
      craftHost.appendChild(title);
      if (craft.lead) craftHost.appendChild(el('p', 'lead-in', craft.lead));

      (craft.blocks || []).forEach((block) => {
        const wrap = el('div', 'craft-block');
        wrap.appendChild(el('h4', null, block.h || ''));
        const list = el('ul');
        (block.items || []).forEach((line) => list.appendChild(el('li', null, line)));
        wrap.appendChild(list);
        craftHost.appendChild(wrap);
      });
      markReveal(craftHost);
    }
  };

  const buildLinks = (links) => {
    const host = el('div', 'links');
    links.forEach((link) => {
      const a = el('a', null, link.label || link.url);
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener';
      host.appendChild(a);
    });
    return host;
  };

  /* ---------- render: pipeline ---------- */

  const renderPipeline = (data) => {
    const pipeline = data.pipeline || {};
    const lead = $('#pipelineLead');
    if (lead && pipeline.lead) lead.textContent = pipeline.lead;

    const flowHost = $('#flow');
    if (flowHost) {
      flowHost.replaceChildren();
      (pipeline.steps || []).forEach((step) => {
        const card = el('div', 'flow__step');
        card.appendChild(el('span', 'flow__n', step.n || ''));
        card.appendChild(el('h4', null, step.h || ''));
        card.appendChild(el('p', null, step.t || ''));
        flowHost.appendChild(markReveal(card));
      });
    }

    const rowsHost = $('#fieldRows');
    if (rowsHost) {
      rowsHost.replaceChildren();
      (pipeline.fields || []).forEach((field) => {
        const tr = el('tr');
        const th = el('td', null, field.key || '');
        tr.appendChild(th);
        tr.appendChild(el('td', null, field.type || ''));
        tr.appendChild(el('td', null, field.desc || ''));
        rowsHost.appendChild(tr);
      });
    }

    const snippet = $('#snippet');
    if (snippet && pipeline.snippet) snippet.textContent = pipeline.snippet;

    const privacy = $('#privacyNote');
    if (privacy && data.site && data.site.privacy) privacy.textContent = data.site.privacy;
  };

  /* ---------- meta ---------- */

  const renderMeta = (data) => {
    const site = data.site || {};
    if (site.description) $('#siteDesc').textContent = site.description;
    if (site.updated) {
      $('#updated').textContent = dotDate(site.updated);
      $('#footerUpdated').textContent = dotDate(site.updated);
    }
    if (site.title) document.title = site.title;

    const aiLead = $('#aiLead');
    if (aiLead && data.ai && data.ai.lead) aiLead.textContent = data.ai.lead;
  };

  /* ---------- error ---------- */

  const renderError = () => {
    const message = 'data.json을 읽지 못했습니다. 같은 폴더에 data.json이 있는지 확인해 주세요.';
    ['#briefList', '#aiList', '#featured', '#tools', '#riding', '#brompton', '#craft', '#flow'].forEach((sel) => {
      const host = $(sel);
      if (!host) return;
      host.replaceChildren();
      const note = document.createElement(sel === '#tools' || sel === '#briefList' ? 'li' : 'p');
      note.className = 'cards__empty';
      note.textContent = message;
      host.appendChild(note);
    });
    $('#stats').replaceChildren();
  };

  /* ---------- nav highlight ---------- */

  const initNav = () => {
    const links = [...document.querySelectorAll('.nav a')];
    if (!links.length || !('IntersectionObserver' in window)) return;

    const map = new Map();
    links.forEach((link) => {
      const id = link.getAttribute('href').slice(1);
      const section = document.getElementById(id);
      if (section) map.set(section, link);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-current'));
        const link = map.get(entry.target);
        if (link) link.classList.add('is-current');
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

    map.forEach((link, section) => observer.observe(section));
  };

  /* ---------- boot ---------- */

  const boot = async () => {
    if ('IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-in');
          revealObserver.unobserve(entry.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    }

    initNav();

    try {
      const response = await fetch(DATA_URL, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      renderMeta(data);
      renderStats(data);
      renderBrief(data);
      renderAI(data);
      renderTransport(data);
      renderHobby(data);
      renderPipeline(data);
    } catch (error) {
      console.error('[dashboard] data load failed:', error);
      renderError();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
