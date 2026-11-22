/**
 * 嘉義市天文協會合作巡天計畫 14 顆小行星成果資料集與 CSV/TSV 匯入解析器
 * 精確觀測日（UT）已直接讀取自專案目錄內的 asteroids_dates.csv.txt
 */
(function (global) {
  'use strict';

  const DEFAULT_ASTEROIDS = [
    {
      id: 1,
      type: 'MBA',
      packed: 'K25W11O',
      standard: '2025 WO11',
      halfMonthRange: '2025-11-16 ～ 11-30',
      firstObsUT: '2025/11/27',
      latestObsUT: '2025/11/29'
    },
    {
      id: 2,
      type: 'MBA',
      packed: 'K26A13M',
      standard: '2026 AM13',
      halfMonthRange: '2026-01-01 ～ 01-15',
      firstObsUT: '2026/1/13',
      latestObsUT: '2026/1/25'
    },
    {
      id: 3,
      type: 'MBA',
      packed: 'K26H08K',
      standard: '2026 HK8',
      halfMonthRange: '2026-04-16 ～ 04-30',
      firstObsUT: '2026/4/23',
      latestObsUT: '2026/5/12'
    },
    {
      id: 4,
      type: 'MBA',
      packed: 'K26J04Y',
      standard: '2026 JY4',
      halfMonthRange: '2026-05-01 ～ 05-15',
      firstObsUT: '2017/3/8',
      latestObsUT: '2017/3/18',
      note: '含 2017 年歷史回溯觀測（Precovery）連結紀錄'
    },
    {
      id: 5,
      type: 'NEO(PHA)',
      packed: 'K26R10F',
      standard: '2026 RF10',
      halfMonthRange: '2026-09-01 ～ 09-15',
      firstObsUT: '2026/9/9',
      latestObsUT: '2026/9/15',
      highlight: 'pha',
      note: '潛在威脅小行星（Potentially Hazardous Asteroid），具重要行星防禦追蹤價值'
    },
    {
      id: 6,
      type: 'MBA',
      packed: 'K26TC7W',
      standard: '2026 TW127',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/11',
      latestObsUT: '2026/10/13'
    },
    {
      id: 7,
      type: 'MBA',
      packed: 'K26TD7Q',
      standard: '2026 TQ137',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/12',
      latestObsUT: '2026/10/18'
    },
    {
      id: 8,
      type: 'MBA',
      packed: 'K26TD8B',
      standard: '2026 TB138',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/12',
      latestObsUT: '2026/10/18'
    },
    {
      id: 9,
      type: 'MBA',
      packed: 'K26TE6J',
      standard: '2026 TJ146',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/9',
      latestObsUT: '2026/10/13'
    },
    {
      id: 10,
      type: 'NEO(APOLLOA)',
      packed: 'K26V20Q',
      standard: '2026 VQ20',
      halfMonthRange: '2026-11-01 ～ 11-15',
      firstObsUT: '2026/11/12',
      latestObsUT: '2026/11/21',
      highlight: 'apollo',
      note: '阿波羅型近地小行星（Apollo-class NEO），軌道半長軸大於地球且近日點切入地球軌道內側'
    },
    {
      id: 11,
      type: 'MBA',
      packed: 'K26V21W',
      standard: '2026 VW21',
      halfMonthRange: '2026-11-01 ～ 11-15',
      firstObsUT: '2026/11/2',
      latestObsUT: '2026/11/12'
    },
    {
      id: 12,
      type: 'MBA',
      packed: 'K26TG1V',
      standard: '2026 TV161',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/12',
      latestObsUT: '2026/11/11'
    },
    {
      id: 13,
      type: 'MBA',
      packed: 'K26V29K',
      standard: '2026 VK29',
      halfMonthRange: '2026-11-01 ～ 11-15',
      firstObsUT: '2026/11/7',
      latestObsUT: '2026/11/9'
    },
    {
      id: 14,
      type: 'MBA',
      packed: 'K26V25D',
      standard: '2026 VD25',
      halfMonthRange: '2026-11-01 ～ 11-15',
      firstObsUT: '2026/11/2',
      latestObsUT: '2026/11/4'
    }
  ];

  const TYPE_META = {
    MBA: {
      shortLabel: 'MBA',
      fullName: '主帶小行星（Main-Belt Asteroid）',
      category: 'MBA',
      tone: 'mba'
    },
    'NEO(PHA)': {
      shortLabel: 'NEO (PHA)',
      fullName: '潛在威脅近地小行星（Potentially Hazardous Asteroid）',
      category: 'NEO',
      tone: 'pha'
    },
    'NEO(APOLLOA)': {
      shortLabel: 'NEO (APOLLOA)',
      fullName: '阿波羅型近地小行星（Apollo-class NEO）',
      category: 'NEO',
      tone: 'apollo'
    }
  };

  function normalizeDateUT(dateStr) {
    if (!dateStr) return null;
    const cleaned = String(dateStr).trim().replace(/\./g, '-').replace(/\//g, '-');
    const m = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!m) return cleaned;
    const yyyy = m[1];
    const mm = m[2].padStart(2, '0');
    const dd = m[3].padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseDateUTCms(isoStr) {
    if (!isoStr) return null;
    const m = String(isoStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }

  function computeArcDays(firstISO, latestISO) {
    const t1 = parseDateUTCms(firstISO);
    const t2 = parseDateUTCms(latestISO);
    if (t1 === null || t2 === null) return null;
    const diff = Math.round((t2 - t1) / 86400000);
    return diff >= 0 ? diff : null;
  }

  function hydrateAsteroids(list) {
    return list.map((item) => {
      const decoded = global.AsteroidDecoder.parse(item.standard);
      const firstObsISO = normalizeDateUT(item.firstObsUT);
      const latestObsISO = normalizeDateUT(item.latestObsUT);
      const arcDays = computeArcDays(firstObsISO, latestObsISO);
      const typeMeta = TYPE_META[item.type] || {
        shortLabel: item.type,
        fullName: item.type,
        category: item.type.startsWith('NEO') ? 'NEO' : 'MBA',
        tone: 'mba'
      };
      return {
        ...item,
        firstObsISO,
        latestObsISO,
        arcDays,
        decoded,
        typeMeta,
        isNEO: typeMeta.category === 'NEO',
        isPHA: item.type === 'NEO(PHA)',
        isApollo: item.type === 'NEO(APOLLOA)'
      };
    });
  }

  /**
   * 解碼 ArrayBuffer，自動偵測 UTF-16LE / UTF-16BE / UTF-8（含 BOM）
   */
  function decodeTextBuffer(buffer) {
    const bytes = new Uint8Array(buffer);
    if (bytes.length >= 2) {
      if (bytes[0] === 0xff && bytes[1] === 0xfe) {
        return new TextDecoder('utf-16le').decode(bytes.subarray(2));
      }
      if (bytes[0] === 0xfe && bytes[1] === 0xff) {
        return new TextDecoder('utf-16be').decode(bytes.subarray(2));
      }
      // 無 BOM 但每隔一個 byte 為 0x00（典型 Windows UTF-16LE）
      let nullOdd = 0;
      const sampleLen = Math.min(bytes.length, 64);
      for (let i = 1; i < sampleLen; i += 2) {
        if (bytes[i] === 0x00) nullOdd++;
      }
      if (nullOdd > sampleLen / 4) {
        return new TextDecoder('utf-16le').decode(bytes);
      }
    }
    const text = new TextDecoder('utf-8').decode(bytes);
    return text.replace(/^\uFEFF/, '');
  }

  /**
   * 解析匯入的 CSV 或 TSV 檔案，將首次觀測日與最新觀測日更新至清單中
   */
  function parseCsvOrTsvText(text, currentList) {
    const lines = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return { ok: false, error: 'CSV 檔案內容不足（至少需包含標題列與一筆資料）。' };
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^"|"$/g, ''));

    const findCol = (patterns) =>
      headers.findIndex((h) => patterns.some((p) => p.test(h)));

    const colStd = findCol([/臨時編號|標準編號|designation|standard/i]);
    const colPacked = findCol([/壓縮|packed/i]);
    const colFirst = findCol([/首次觀測|first/i]);
    const colLatest = findCol([/最新觀測|latest|last/i]);
    const colType = findCol([/類型|type/i]);

    if (colStd === -1 && colPacked === -1) {
      return { ok: false, error: '找不到「臨時編號 / 標準編號 / 壓縮編號」欄位，請確認 CSV 欄位標題。' };
    }

    const byStandard = new Map();
    const byPacked = new Map();
    const cloned = currentList.map((a) => ({ ...a }));
    cloned.forEach((a) => {
      byStandard.set(a.standard.toUpperCase().replace(/\s+/g, ' '), a);
      byPacked.set(a.packed.toUpperCase(), a);
    });

    let updatedCount = 0;
    let addedCount = 0;

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ''));
      const rawStd = colStd !== -1 ? cells[colStd] : '';
      const rawPacked = colPacked !== -1 ? cells[colPacked] : '';
      const rawFirst = colFirst !== -1 ? cells[colFirst] : '';
      const rawLatest = colLatest !== -1 ? cells[colLatest] : '';
      const rawType = colType !== -1 ? cells[colType] : '';

      const keyStd = rawStd.toUpperCase().replace(/\s+/g, ' ');
      const keyPacked = rawPacked.toUpperCase();

      const existing = byStandard.get(keyStd) || byPacked.get(keyPacked);
      if (existing) {
        if (rawFirst) existing.firstObsUT = rawFirst;
        if (rawLatest) existing.latestObsUT = rawLatest;
        if (rawType) existing.type = rawType;
        updatedCount++;
      } else if (rawStd || rawPacked) {
        const parsed = global.AsteroidDecoder.parse(rawStd || rawPacked);
        if (parsed.ok) {
          const newEntry = {
            id: cloned.length + 1,
            type: rawType || 'MBA',
            packed: parsed.packed || rawPacked || '—',
            standard: parsed.standard,
            halfMonthRange: parsed.halfMonth.rangeISO,
            firstObsUT: rawFirst || '',
            latestObsUT: rawLatest || ''
          };
          cloned.push(newEntry);
          byStandard.set(newEntry.standard.toUpperCase(), newEntry);
          addedCount++;
        }
      }
    }

    return {
      ok: true,
      data: hydrateAsteroids(cloned),
      updatedCount,
      addedCount
    };
  }

  global.AsteroidData = {
    DEFAULT_ASTEROIDS,
    TYPE_META,
    DATA_SOURCE_LABEL: 'asteroids_dates.csv.txt（已載入精確 UT 觀測日）',
    normalizeDateUT,
    computeArcDays,
    hydrateAsteroids,
    decodeTextBuffer,
    parseCsvOrTsvText
  };
})(window);
