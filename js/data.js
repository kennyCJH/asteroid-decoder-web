/**
 * 嘉義市天文協會-麗江雙子天文台天體搜尋計劃 14 顆小行星成果資料集與 CSV/TSV 匯入解析器
 * - 精確觀測日（UT）讀取自專案目錄內的 asteroids_dates.csv.txt
 * - 軌道根數（Orbital Elements）取自 NASA JPL SBDB / IAU MPC 官方資料庫
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
      latestObsUT: '2025/11/29',
      orbit: {
        epoch: '2025-11-29.0',
        epochJd: 2461008.5,
        a: 2.7499038,
        e: 0.1540618,
        incl: 2.6601841,
        node: 241.8148675,
        peri: 179.8072779,
        m: 3.3819948,
        q: 2.3262486,
        ad: 3.1735589,
        periodDays: 1665.615,
        moid: 1.3386
      }
    },
    {
      id: 2,
      type: 'MBA',
      packed: 'K26A13M',
      standard: '2026 AM13',
      halfMonthRange: '2026-01-01 ～ 01-15',
      firstObsUT: '2026/1/13',
      latestObsUT: '2026/1/25',
      orbit: {
        epoch: '2026-06-09.0',
        epochJd: 2461200.5,
        a: 2.3407987,
        e: 0.0950938,
        incl: 3.1699018,
        node: 328.8251173,
        peri: 157.2633912,
        m: 35.78074,
        q: 2.1194332,
        ad: 2.5628259,
        periodDays: 1308.388,
        moid: 1.13494
      }
    },
    {
      id: 3,
      type: 'MBA',
      packed: 'K26H08K',
      standard: '2026 HK8',
      halfMonthRange: '2026-04-16 ～ 04-30',
      firstObsUT: '2026/4/23',
      latestObsUT: '2026/5/12',
      orbit: {
        epoch: '2025-11-21.0',
        epochJd: 2461000.5,
        a: 2.7135161,
        e: 0.1418152,
        incl: 2.73182,
        node: 210.28143,
        peri: 53.8559,
        m: 287.93065,
        q: 2.3286983,
        ad: 3.0983339,
        periodDays: 1632.665,
        moid: null
      }
    },
    {
      id: 4,
      type: 'MBA',
      packed: 'K26J04Y',
      standard: '2026 JY4',
      halfMonthRange: '2026-05-01 ～ 05-15',
      firstObsUT: '2017/3/8',
      latestObsUT: '2017/3/18',
      note: '含 2017 年歷史回溯觀測（Precovery）連結紀錄',
      orbit: {
        epoch: '2017-03-17.0',
        epochJd: 2457829.5,
        a: 2.6985349,
        e: 0.0997573,
        incl: 2.8563409,
        node: 45.4921651,
        peri: 160.9320009,
        m: 333.4165203,
        q: 2.4293364,
        ad: 2.9677333,
        periodDays: 1619.163,
        moid: 1.42512
      }
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
      note: '潛在威脅小行星（Potentially Hazardous Asteroid），軌道傾角達 25.24°、地球 MOID 僅 0.0332 AU，具重要行星防禦追蹤價值',
      orbit: {
        epoch: '2026-09-13.0',
        epochJd: 2461296.5,
        a: 1.4676407,
        e: 0.4060959,
        incl: 25.242838,
        node: 336.7374287,
        peri: 310.2456707,
        m: 27.7677795,
        q: 0.8716379,
        ad: 2.0636435,
        periodDays: 649.424,
        moid: 0.0332129
      }
    },
    {
      id: 6,
      type: 'MBA',
      packed: 'K26TC7W',
      standard: '2026 TW127',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/11',
      latestObsUT: '2026/10/13',
      orbit: {
        epoch: '2026-06-09.0',
        epochJd: 2461200.5,
        a: 2.2488582,
        e: 0.0873322,
        incl: 9.51038,
        node: 17.89212,
        peri: 358.76086,
        m: 325.02518,
        q: 2.0524605,
        ad: 2.4452559,
        periodDays: 1231.804,
        moid: null
      }
    },
    {
      id: 7,
      type: 'MBA',
      packed: 'K26TD7Q',
      standard: '2026 TQ137',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/12',
      latestObsUT: '2026/10/18',
      orbit: {
        epoch: '2026-06-09.0',
        epochJd: 2461200.5,
        a: 2.7513234,
        e: 0.1207043,
        incl: 1.49378,
        node: 20.05227,
        peri: 26.92048,
        m: 311.46031,
        q: 2.4192268,
        ad: 3.08342,
        periodDays: 1666.905,
        moid: null
      }
    },
    {
      id: 8,
      type: 'MBA',
      packed: 'K26TD8B',
      standard: '2026 TB138',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/12',
      latestObsUT: '2026/10/18',
      orbit: {
        epoch: '2026-06-09.0',
        epochJd: 2461200.5,
        a: 2.8994267,
        e: 0.2205449,
        incl: 6.2584,
        node: 20.39829,
        peri: 4.26223,
        m: 331.80342,
        q: 2.2599729,
        ad: 3.5388805,
        periodDays: 1803.294,
        moid: null
      }
    },
    {
      id: 9,
      type: 'MBA',
      packed: 'K26TE6J',
      standard: '2026 TJ146',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/9',
      latestObsUT: '2026/10/13',
      orbit: {
        epoch: '2026-06-09.0',
        epochJd: 2461200.5,
        a: 2.6078893,
        e: 0.2733558,
        incl: 12.67962,
        node: 196.64066,
        peri: 134.50771,
        m: 357.26987,
        q: 1.8950076,
        ad: 3.320771,
        periodDays: 1538.269,
        moid: null
      }
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
      note: '阿波羅型近地小行星（Apollo-class NEO），高離心率（e=0.667）使近日點切入地球軌道內側達 0.729 AU，地球 MOID 僅 0.0449 AU',
      orbit: {
        epoch: '2026-11-16.0',
        epochJd: 2461360.5,
        a: 2.1880151,
        e: 0.6667032,
        incl: 11.3440954,
        node: 254.5696515,
        peri: 235.2815248,
        m: 344.1988193,
        q: 0.7292585,
        ad: 3.6467716,
        periodDays: 1182.154,
        moid: 0.0448665
      }
    },
    {
      id: 11,
      type: 'MBA',
      packed: 'K26V21W',
      standard: '2026 VW21',
      halfMonthRange: '2026-11-01 ～ 11-15',
      firstObsUT: '2026/11/2',
      latestObsUT: '2026/11/12',
      orbit: {
        epoch: '2026-06-09.0',
        epochJd: 2461200.5,
        a: 2.1700037,
        e: 0.1982407,
        incl: 3.23312,
        node: 222.97314,
        peri: 141.17948,
        m: 338.90583,
        q: 1.7398206,
        ad: 2.6001868,
        periodDays: 1167.587,
        moid: null
      }
    },
    {
      id: 12,
      type: 'MBA',
      packed: 'K26TG1V',
      standard: '2026 TV161',
      halfMonthRange: '2026-10-01 ～ 10-15',
      firstObsUT: '2026/10/12',
      latestObsUT: '2026/11/11',
      orbit: {
        epoch: '2026-06-09.0',
        epochJd: 2461200.5,
        a: 3.0484826,
        e: 0.202467,
        incl: 0.48954,
        node: 172.8463,
        peri: 185.0699,
        m: 351.12952,
        q: 2.4312655,
        ad: 3.6656997,
        periodDays: 1944.124,
        moid: null
      }
    },
    {
      id: 13,
      type: 'MBA',
      packed: 'K26V29K',
      standard: '2026 VK29',
      halfMonthRange: '2026-11-01 ～ 11-15',
      firstObsUT: '2026/11/7',
      latestObsUT: '2026/11/9',
      orbit: {
        epoch: '2026-06-09.0',
        epochJd: 2461200.5,
        a: 2.7267021,
        e: 0.1662636,
        incl: 1.98323,
        node: 222.46741,
        peri: 181.3189,
        m: 328.28921,
        q: 2.2733508,
        ad: 3.1800534,
        periodDays: 1644.58,
        moid: null
      }
    },
    {
      id: 14,
      type: 'MBA',
      packed: 'K26V25D',
      standard: '2026 VD25',
      halfMonthRange: '2026-11-01 ～ 11-15',
      firstObsUT: '2026/11/2',
      latestObsUT: '2026/11/4',
      orbit: {
        epoch: '2026-06-09.0',
        epochJd: 2461200.5,
        a: 2.0499683,
        e: 0.1783848,
        incl: 5.06884,
        node: 39.78517,
        peri: 10.27912,
        m: 304.01261,
        q: 1.6842851,
        ad: 2.4156515,
        periodDays: 1072.06,
        moid: null
      }
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

  function buildMpcOrbitUrl(standard, orbit) {
    if (!orbit) return null;
    const des = encodeURIComponent(standard).replace(/%20/g, '+');
    return (
      'https://www.minorplanetcenter.net/db_search/show_orbit' +
      `?utf8=%E2%9C%93&number=&designation=${des}&name=` +
      `&epoch=${encodeURIComponent(orbit.epoch)}` +
      `&peri=${orbit.peri}&m=${orbit.m}&node=${orbit.node}` +
      `&incl=${orbit.incl}&e=${orbit.e}&a=${orbit.a}` +
      '&commit=%E4%BA%92%E5%8B%95%E5%BC%8F%E8%BB%8C%E9%81%93%E8%8D%89%E5%9C%96'
    );
  }

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
      const mpcOrbitUrl = buildMpcOrbitUrl(item.standard, item.orbit);
      return {
        ...item,
        firstObsISO,
        latestObsISO,
        arcDays,
        decoded,
        typeMeta,
        mpcOrbitUrl,
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
    buildMpcOrbitUrl,
    normalizeDateUT,
    computeArcDays,
    hydrateAsteroids,
    decodeTextBuffer,
    parseCsvOrTsvText
  };
})(window);
