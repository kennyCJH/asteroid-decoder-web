/**
 * IAU / MPC 小行星臨時編號（Provisional Designation）核心編解碼引擎
 * 支援「標準格式（如 2026 RF10）」與「MPC 7 碼壓縮格式（如 K26R10F）」雙向轉換與拆解。
 */
(function (global) {
  'use strict';

  // 半月區間字母表：A–Y，跳過易與數字 1 混淆的 I，不使用 Z（共 24 個半月）
  const HALF_MONTH_TABLE = [
    { letter: 'A', month: 1,  half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'B', month: 1,  half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 31 },
    { letter: 'C', month: 2,  half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'D', month: 2,  half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 28, leapVariable: true },
    { letter: 'E', month: 3,  half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'F', month: 3,  half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 31 },
    { letter: 'G', month: 4,  half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'H', month: 4,  half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 30 },
    { letter: 'J', month: 5,  half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15, skippedBefore: 'I' },
    { letter: 'K', month: 5,  half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 31 },
    { letter: 'L', month: 6,  half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'M', month: 6,  half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 30 },
    { letter: 'N', month: 7,  half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'O', month: 7,  half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 31 },
    { letter: 'P', month: 8,  half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'Q', month: 8,  half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 31 },
    { letter: 'R', month: 9,  half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'S', month: 9,  half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 30 },
    { letter: 'T', month: 10, half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'U', month: 10, half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 31 },
    { letter: 'V', month: 11, half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'W', month: 11, half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 30 },
    { letter: 'X', month: 12, half: 'upper', halfLabel: '上半月', startDay: 1,  endDay: 15 },
    { letter: 'Y', month: 12, half: 'lower', halfLabel: '下半月', startDay: 16, endDay: 31 }
  ];

  const HALF_MONTH_MAP = Object.create(null);
  HALF_MONTH_TABLE.forEach((item) => {
    HALF_MONTH_MAP[item.letter] = item;
  });

  // 第二個字母表：A–Z，跳過 I，共 25 個字母（序位 1～25）
  const SECOND_LETTERS = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

  // MPC 世紀代碼對照（支援 1800～2100 年代，重點為 I/J/K）
  const CENTURY_TO_CODE = {
    18: 'I',
    19: 'J',
    20: 'K',
    21: 'L'
  };

  const CODE_TO_CENTURY = {
    I: 18,
    J: 19,
    K: 20,
    L: 21
  };

  // MPC 壓縮格式第 5 碼（百位與十位）：0-9 => 0-9, A-Z => 10-35, a-z => 36-61
  const PACKED_CYCLE_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

  function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  }

  function pad2(n) {
    return String(n).padStart(2, '0');
  }

  function getHalfMonthInfo(letter, year) {
    const info = HALF_MONTH_MAP[letter];
    if (!info) return null;
    const endDay = info.leapVariable && year ? (isLeapYear(year) ? 29 : 28) : info.endDay;
    const monthStr = pad2(info.month);
    const startStr = pad2(info.startDay);
    const endStr = pad2(endDay);
    return {
      ...info,
      endDay,
      label: `${info.month} 月${info.halfLabel}`,
      rangeShort: `${info.month}/${info.startDay} ～ ${info.month}/${endDay}`,
      rangeISO: year ? `${year}-${monthStr}-${startStr} ～ ${monthStr}-${endStr}` : `${monthStr}-${startStr} ～ ${monthStr}-${endStr}`,
      startDateISO: year ? `${year}-${monthStr}-${startStr}` : null,
      endDateISO: year ? `${year}-${monthStr}-${endStr}` : null
    };
  }

  function encodeCycleToPacked(cycle) {
    if (!Number.isInteger(cycle) || cycle < 0 || cycle > 619) {
      return null;
    }
    const tensAndHundreds = Math.floor(cycle / 10);
    const ones = cycle % 10;
    const char5 = PACKED_CYCLE_CHARS[tensAndHundreds];
    return {
      code: `${char5}${ones}`,
      char5,
      char6: String(ones),
      tensAndHundreds,
      ones,
      usesLetterEncoding: cycle >= 100
    };
  }

  function decodePackedCycle(char5, char6) {
    const tensAndHundreds = PACKED_CYCLE_CHARS.indexOf(char5);
    const ones = Number(char6);
    if (tensAndHundreds === -1 || !/^\d$/.test(char6)) {
      return null;
    }
    return {
      cycle: tensAndHundreds * 10 + ones,
      char5,
      char6,
      tensAndHundreds,
      ones,
      usesLetterEncoding: tensAndHundreds >= 10
    };
  }

  function buildDecodedPayload({
    inputFormat,
    year,
    halfMonthLetter,
    secondLetter,
    cycle
  }) {
    const century = Math.floor(year / 100);
    const yearShort = pad2(year % 100);
    const centuryCode = CENTURY_TO_CODE[century] || null;
    const halfMonth = getHalfMonthInfo(halfMonthLetter, year);
    const secondLetterIndex = SECOND_LETTERS.indexOf(secondLetter) + 1;
    const order = cycle * 25 + secondLetterIndex;
    const packedCycle = encodeCycleToPacked(cycle);

    const standard = `${year} ${halfMonthLetter}${secondLetter}${cycle > 0 ? cycle : ''}`;
    const packed = centuryCode && packedCycle
      ? `${centuryCode}${yearShort}${halfMonthLetter}${packedCycle.code}${secondLetter}`
      : null;

    const formulaText = cycle > 0
      ? `(${cycle} × 25) + ${secondLetterIndex} = ${order}`
      : `(0 × 25) + ${secondLetterIndex} = ${order}`;

    const formulaDetail = cycle > 0
      ? `循環 ${cycle} 次 × 每輪 25 顆 + 字母 ${secondLetter}（第 ${secondLetterIndex} 位）`
      : `第 0 輪（無循環數字）+ 字母 ${secondLetter}（第 ${secondLetterIndex} 位）`;

    const packedCycleNote = packedCycle
      ? (packedCycle.usesLetterEncoding
        ? `第 5 碼「${packedCycle.char5}」代表 ${packedCycle.tensAndHundreds}（百與十位），第 6 碼「${packedCycle.char6}」為個位 → ${cycle}`
        : `循環 ${cycle} 次未滿 100，直接補零表示為「${packedCycle.code}」`)
      : '超出標準 7 碼壓縮循環上限（619 次）';

    return {
      ok: true,
      inputFormat, // 'standard' | 'packed'
      year,
      century,
      centuryCode,
      centuryLabel: centuryCode ? `${century}00 年代` : `${century}00 年代（非 I/J/K 常見世紀）`,
      yearShort,
      halfMonthLetter,
      halfMonth,
      secondLetter,
      secondLetterIndex,
      cycle,
      order,
      formulaText,
      formulaDetail,
      standard,
      packed,
      packedCycle,
      packedCycleNote,
      mpcUrl: `https://www.minorplanetcenter.net/db_search/show_object?object_id=${encodeURIComponent(standard)}`,
      jplUrl: `https://ssd.jpl.nasa.gov/tools/sbdb_lookup.html#/?sstr=${encodeURIComponent(standard)}`
    };
  }

  /**
   * 解析標準格式或 MPC 7 碼壓縮格式
   * @param {string} rawInput
   */
  function parse(rawInput) {
    const trimmed = String(rawInput || '').trim();
    if (!trimmed) {
      return { ok: false, empty: true, error: '請輸入標準臨時編號（如 2026 RF10）或 MPC 7 碼壓縮編號（如 K26R10F）。' };
    }

    // 1. 嘗試判斷是否為標準臨時編號（以 4 位西元年份開頭）
    const standardCandidate = trimmed.replace(/\s+/g, ' ');
    if (/^\d{4}/.test(standardCandidate)) {
      const match = standardCandidate.toUpperCase().match(/^(\d{4})\s*([A-Z])([A-Z])(\d*)$/);
      if (!match) {
        return {
          ok: false,
          error: '標準格式需為「4 位年份 + 兩個英文字母 + 選填循環數字」，例如：2026 RF10 或 2026 TW127。'
        };
      }

      const year = Number(match[1]);
      const halfLetter = match[2];
      const secondLetter = match[3];
      const cycleStr = match[4];

      if (year < 1800 || year > 2199) {
        return { ok: false, error: '目前支援西元 1800 至 2199 年的小行星臨時編號解析。' };
      }
      if (halfLetter === 'I') {
        return { ok: false, error: '半月字母不可為「I」：IAU 規則中跳過字母 I，以避免與數字 1 混淆（5 月上半月為 J）。' };
      }
      if (halfLetter === 'Z') {
        return { ok: false, error: '半月字母不可為「Z」：一年共 24 個半月，僅使用 A–Y（跳過 I），不包含 Z。' };
      }
      if (!HALF_MONTH_MAP[halfLetter]) {
        return { ok: false, error: `無效的半月字母「${halfLetter}」，請使用 A–Y（不含 I）。` };
      }
      if (secondLetter === 'I') {
        return { ok: false, error: '第二個字母不可為「I」：IAU 編號順位表（A–Z）跳過字母 I，每輪共 25 個字母。' };
      }
      if (!SECOND_LETTERS.includes(secondLetter)) {
        return { ok: false, error: `無效的第二字母「${secondLetter}」。` };
      }

      const cycle = cycleStr === '' ? 0 : Number(cycleStr);
      if (!Number.isInteger(cycle) || cycle < 0 || cycle > 9999) {
        return { ok: false, error: '循環數字必須為合理的非負整數。' };
      }

      return buildDecodedPayload({
        inputFormat: 'standard',
        year,
        halfMonthLetter: halfLetter,
        secondLetter,
        cycle
      });
    }

    // 2. 嘗試判斷是否為 MPC 7 碼壓縮格式（無空白的 7 碼）
    const compact = trimmed.replace(/\s+/g, '');
    if (compact.length === 7 && /^[A-Za-z]\d{2}[A-Za-z][0-9A-Za-z]\d[A-Za-z]$/.test(compact)) {
      // 若使用者全部輸入小寫（如 k26tc7w），將第 5 碼也轉為大寫；
      // 若僅第 5 碼為小寫（如 K26Ta5B），保留第 5 碼小寫以支援 MPC 循環 360–619。
      const isAllLowerAlpha =
        compact[0] === compact[0].toLowerCase() &&
        compact[3] === compact[3].toLowerCase() &&
        compact[6] === compact[6].toLowerCase();

      const centuryCode = compact[0].toUpperCase();
      const yearTwoDigits = Number(compact.slice(1, 3));
      const halfLetter = compact[3].toUpperCase();
      const char5 = isAllLowerAlpha ? compact[4].toUpperCase() : compact[4];
      const char6 = compact[5];
      const secondLetter = compact[6].toUpperCase();

      if (!CODE_TO_CENTURY[centuryCode]) {
        return {
          ok: false,
          error: `MPC 壓縮編號第 1 碼「${centuryCode}」無效：常見世紀代碼為 I（1800年代）、J（1900年代）、K（2000年代）。`
        };
      }
      if (halfLetter === 'I' || halfLetter === 'Z' || !HALF_MONTH_MAP[halfLetter]) {
        return {
          ok: false,
          error: `MPC 壓縮編號第 4 碼（半月字母）「${halfLetter}」無效：僅使用 A–Y（跳過 I，無 Z）。`
        };
      }
      if (secondLetter === 'I' || !SECOND_LETTERS.includes(secondLetter)) {
        return {
          ok: false,
          error: `MPC 壓縮編號第 7 碼（第二字母）「${secondLetter}」無效：A–Z 中跳過字母 I。`
        };
      }

      const decodedCycle = decodePackedCycle(char5, char6);
      if (!decodedCycle) {
        return {
          ok: false,
          error: `MPC 壓縮編號第 5–6 碼「${char5}${char6}」無法解析為有效循環次數。`
        };
      }

      const year = CODE_TO_CENTURY[centuryCode] * 100 + yearTwoDigits;

      return buildDecodedPayload({
        inputFormat: 'packed',
        year,
        halfMonthLetter: halfLetter,
        secondLetter,
        cycle: decodedCycle.cycle
      });
    }

    return {
      ok: false,
      error: '無法辨識此編號格式。請輸入標準編號（如 2026 RF10、2026 TW127）或 7 碼 MPC 壓縮編號（如 K26R10F、K26TC7W）。'
    };
  }

  global.AsteroidDecoder = {
    HALF_MONTH_TABLE,
    HALF_MONTH_MAP,
    SECOND_LETTERS,
    CENTURY_TO_CODE,
    CODE_TO_CENTURY,
    PACKED_CYCLE_CHARS,
    isLeapYear,
    getHalfMonthInfo,
    encodeCycleToPacked,
    decodePackedCycle,
    parse
  };
})(window);
