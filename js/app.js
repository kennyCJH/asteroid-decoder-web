/**
 * 嘉義市天文協會合作巡天計畫發現成果記錄 — 主控邏輯
 */
(function () {
  'use strict';

  const Decoder = window.AsteroidDecoder;
  const DataStore = window.AsteroidData;

  const MONTH_NAMES = [
    { num: 1,  zh: '1 月',  en: 'JAN' },
    { num: 2,  zh: '2 月',  en: 'FEB' },
    { num: 3,  zh: '3 月',  en: 'MAR' },
    { num: 4,  zh: '4 月',  en: 'APR' },
    { num: 5,  zh: '5 月',  en: 'MAY' },
    { num: 6,  zh: '6 月',  en: 'JUN' },
    { num: 7,  zh: '7 月',  en: 'JUL' },
    { num: 8,  zh: '8 月',  en: 'AUG' },
    { num: 9,  zh: '9 月',  en: 'SEP' },
    { num: 10, zh: '10 月', en: 'OCT' },
    { num: 11, zh: '11 月', en: 'NOV' },
    { num: 12, zh: '12 月', en: 'DEC' }
  ];

  // 應用狀態
  const state = {
    asteroids: DataStore.hydrateAsteroids(DataStore.DEFAULT_ASTEROIDS),
    filter: 'ALL',
    sort: 'id',
    view: 'cards',
    lastDecoded: null,
    activeModalAsteroid: null,
    activeOrbitViewer: null,
    activeHalfLetter: 'R'
  };

  // DOM 參考快取
  const els = {
    input: document.getElementById('designationInput'),
    inputBox: document.getElementById('decoderInputBox'),
    formatBadge: document.getElementById('detectedFormatBadge'),
    swapBtn: document.getElementById('swapFormatBtn'),
    clearBtn: document.getElementById('clearInputBtn'),
    sampleChips: document.getElementById('sampleChips'),
    decoderError: document.getElementById('decoderError'),
    decoderResult: document.getElementById('decoderResult'),
    matchBanner: document.getElementById('associationMatchBanner'),
    standardTokens: document.getElementById('standardTokens'),
    packedTokens: document.getElementById('packedTokens'),
    copyStandardBtn: document.getElementById('copyStandardBtn'),
    copyPackedBtn: document.getElementById('copyPackedBtn'),
    resYear: document.getElementById('resYear'),
    resYearDetail: document.getElementById('resYearDetail'),
    resHalfLabel: document.getElementById('resHalfLabel'),
    resHalfRange: document.getElementById('resHalfRange'),
    resHalfHint: document.getElementById('resHalfHint'),
    resOrder: document.getElementById('resOrder'),
    resFormula: document.getElementById('resFormula'),
    resFormulaDetail: document.getElementById('resFormulaDetail'),
    resStandard: document.getElementById('resStandard'),
    resPacked: document.getElementById('resPacked'),
    resPackedCycleNote: document.getElementById('resPackedCycleNote'),
    resMpcLink: document.getElementById('resMpcLink'),
    resJplLink: document.getElementById('resJplLink'),

    kpiTotal: document.getElementById('kpiTotal'),
    kpiMba: document.getElementById('kpiMba'),
    kpiMbaPct: document.getElementById('kpiMbaPct'),
    kpiNeo: document.getElementById('kpiNeo'),
    countAll: document.getElementById('countAll'),
    countMba: document.getElementById('countMba'),
    countPha: document.getElementById('countPha'),
    countApollo: document.getElementById('countApollo'),
    navDataStatus: document.getElementById('navDataStatus'),
    dataSourceText: document.getElementById('dataSourceText'),

    cardsGrid: document.getElementById('asteroidCardsGrid'),
    timeline: document.getElementById('asteroidTimeline'),
    sortSelect: document.getElementById('sortSelect'),
    csvFileInput: document.getElementById('csvFileInput'),

    monthsMatrix: document.getElementById('monthsMatrix'),
    inspectorLetter: document.getElementById('inspectorLetter'),
    inspectorTitle: document.getElementById('inspectorTitle'),
    inspectorSub: document.getElementById('inspectorSub'),
    secondLetterStrip: document.getElementById('secondLetterStrip'),
    cycleCodeGrid: document.getElementById('cycleCodeGrid'),

    modal: document.getElementById('asteroidModal'),
    modalDialog: document.getElementById('modalDialog'),
    modalBody: document.getElementById('modalBody'),
    modalCloseBtn: document.getElementById('modalCloseBtn'),
    toast: document.getElementById('toast')
  };

  /* ========================================================================
     工具函式
     ======================================================================== */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  let toastTimer = null;
  function showToast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      els.toast.hidden = true;
    }, 2600);
  }

  async function copyText(text, label) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      showToast(`已複製 ${label}：${text}`);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      showToast(`已複製 ${label}：${text}`);
    }
  }

  function findAssociationMatch(standardCode) {
    if (!standardCode) return null;
    const key = standardCode.toUpperCase().replace(/\s+/g, ' ');
    return state.asteroids.find((a) => a.standard.toUpperCase().replace(/\s+/g, ' ') === key) || null;
  }

  function buildStandardTokensHtml(res) {
    const cycleHtml = res.cycle > 0
      ? `<div class="token-block token-block--cycle">
           <span class="token-block__char">${escapeHtml(res.cycle)}</span>
           <span class="token-block__label">循環數字</span>
           <span class="token-block__sub">第 ${res.cycle} 輪</span>
         </div>`
      : `<div class="token-block token-block--muted">
           <span class="token-block__char">∅</span>
           <span class="token-block__label">無數字</span>
           <span class="token-block__sub">第 0 輪 (1–25)</span>
         </div>`;

    return `
      <div class="token-block token-block--year">
        <span class="token-block__char">${escapeHtml(res.year)}</span>
        <span class="token-block__label">發現年份</span>
        <span class="token-block__sub">西元 ${res.year}</span>
      </div>
      <div class="token-block token-block--half">
        <span class="token-block__char">${escapeHtml(res.halfMonthLetter)}</span>
        <span class="token-block__label">半月字母</span>
        <span class="token-block__sub">${escapeHtml(res.halfMonth.label)}</span>
      </div>
      <div class="token-block token-block--second">
        <span class="token-block__char">${escapeHtml(res.secondLetter)}</span>
        <span class="token-block__label">第二字母</span>
        <span class="token-block__sub">第 ${res.secondLetterIndex} 位</span>
      </div>
      ${cycleHtml}
    `;
  }

  function buildPackedTokensHtml(res) {
    if (!res.packed || !res.packedCycle) {
      return `
        <div class="token-block token-block--muted" style="flex:1 1 100%">
          <span class="token-block__char">無法壓縮</span>
          <span class="token-block__label">超出標準 7 碼世紀（1800–2199）或循環上限（619）</span>
        </div>
      `;
    }

    const cycleSub = res.packedCycle.usesLetterEncoding
      ? `${res.packedCycle.char5}=${res.packedCycle.tensAndHundreds} → ${res.cycle}`
      : `補零 → ${res.cycle}`;

    return `
      <div class="token-block token-block--year">
        <span class="token-block__char">${escapeHtml(res.centuryCode)}</span>
        <span class="token-block__label">第 1 碼</span>
        <span class="token-block__sub">${res.century}00 年代</span>
      </div>
      <div class="token-block token-block--year">
        <span class="token-block__char">${escapeHtml(res.yearShort)}</span>
        <span class="token-block__label">第 2–3 碼</span>
        <span class="token-block__sub">年份末兩碼</span>
      </div>
      <div class="token-block token-block--half">
        <span class="token-block__char">${escapeHtml(res.halfMonthLetter)}</span>
        <span class="token-block__label">第 4 碼</span>
        <span class="token-block__sub">${escapeHtml(res.halfMonth.label)}</span>
      </div>
      <div class="token-block token-block--cycle">
        <span class="token-block__char">${escapeHtml(res.packedCycle.code)}</span>
        <span class="token-block__label">第 5–6 碼</span>
        <span class="token-block__sub">${escapeHtml(cycleSub)}</span>
      </div>
      <div class="token-block token-block--second">
        <span class="token-block__char">${escapeHtml(res.secondLetter)}</span>
        <span class="token-block__label">第 7 碼</span>
        <span class="token-block__sub">第 ${res.secondLetterIndex} 位</span>
      </div>
    `;
  }

  /* ========================================================================
     模組 1：雙向解碼器渲染
     ======================================================================== */
  function runDecoder(rawValue) {
    const res = Decoder.parse(rawValue);

    if (!res.ok) {
      state.lastDecoded = null;
      els.inputBox.classList.toggle('is-error', !res.empty);
      els.formatBadge.className = 'format-badge format-badge--error';
      els.formatBadge.textContent = res.empty ? '等待輸入' : '格式需修正';
      els.decoderError.hidden = false;
      els.decoderError.textContent = res.error;
      els.decoderResult.hidden = true;
      return;
    }

    state.lastDecoded = res;
    els.inputBox.classList.remove('is-error');
    els.decoderError.hidden = true;
    els.decoderResult.hidden = false;

    if (res.inputFormat === 'standard') {
      els.formatBadge.className = 'format-badge format-badge--standard';
      els.formatBadge.textContent = '偵測：標準格式';
    } else {
      els.formatBadge.className = 'format-badge format-badge--packed';
      els.formatBadge.textContent = '偵測：MPC 7 碼壓縮';
    }

    // 彩色區塊拆解
    els.standardTokens.innerHTML = buildStandardTokensHtml(res);
    els.packedTokens.innerHTML = buildPackedTokensHtml(res);
    els.copyStandardBtn.dataset.copy = res.standard;
    els.copyPackedBtn.dataset.copy = res.packed || '';
    els.copyPackedBtn.disabled = !res.packed;

    // 四張資訊卡
    els.resYear.textContent = `${res.year} 年`;
    els.resYearDetail.textContent = res.centuryCode
      ? `世紀代碼 ${res.centuryCode}（${res.century}00 年代）＋ 末兩碼 ${res.yearShort}`
      : `西元 ${res.year} 年`;

    els.resHalfLabel.textContent = res.halfMonth.label;
    els.resHalfRange.textContent = res.halfMonth.rangeISO;
    const leapNote = res.halfMonth.leapVariable
      ? `（${res.year} 年為${Decoder.isLeapYear(res.year) ? '閏年，月底 29 日' : '平年，月底 28 日'}）`
      : '';
    els.resHalfHint.textContent = `半月字母 ${res.halfMonthLetter} · ${res.halfMonth.rangeShort}${leapNote}`;

    els.resOrder.textContent = res.order.toLocaleString('zh-TW');
    els.resFormula.textContent = res.formulaText;
    els.resFormulaDetail.textContent = res.formulaDetail;

    els.resStandard.textContent = res.standard;
    els.resPacked.textContent = res.packed || '—';
    els.resPackedCycleNote.textContent = res.packedCycleNote;
    els.resMpcLink.href = res.mpcUrl;
    els.resMpcLink.textContent = `MPC 官方查詢 (${res.standard}) ↗`;
    els.resMpcLink.title = `前往 MPC 查詢 ${res.standard}：${res.mpcUrl}`;
    els.resJplLink.href = res.jplUrl;
    els.resJplLink.textContent = `NASA JPL SBDB (${res.standard}) ↗`;
    els.resJplLink.title = `前往 NASA JPL SBDB 查詢 ${res.standard}：${res.jplUrl}`;

    // 檢查是否為協會發現的 14 顆之一
    const matched = findAssociationMatch(res.standard);
    if (matched) {
      els.matchBanner.hidden = false;
      els.matchBanner.className = 'match-banner' +
        (matched.isPHA ? ' match-banner--pha' : matched.isApollo ? ' match-banner--apollo' : '');

      const badgeClass = matched.isPHA ? 'type-badge--pha' : matched.isApollo ? 'type-badge--apollo' : 'type-badge--mba';
      const dot = matched.isNEO ? '<span class="pulse-dot"></span>' : '';
      els.matchBanner.innerHTML = `
        <div class="match-banner__info">
          <span class="type-badge ${badgeClass}">${dot}${escapeHtml(matched.type)}</span>
          <span>✨ 此編號屬於<strong>嘉義市天文協會合作巡天計畫發現成果（項次 #${matched.id}）</strong> · 首次觀測 UT <code class="mono">${escapeHtml(matched.firstObsISO || '—')}</code></span>
        </div>
        <button type="button" class="match-banner__btn" data-open-id="${matched.id}">開啟完整觀測報告 →</button>
      `;
    } else {
      els.matchBanner.hidden = true;
    }

    // 同步高亮圖鑑對應半月
    highlightHalfMonth(res.halfMonthLetter);
  }

  /* ========================================================================
     模組 2：14 顆小行星成果儀表板
     ======================================================================== */
  function updateKpis() {
    const list = state.asteroids;
    const total = list.length;
    const mbaCount = list.filter((a) => a.type === 'MBA').length;
    const phaCount = list.filter((a) => a.type === 'NEO(PHA)').length;
    const apolloCount = list.filter((a) => a.type === 'NEO(APOLLOA)').length;
    const neoCount = list.filter((a) => a.isNEO).length;
    const mbaPct = total > 0 ? ((mbaCount / total) * 100).toFixed(1) : '0.0';

    els.kpiTotal.textContent = total;
    els.kpiMba.textContent = mbaCount;
    els.kpiMbaPct.textContent = `佔總發現數 ${mbaPct}% · 火星與木星軌道間`;
    els.kpiNeo.textContent = neoCount;

    els.countAll.textContent = total;
    els.countMba.textContent = mbaCount;
    els.countPha.textContent = phaCount;
    els.countApollo.textContent = apolloCount;
    els.navDataStatus.textContent = `${total} 顆發現 · UT 同步`;
  }

  function getFilteredAndSorted() {
    let list = state.asteroids.slice();

    if (state.filter !== 'ALL') {
      list = list.filter((a) => a.type === state.filter);
    }

    switch (state.sort) {
      case 'firstObsDesc':
        list.sort((a, b) => (b.firstObsISO || '').localeCompare(a.firstObsISO || ''));
        break;
      case 'firstObsAsc':
        list.sort((a, b) => (a.firstObsISO || '').localeCompare(b.firstObsISO || ''));
        break;
      case 'orderDesc':
        list.sort((a, b) => (b.decoded.order || 0) - (a.decoded.order || 0));
        break;
      case 'neoFirst':
        list.sort((a, b) => {
          const rank = (x) => (x.isPHA ? 0 : x.isApollo ? 1 : 2);
          return rank(a) - rank(b) || a.id - b.id;
        });
        break;
      case 'id':
      default:
        list.sort((a, b) => a.id - b.id);
        break;
    }
    return list;
  }

  function renderTypeBadgeHtml(a) {
    if (a.isPHA) {
      return `<span class="type-badge type-badge--pha"><span class="pulse-dot"></span>NEO · PHA 潛在威脅</span>`;
    }
    if (a.isApollo) {
      return `<span class="type-badge type-badge--apollo"><span class="pulse-dot"></span>NEO · APOLLOA</span>`;
    }
    return `<span class="type-badge type-badge--mba">${escapeHtml(a.type)}</span>`;
  }

  function renderDashboard() {
    const items = getFilteredAndSorted();

    // 卡片檢視
    els.cardsGrid.innerHTML = items.map((a) => {
      const cardTone = a.isPHA ? 'asteroid-card--pha' : a.isApollo ? 'asteroid-card--apollo' : '';
      const arcText = a.arcDays !== null ? `${a.arcDays} 天` : '—';
      const precovery = a.firstObsISO && a.decoded.ok && Number(a.firstObsISO.slice(0, 4)) < a.decoded.year
        ? `<span class="precovery-tag">歷史回溯觀測</span>`
        : '';
      const mpcUrl = a.decoded.ok ? a.decoded.mpcUrl : '#';
      const jplUrl = a.decoded.ok ? a.decoded.jplUrl : '#';
      const orbitBtn = a.mpcOrbitUrl
        ? `<a href="${escapeHtml(a.mpcOrbitUrl)}" target="_blank" rel="noopener noreferrer" class="quick-ext quick-ext--orbit" title="前往 MPC 互動式軌道草圖（${escapeHtml(a.standard)}）">MPC 軌道草圖 ↗</a>`
        : '';
      const orbitTelemetry = a.orbit
        ? `<div class="asteroid-card__orbit-strip mono">
             <span>a <b>${a.orbit.a.toFixed(2)}</b> AU</span>
             <span>e <b>${a.orbit.e.toFixed(3)}</b></span>
             <span>i <b>${a.orbit.incl.toFixed(1)}°</b></span>
           </div>`
        : '';

      return `
        <article class="asteroid-card ${cardTone}" role="button" tabindex="0" data-open-id="${a.id}" aria-label="檢視 ${escapeHtml(a.standard)} 動態軌道與詳細資料">
          <div class="asteroid-card__head">
            <span class="asteroid-index">#${String(a.id).padStart(2, '0')}</span>
            ${renderTypeBadgeHtml(a)}
          </div>

          <div>
            <h3 class="asteroid-card__title">${escapeHtml(a.standard)}</h3>
            <div class="asteroid-card__codes">
              <span class="packed-pill">${escapeHtml(a.packed)}</span>
              <span>第 <strong class="mono">${a.decoded.ok ? a.decoded.order.toLocaleString('zh-TW') : '—'}</strong> 顆</span>
              ${precovery}
            </div>
          </div>

          ${orbitTelemetry}

          <div class="asteroid-card__meta">
            <div>
              <span class="meta-cell__k">首次觀測日 (UT)</span>
              <span class="meta-cell__v mono">${escapeHtml(a.firstObsISO || '未提供')}</span>
            </div>
            <div>
              <span class="meta-cell__k">最新觀測日 (UT)</span>
              <span class="meta-cell__v mono">${escapeHtml(a.latestObsISO || '未提供')}</span>
            </div>
          </div>

          <div class="asteroid-card__quicklinks">
            <a href="${escapeHtml(mpcUrl)}" target="_blank" rel="noopener noreferrer" class="quick-ext quick-ext--mpc" title="前往 MPC 查詢 ${escapeHtml(a.standard)}：${escapeHtml(mpcUrl)}">MPC 查詢 ↗</a>
            <a href="${escapeHtml(jplUrl)}" target="_blank" rel="noopener noreferrer" class="quick-ext quick-ext--jpl" title="前往 NASA JPL SBDB 查詢 ${escapeHtml(a.standard)}：${escapeHtml(jplUrl)}">JPL SBDB ↗</a>
            ${orbitBtn}
          </div>

          <div class="asteroid-card__foot">
            <span class="mono">${escapeHtml(a.halfMonthRange)} · 弧長 ${arcText}</span>
            <span class="card-cta">3D 軌道與詳情 →</span>
          </div>
        </article>
      `;
    }).join('');

    // 時間軸檢視（若預設排序為 id，在時間軸模式按半月與首次觀測順序呈現也更直覺）
    const timelineItems = state.sort === 'id'
      ? items.slice().sort((a, b) => (a.firstObsISO || '').localeCompare(b.firstObsISO || '') || a.id - b.id)
      : items;

    els.timeline.innerHTML = timelineItems.map((a) => {
      const tone = a.isPHA ? 'timeline-item--pha' : a.isApollo ? 'timeline-item--apollo' : '';
      const arcText = a.arcDays !== null ? `觀測弧 ${a.arcDays} 天` : '';
      const precovery = a.firstObsISO && a.decoded.ok && Number(a.firstObsISO.slice(0, 4)) < a.decoded.year
        ? ` · 歷史回溯觀測（編號屬 ${a.decoded.year} 年 ${a.decoded.halfMonth.label}）`
        : '';
      const mpcUrl = a.decoded.ok ? a.decoded.mpcUrl : '#';
      const jplUrl = a.decoded.ok ? a.decoded.jplUrl : '#';
      const orbitBtn = a.mpcOrbitUrl
        ? `<a href="${escapeHtml(a.mpcOrbitUrl)}" target="_blank" rel="noopener noreferrer" class="quick-ext quick-ext--orbit" title="前往 MPC 互動式軌道草圖（${escapeHtml(a.standard)}）">MPC 軌道圖 ↗</a>`
        : '';

      return `
        <div class="timeline-item ${tone}" role="button" tabindex="0" data-open-id="${a.id}">
          <div class="timeline-date">
            <div class="timeline-date__main">${escapeHtml(a.firstObsISO || '—')} UT</div>
            <div class="timeline-date__sub">最新：${escapeHtml(a.latestObsISO || '—')} ${arcText ? `· ${arcText}` : ''}</div>
          </div>

          <div class="timeline-main">
            <div class="timeline-main__top">
              <span class="asteroid-index">#${String(a.id).padStart(2, '0')}</span>
              <span class="timeline-main__title">${escapeHtml(a.standard)}</span>
              <span class="packed-pill">${escapeHtml(a.packed)}</span>
              ${renderTypeBadgeHtml(a)}
            </div>
            <div class="timeline-main__sub">
              半月區間：<span class="mono">${escapeHtml(a.halfMonthRange)}</span>
              · 該半月第 <strong class="mono">${a.decoded.ok ? a.decoded.order.toLocaleString('zh-TW') : '—'}</strong> 顆${escapeHtml(precovery)}
            </div>
          </div>

          <div class="timeline-actions">
            ${orbitBtn}
            <a href="${escapeHtml(mpcUrl)}" target="_blank" rel="noopener noreferrer" class="quick-ext quick-ext--mpc" title="前往 MPC 查詢 ${escapeHtml(a.standard)}：${escapeHtml(mpcUrl)}">MPC ↗</a>
            <a href="${escapeHtml(jplUrl)}" target="_blank" rel="noopener noreferrer" class="quick-ext quick-ext--jpl" title="前往 NASA JPL SBDB 查詢 ${escapeHtml(a.standard)}：${escapeHtml(jplUrl)}">JPL SBDB ↗</a>
            <span class="card-cta">3D 軌道 →</span>
          </div>
        </div>
      `;
    }).join('');

    els.cardsGrid.hidden = state.view !== 'cards';
    els.timeline.hidden = state.view !== 'timeline';
  }

  /* ========================================================================
     詳細資訊 Modal（含 3D 動態軌道模擬 + MPC 官方互動式軌道草圖）
     ======================================================================== */
  function destroyActiveOrbitViewer() {
    if (state.activeOrbitViewer) {
      state.activeOrbitViewer.destroy();
      state.activeOrbitViewer = null;
    }
  }

  function buildOrbitSectionHtml(asteroid) {
    const o = asteroid.orbit;
    if (!o) return '';

    const periodYears = (o.periodDays / 365.256).toFixed(2);
    const moidHtml = o.moid !== null && o.moid !== undefined
      ? `<div class="orbit-stat orbit-stat--alert">
           <span>地球 MOID</span>
           <strong class="mono">${o.moid.toFixed(4)} AU</strong>
         </div>`
      : '';

    const mpcOrbitLink = asteroid.mpcOrbitUrl
      ? `<a href="${escapeHtml(asteroid.mpcOrbitUrl)}" target="_blank" rel="noopener noreferrer" class="orbit-ext-link" title="於新分頁開啟 MPC 官方互動式軌道草圖">另開 MPC 軌道草圖 ↗</a>`
      : '';

    return `
      <div class="modal-section-title">互動式動態軌道圖（3D 模擬 / MPC 官方草圖）</div>
      <div class="orbit-panel">
        <div class="orbit-panel__bar">
          <div class="orbit-tabs" role="tablist" aria-label="軌道圖模式切換">
            <button type="button" class="orbit-tab is-active" data-orbit-tab="sim" role="tab" aria-selected="true">
              ✦ 3D 動態軌道模擬
            </button>
            <button type="button" class="orbit-tab" data-orbit-tab="mpc" role="tab" aria-selected="false">
              ◎ MPC 官方互動軌道草圖
            </button>
          </div>
          ${mpcOrbitLink}
        </div>

        <!-- Tab 1: 自建 60fps 3D 克卜勒動態軌道 -->
        <div id="orbitSimPane" class="orbit-stage">
          <canvas id="modalOrbitCanvas" class="orbit-canvas" aria-label="${escapeHtml(asteroid.standard)} 3D 動態軌道模擬畫布"></canvas>
          <div class="orbit-hud-top">
            <span class="orbit-date-pill mono" id="orbitSimDate">模擬日期載入中...</span>
            <span class="orbit-drag-hint">滑鼠拖拽旋轉 3D 視角 · 滾輪縮放</span>
          </div>
          <div class="orbit-controls">
            <button type="button" class="orbit-ctrl-btn is-active" id="orbitPlayBtn">⏸ 暫停</button>
            <button type="button" class="orbit-ctrl-btn" data-orbit-speed="15">慢速</button>
            <button type="button" class="orbit-ctrl-btn is-active" data-orbit-speed="45">中速</button>
            <button type="button" class="orbit-ctrl-btn" data-orbit-speed="180">高速</button>
            <span class="orbit-ctrl-sep"></span>
            <button type="button" class="orbit-ctrl-btn" data-orbit-preset="3d">立體 3D</button>
            <button type="button" class="orbit-ctrl-btn" data-orbit-preset="top">俯視</button>
            <button type="button" class="orbit-ctrl-btn" data-orbit-preset="side">側視傾角</button>
            <span class="orbit-ctrl-sep"></span>
            <button type="button" class="orbit-ctrl-btn" id="orbitZoomInBtn" title="放大">＋</button>
            <button type="button" class="orbit-ctrl-btn" id="orbitZoomOutBtn" title="縮小">－</button>
          </div>
          <div class="orbit-legend">
            <span><i class="orbit-swatch orbit-swatch--solid"></i>實線：黃道面以北</span>
            <span><i class="orbit-swatch orbit-swatch--dashed"></i>虛線：黃道面以南</span>
            <span><i class="orbit-swatch orbit-swatch--earth"></i>地球軌道（1 AU）</span>
            <span>◆ 近日點 q</span>
          </div>
        </div>

        <!-- Tab 2: 直接內嵌 MPC 官方 show_orbit 頁面 -->
        <div id="orbitMpcPane" class="orbit-mpc-pane" hidden>
          <div class="orbit-mpc-note">
            <span>以下直接嵌入 IAU Minor Planet Center 官方 <strong>Interactive Orbit Sketch</strong>（歷元 Epoch ${escapeHtml(o.epoch)}）。若載入較慢可點擊右上角「另開 MPC 軌道草圖」。</span>
          </div>
          <div class="orbit-iframe-wrap">
            <iframe
              id="modalMpcOrbitFrame"
              class="orbit-iframe"
              title="${escapeHtml(asteroid.standard)} MPC 官方互動式軌道草圖"
              data-src="${escapeHtml(asteroid.mpcOrbitUrl || '')}"
              loading="lazy"
            ></iframe>
          </div>
        </div>

        <!-- 軌道根數數據條 -->
        <div class="orbit-stats-grid">
          <div class="orbit-stat">
            <span>半長軸 a</span>
            <strong class="mono">${o.a.toFixed(3)} AU</strong>
          </div>
          <div class="orbit-stat">
            <span>離心率 e</span>
            <strong class="mono">${o.e.toFixed(4)}</strong>
          </div>
          <div class="orbit-stat">
            <span>軌道傾角 i</span>
            <strong class="mono">${o.incl.toFixed(2)}°</strong>
          </div>
          <div class="orbit-stat">
            <span>近日點 / 遠日點</span>
            <strong class="mono">${o.q.toFixed(2)} ～ ${o.ad.toFixed(2)} AU</strong>
          </div>
          <div class="orbit-stat">
            <span>公轉週期</span>
            <strong class="mono">${periodYears} 年</strong>
          </div>
          ${moidHtml}
        </div>
      </div>
    `;
  }

  function openModalByAsteroid(asteroid) {
    if (!asteroid) return;
    destroyActiveOrbitViewer();
    state.activeModalAsteroid = asteroid;
    const d = asteroid.decoded;

    els.modalDialog.className = 'modal__dialog glass-panel' +
      (asteroid.isPHA ? ' modal__dialog--pha' : asteroid.isApollo ? ' modal__dialog--apollo' : '');

    const arcLabel = asteroid.arcDays !== null ? `${asteroid.arcDays} 天` : '—';
    const noteHtml = asteroid.note
      ? `<div class="modal-note">✦ ${escapeHtml(asteroid.note)}</div>`
      : '';
    const mpcOrbitAction = asteroid.mpcOrbitUrl
      ? `<a href="${escapeHtml(asteroid.mpcOrbitUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn--orbit" title="前往 MPC 官方互動式軌道草圖（${escapeHtml(asteroid.standard)}）">
           <span>MPC 互動式軌道草圖</span>
           <span>↗</span>
         </a>`
      : '';

    els.modalBody.innerHTML = `
      <div class="modal-head">
        <div class="modal-head__badges">
          <span class="asteroid-index">巡天計畫發現項次 #${String(asteroid.id).padStart(2, '0')}</span>
          ${renderTypeBadgeHtml(asteroid)}
          <span class="packed-pill">MPC ${escapeHtml(asteroid.packed)}</span>
        </div>
        <h2 id="modalTitle" class="modal-head__title">${escapeHtml(asteroid.standard)}</h2>
        <p class="modal-head__sub">${escapeHtml(asteroid.typeMeta.fullName)}</p>
      </div>

      ${buildOrbitSectionHtml(asteroid)}

      <div class="modal-section-title">UT 觀測時間紀錄（資料來源：asteroids_dates.csv）</div>
      <div class="modal-obs-grid">
        <div class="obs-box">
          <span class="obs-box__label">首次觀測日 (UT)</span>
          <span class="obs-box__val">${escapeHtml(asteroid.firstObsISO || '未提供')}</span>
        </div>
        <div class="obs-box">
          <span class="obs-box__label">最新觀測日 (UT)</span>
          <span class="obs-box__val">${escapeHtml(asteroid.latestObsISO || '未提供')}</span>
        </div>
        <div class="obs-box">
          <span class="obs-box__label">觀測弧跨度</span>
          <span class="obs-box__val">${escapeHtml(arcLabel)}</span>
        </div>
      </div>
      ${noteHtml}

      <div class="modal-section-title">完整臨時編號拆解與發現順位</div>
      <div class="token-row" style="margin-bottom:10px;">
        ${buildStandardTokensHtml(d)}
      </div>
      <div class="token-row" style="margin-bottom:12px;">
        ${buildPackedTokensHtml(d)}
      </div>
      <div class="formula-box">
        <div class="formula-box__eq mono">
          ${escapeHtml(d.halfMonth.label)}（${escapeHtml(d.halfMonth.rangeISO)}） · 第 ${d.order.toLocaleString('zh-TW')} 顆 ＝ ${escapeHtml(d.formulaText)}
        </div>
        <div class="formula-box__desc">${escapeHtml(d.formulaDetail)} · ${escapeHtml(d.packedCycleNote)}</div>
      </div>

      <div class="modal-actions">
        ${mpcOrbitAction}
        <a href="${escapeHtml(d.mpcUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn--mpc" title="前往 MPC 查詢 ${escapeHtml(asteroid.standard)}：${escapeHtml(d.mpcUrl)}">
          <span>MPC 官方查詢（${escapeHtml(asteroid.standard)}）</span>
          <span>↗</span>
        </a>
        <a href="${escapeHtml(d.jplUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn--jpl" title="前往 NASA JPL SBDB 查詢 ${escapeHtml(asteroid.standard)}：${escapeHtml(d.jplUrl)}">
          <span>NASA JPL SBDB 查詢（${escapeHtml(asteroid.standard)}）</span>
          <span>↗</span>
        </a>
        <button type="button" class="btn btn--glass" id="modalSendToDecoderBtn">
          帶入解碼器檢視
        </button>
      </div>
    `;

    const sendBtn = document.getElementById('modalSendToDecoderBtn');
    if (sendBtn) {
      sendBtn.addEventListener('click', () => {
        closeModal();
        els.input.value = asteroid.standard;
        runDecoder(asteroid.standard);
        document.getElementById('decoder').scrollIntoView({ behavior: 'smooth' });
      });
    }

    els.modal.hidden = false;
    document.body.style.overflow = 'hidden';

    // 掛載 3D 動態軌道畫布與控制項（在 Modal 顯示後確保取得正確寬高）
    if (asteroid.orbit && window.OrbitViewer) {
      const canvas = document.getElementById('modalOrbitCanvas');
      const dateEl = document.getElementById('orbitSimDate');
      const viewer = window.OrbitViewer.mount(canvas, asteroid, {
        onDateUpdate(str) {
          if (dateEl) dateEl.textContent = `模擬歷元 ${str}`;
        }
      });
      state.activeOrbitViewer = viewer;

      const playBtn = document.getElementById('orbitPlayBtn');
      if (playBtn && viewer) {
        playBtn.addEventListener('click', () => {
          const playing = viewer.togglePlay();
          playBtn.textContent = playing ? '⏸ 暫停' : '▶ 播放';
          playBtn.classList.toggle('is-active', playing);
        });
      }

      els.modalBody.querySelectorAll('[data-orbit-speed]').forEach((btn) => {
        btn.addEventListener('click', () => {
          els.modalBody.querySelectorAll('[data-orbit-speed]').forEach((b) => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          viewer && viewer.setSpeed(Number(btn.dataset.orbitSpeed));
        });
      });

      els.modalBody.querySelectorAll('[data-orbit-preset]').forEach((btn) => {
        btn.addEventListener('click', () => {
          viewer && viewer.setPreset(btn.dataset.orbitPreset);
        });
      });

      const zoomIn = document.getElementById('orbitZoomInBtn');
      const zoomOut = document.getElementById('orbitZoomOutBtn');
      if (zoomIn && viewer) zoomIn.addEventListener('click', () => viewer.zoomBy(1.22));
      if (zoomOut && viewer) zoomOut.addEventListener('click', () => viewer.zoomBy(0.82));

      // Tab 切換：3D 動態軌道模擬 ↔ MPC 官方互動軌道草圖 iframe
      const simPane = document.getElementById('orbitSimPane');
      const mpcPane = document.getElementById('orbitMpcPane');
      const mpcFrame = document.getElementById('modalMpcOrbitFrame');
      els.modalBody.querySelectorAll('[data-orbit-tab]').forEach((tabBtn) => {
        tabBtn.addEventListener('click', () => {
          const mode = tabBtn.dataset.orbitTab;
          els.modalBody.querySelectorAll('[data-orbit-tab]').forEach((t) => {
            const active = t.dataset.orbitTab === mode;
            t.classList.toggle('is-active', active);
            t.setAttribute('aria-selected', String(active));
          });
          if (simPane) simPane.hidden = mode !== 'sim';
          if (mpcPane) mpcPane.hidden = mode !== 'mpc';
          if (mode === 'mpc' && mpcFrame && !mpcFrame.src && mpcFrame.dataset.src) {
            mpcFrame.src = mpcFrame.dataset.src;
          }
        });
      });
    }

    els.modalCloseBtn.focus();
  }

  function closeModal() {
    destroyActiveOrbitViewer();
    els.modal.hidden = true;
    document.body.style.overflow = '';
    state.activeModalAsteroid = null;
  }

  /* ========================================================================
     模組 3：IAU / MPC 規則視覺化圖鑑
     ======================================================================== */
  function getDiscoveriesByHalfLetter() {
    const map = Object.create(null);
    state.asteroids.forEach((a) => {
      if (a.decoded && a.decoded.ok) {
        const l = a.decoded.halfMonthLetter;
        if (!map[l]) map[l] = [];
        map[l].push(a);
      }
    });
    return map;
  }

  function updateHalfMonthInspector(letter) {
    const info = Decoder.getHalfMonthInfo(letter, 2026);
    if (!info) return;
    state.activeHalfLetter = letter;
    const byLetter = getDiscoveriesByHalfLetter();
    const hits = byLetter[letter] || [];

    els.inspectorLetter.textContent = letter;
    const dayDesc = info.leapVariable ? '2/16 ～ 2/28（閏年 2/29）' : info.rangeShort;
    els.inspectorTitle.textContent = `${info.label}（${dayDesc}）`;

    if (hits.length > 0) {
      const names = hits.map((h) => h.standard).join('、');
      els.inspectorSub.textContent = `★ 合作巡天計畫於此半月共發現 ${hits.length} 顆：${names}（點擊可帶入解碼器）`;
    } else {
      const skipNote = info.skippedBefore ? '（注意：前一位跳過字母 I）· ' : '';
      els.inspectorSub.textContent = `${skipNote}點擊此格將範例「2026 ${letter}A」帶入解碼器`;
    }
  }

  function highlightHalfMonth(letter) {
    const info = Decoder.HALF_MONTH_MAP[letter];
    if (!info || !els.monthsMatrix) return;

    els.monthsMatrix.querySelectorAll('.month-card').forEach((card) => {
      card.classList.toggle('is-highlighted', Number(card.dataset.month) === info.month);
    });
    els.monthsMatrix.querySelectorAll('.half-cell').forEach((cell) => {
      cell.classList.toggle('is-active', cell.dataset.letter === letter);
    });

    updateHalfMonthInspector(letter);
  }

  function renderMonthsMatrix() {
    const byLetter = getDiscoveriesByHalfLetter();

    els.monthsMatrix.innerHTML = MONTH_NAMES.map((m) => {
      const pair = Decoder.HALF_MONTH_TABLE.filter((h) => h.month === m.num);
      const cellsHtml = pair.map((h) => {
        const hits = byLetter[h.letter] || [];
        const hasHit = hits.length > 0;
        const endText = h.leapVariable ? '月底' : h.endDay;
        const star = hasHit ? `<span class="half-cell__star" title="合作巡天計畫發現 ${hits.length} 顆">★${hits.length}</span>` : '';

        return `
          <button
            type="button"
            class="half-cell ${hasHit ? 'half-cell--has-discovery' : ''}"
            data-letter="${h.letter}"
            data-month="${m.num}"
          >
            ${star}
            <span class="half-cell__letter">${h.letter}</span>
            <span class="half-cell__days">${h.startDay}–${endText}日</span>
          </button>
        `;
      }).join('');

      return `
        <div class="month-card" data-month="${m.num}">
          <div class="month-card__head">
            <span class="month-card__name">${m.zh}</span>
            <span class="month-card__en">${m.en}</span>
          </div>
          <div class="month-halves">${cellsHtml}</div>
        </div>
      `;
    }).join('');

    highlightHalfMonth(state.activeHalfLetter);
  }

  function renderStaticRuleTables() {
    // 25 個第二字母序位表（A–Z，跳過 I）
    els.secondLetterStrip.innerHTML = Decoder.SECOND_LETTERS.split('').map((ch, idx) => `
      <div class="alpha-chip" title="字母 ${ch} ＝ 第 ${idx + 1} 位">
        <b>${ch}</b>
        <small>${idx + 1}</small>
      </div>
    `).join('');

    // MPC 100 次以上第 5 碼對照表（A=10..H=17 + 常見進階）
    const samples = [
      { code: 'A', val: 10, range: '100–109' },
      { code: 'B', val: 11, range: '110–119' },
      { code: 'C', val: 12, range: '120–129' },
      { code: 'D', val: 13, range: '130–139' },
      { code: 'E', val: 14, range: '140–149' },
      { code: 'F', val: 15, range: '150–159' },
      { code: 'G', val: 16, range: '160–169' },
      { code: 'Z', val: 35, range: '350–359' }
    ];

    els.cycleCodeGrid.innerHTML = samples.map((s) => `
      <div class="cycle-code-cell" title="代表循環 ${s.range} 次">
        <strong>${s.code}</strong>=${s.val} <span>(${s.range})</span>
      </div>
    `).join('');
  }

  /* ========================================================================
     深空動態星空背景 Canvas
     ======================================================================== */
  function initStarfield() {
    const canvas = document.getElementById('starfieldCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let stars = [];

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(180, Math.max(70, Math.floor((width * height) / 11000)));
      const palette = ['#f8fafc', '#bae6fd', '#ddd6fe', '#fef3c7'];
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.45 + 0.35,
        baseAlpha: Math.random() * 0.55 + 0.2,
        speed: Math.random() * 0.014 + 0.004,
        phase: Math.random() * Math.PI * 2,
        color: palette[Math.floor(Math.random() * palette.length)]
      }));
    }

    function draw(time) {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const alpha = reduceMotion
          ? s.baseAlpha
          : s.baseAlpha + Math.sin(time * s.speed * 0.08 + s.phase) * 0.22;
        ctx.globalAlpha = Math.max(0.08, Math.min(0.95, alpha));
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduceMotion) {
        requestAnimationFrame(draw);
      }
    }

    resize();
    window.addEventListener('resize', resize);
    draw(0);
  }

  /* ========================================================================
     事件綁定
     ======================================================================== */
  function bindEvents() {
    // 1. 解碼器即時輸入
    els.input.addEventListener('input', (e) => {
      runDecoder(e.target.value);
    });

    // 互轉代入按鈕
    els.swapBtn.addEventListener('click', () => {
      if (!state.lastDecoded) return;
      const target = state.lastDecoded.inputFormat === 'standard'
        ? state.lastDecoded.packed
        : state.lastDecoded.standard;
      if (!target) {
        showToast('此編號超出標準 7 碼壓縮格式範圍，無法切換。');
        return;
      }
      els.input.value = target;
      runDecoder(target);
      showToast(`已切換為${state.lastDecoded.inputFormat === 'packed' ? 'MPC 7 碼壓縮格式' : '標準臨時編號'}：${target}`);
    });

    // 清除輸入
    els.clearBtn.addEventListener('click', () => {
      els.input.value = '';
      runDecoder('');
      els.input.focus();
    });

    // 快速範例按鈕
    els.sampleChips.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-sample]');
      if (!btn) return;
      const val = btn.dataset.sample;
      els.input.value = val;
      runDecoder(val);
    });

    // 複製標準 / 壓縮編號
    els.copyStandardBtn.addEventListener('click', () => {
      copyText(els.copyStandardBtn.dataset.copy, '標準臨時編號');
    });
    els.copyPackedBtn.addEventListener('click', () => {
      copyText(els.copyPackedBtn.dataset.copy, 'MPC 壓縮編號');
    });

    // 協會匹配橫幅開啟 Modal
    els.matchBanner.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-open-id]');
      if (!btn) return;
      const found = state.asteroids.find((a) => a.id === Number(btn.dataset.openId));
      openModalByAsteroid(found);
    });

    // 2. 儀表板篩選按鈕
    document.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.filter = btn.dataset.filter;
        renderDashboard();
      });
    });

    // 排序選單
    els.sortSelect.addEventListener('change', (e) => {
      state.sort = e.target.value;
      renderDashboard();
    });

    // 檢視切換（卡片 / 時間軸）
    document.querySelectorAll('.view-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.view-btn').forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.view = btn.dataset.view;
        renderDashboard();
      });
    });

    // KPI 重點目標捷徑按鈕
    document.querySelectorAll('[data-open-standard]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const found = findAssociationMatch(btn.dataset.openStandard);
        openModalByAsteroid(found);
      });
    });

    // 點擊卡片或時間軸項目開啟 Modal（若點擊外部直連按鈕則直接開啟連結）
    const handleOpenFromList = (e) => {
      if (e.target.closest('a')) return;
      const trigger = e.target.closest('[data-open-id]');
      if (!trigger) return;
      const found = state.asteroids.find((a) => a.id === Number(trigger.dataset.openId));
      openModalByAsteroid(found);
    };
    const handleKeydownFromList = (e) => {
      if (e.target.closest('a')) return;
      if (e.key === 'Enter' || e.key === ' ') {
        const trigger = e.target.closest('[data-open-id]');
        if (trigger) {
          e.preventDefault();
          const found = state.asteroids.find((a) => a.id === Number(trigger.dataset.openId));
          openModalByAsteroid(found);
        }
      }
    };
    els.cardsGrid.addEventListener('click', handleOpenFromList);
    els.cardsGrid.addEventListener('keydown', handleKeydownFromList);
    els.timeline.addEventListener('click', handleOpenFromList);
    els.timeline.addEventListener('keydown', handleKeydownFromList);

    // CSV / TSV 匯入
    els.csvFileInput.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const buf = await file.arrayBuffer();
        const text = DataStore.decodeTextBuffer(buf);
        const result = DataStore.parseCsvOrTsvText(text, state.asteroids);
        if (!result.ok) {
          showToast(`匯入失敗：${result.error}`);
          return;
        }
        state.asteroids = result.data;
        els.dataSourceText.textContent = `${file.name}（已更新 ${result.updatedCount} 筆${result.addedCount ? `、新增 ${result.addedCount} 筆` : ''}）`;
        updateKpis();
        renderDashboard();
        renderMonthsMatrix();
        if (state.lastDecoded) runDecoder(els.input.value);
        showToast(`成功匯入 ${file.name}！已更新 ${result.updatedCount} 筆觀測日期。`);
      } catch (err) {
        showToast(`讀取檔案時發生錯誤：${err.message}`);
      } finally {
        e.target.value = '';
      }
    });

    // 3. 互動半月矩陣（懸停高亮月份 + 點擊帶入解碼器）
    els.monthsMatrix.addEventListener('mouseover', (e) => {
      const cell = e.target.closest('.half-cell');
      if (!cell) return;
      highlightHalfMonth(cell.dataset.letter);
    });

    els.monthsMatrix.addEventListener('focusin', (e) => {
      const cell = e.target.closest('.half-cell');
      if (!cell) return;
      highlightHalfMonth(cell.dataset.letter);
    });

    els.monthsMatrix.addEventListener('click', (e) => {
      const cell = e.target.closest('.half-cell');
      if (!cell) return;
      const letter = cell.dataset.letter;
      const byLetter = getDiscoveriesByHalfLetter();
      const hits = byLetter[letter] || [];
      const sample = hits.length > 0 ? hits[0].standard : `2026 ${letter}A`;
      els.input.value = sample;
      runDecoder(sample);
      document.getElementById('decoder').scrollIntoView({ behavior: 'smooth' });
      showToast(`已將 ${letter}（${Decoder.HALF_MONTH_MAP[letter].month} 月${Decoder.HALF_MONTH_MAP[letter].halfLabel}）範例 ${sample} 帶入解碼器`);
    });

    // Modal 關閉控制
    els.modalCloseBtn.addEventListener('click', closeModal);
    els.modal.addEventListener('click', (e) => {
      if (e.target && e.target.dataset && e.target.dataset.closeModal === 'true') {
        closeModal();
      }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !els.modal.hidden) {
        closeModal();
      }
    });
  }

  /* ========================================================================
     啟動初始化
     ======================================================================== */
  function init() {
    initStarfield();
    renderStaticRuleTables();
    updateKpis();
    renderDashboard();
    renderMonthsMatrix();
    bindEvents();
    runDecoder(els.input.value || '2026 RF10');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
