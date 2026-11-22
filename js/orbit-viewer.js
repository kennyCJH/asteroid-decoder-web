/**
 * 互動式 3D 克卜勒動態軌道視覺化引擎（Canvas 2D + 3D 透視投影）
 * 依據真實軌道根數（a, e, incl, node, peri, m, epochJd）即時繪製太陽系內行星與目標小行星動態軌道。
 */
(function (global) {
  'use strict';

  const DEG2RAD = Math.PI / 180;
  const J2000_JD = 2451545.0; // 2000-01-01 12:00 TT

  // 參考行星 J2000 軌道根數（水星～木星）
  const PLANETS = [
    { name: '水星', en: 'Mercury', a: 0.3871, e: 0.2056, incl: 7.00, node: 48.33,  peri: 29.12,  m0: 174.79, period: 87.969,   color: '#94a3b8', r: 2.6 },
    { name: '金星', en: 'Venus',   a: 0.7233, e: 0.0068, incl: 3.39, node: 76.68,  peri: 54.88,  m0: 50.42,  period: 224.701,  color: '#fcd34d', r: 3.3 },
    { name: '地球', en: 'Earth',   a: 1.0000, e: 0.0167, incl: 0.00, node: 0.00,   peri: 102.94, m0: 357.53, period: 365.256,  color: '#38bdf8', r: 3.9 },
    { name: '火星', en: 'Mars',    a: 1.5237, e: 0.0934, incl: 1.85, node: 49.56,  peri: 286.50, m0: 19.37,  period: 686.980,  color: '#fb7185', r: 3.2 },
    { name: '木星', en: 'Jupiter', a: 5.2044, e: 0.0489, incl: 1.30, node: 100.46, peri: 273.87, m0: 20.02,  period: 4332.589, color: '#fdba74', r: 5.2 }
  ];

  function dateToJd(date) {
    return date.getTime() / 86400000 + 2440587.5;
  }

  function jdToDateString(jd) {
    const ms = (jd - 2440587.5) * 86400000;
    const d = new Date(ms);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} UT`;
  }

  // 牛頓法解克卜勒方程式：E - e*sin(E) = M
  function solveKepler(M, e) {
    let mNorm = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    let E = e < 0.8 ? mNorm : Math.PI;
    for (let i = 0; i < 7; i++) {
      const f = E - e * Math.sin(E) - mNorm;
      const fp = 1 - e * Math.cos(E);
      E -= f / fp;
    }
    return E;
  }

  // 由偏近點角 E 計算 3D 日心黃道座標 (AU)
  function orbitalToEcliptic3D(a, e, inclDeg, nodeDeg, periDeg, E) {
    const i = inclDeg * DEG2RAD;
    const om = nodeDeg * DEG2RAD;
    const w = periDeg * DEG2RAD;

    const cosO = Math.cos(om), sinO = Math.sin(om);
    const cosW = Math.cos(w),  sinW = Math.sin(w);
    const cosI = Math.cos(i),  sinI = Math.sin(i);

    const xOrb = a * (Math.cos(E) - e);
    const yOrb = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);

    const x = (cosO * cosW - sinO * sinW * cosI) * xOrb + (-cosO * sinW - sinO * cosW * cosI) * yOrb;
    const y = (sinO * cosW + cosO * sinW * cosI) * xOrb + (-sinO * sinW + cosO * cosW * cosI) * yOrb;
    const z = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;

    return { x, y, z };
  }

  function bodyPositionAtJd(body, jd) {
    const period = body.periodDays || body.period || (365.2568983 * Math.pow(body.a, 1.5));
    const epochJd = body.epochJd || J2000_JD;
    const m0 = (body.m !== undefined ? body.m : body.m0) * DEG2RAD;
    const n = (2 * Math.PI) / period;
    const M = m0 + n * (jd - epochJd);
    const E = solveKepler(M, body.e);
    return orbitalToEcliptic3D(body.a, body.e, body.incl, body.node, body.peri, E);
  }

  function sampleOrbitPath(body, segments) {
    const pts = [];
    for (let k = 0; k <= segments; k++) {
      const E = (k / segments) * Math.PI * 2;
      pts.push(orbitalToEcliptic3D(body.a, body.e, body.incl, body.node, body.peri, E));
    }
    return pts;
  }

  /**
   * 建立並掛載 3D 動態軌道畫布控制器
   */
  function mount(canvas, asteroid, hooks) {
    const orbit = asteroid.orbit;
    if (!canvas || !orbit) return null;

    const ctx = canvas.getContext('2d');
    const accentColor = asteroid.isPHA ? '#ff4d6d' : asteroid.isApollo ? '#fbbf24' : '#38bdf8';
    const accentGlow = asteroid.isPHA ? 'rgba(255,77,109,0.55)' : asteroid.isApollo ? 'rgba(251,191,36,0.5)' : 'rgba(56,189,248,0.5)';

    // 預先取樣所有軌道點以確保 60fps 流暢度
    const targetPath = sampleOrbitPath(orbit, 180);
    const perihelionPt = orbitalToEcliptic3D(orbit.a, orbit.e, orbit.incl, orbit.node, orbit.peri, 0);
    const planetPaths = PLANETS.map((p) => ({
      planet: p,
      pts: sampleOrbitPath(p, 110)
    }));

    // 依小行星遠日點自動決定預設縮放比例
    const maxReach = Math.max(orbit.ad || (orbit.a * (1 + orbit.e)), 2.2);
    const defaultZoom = maxReach > 4.2 ? 0.66 : maxReach > 3.1 ? 0.88 : 1.05;

    const cam = {
      yaw: -0.78,           // 水平旋轉角 (rad)
      pitch: 0.92,          // 仰角 (rad)，0 = 側視、PI/2 = 正俯視
      zoom: defaultZoom
    };

    let simJd = dateToJd(new Date());
    let isPlaying = true;
    let speedDaysPerSec = 45;
    let lastTimestamp = 0;
    let rafId = null;
    let destroyed = false;

    // 拖拽旋轉狀態
    let dragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let startYaw = 0;
    let startPitch = 0;

    let width = 640;
    let height = 340;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // 將 3D 日心座標 (AU) 投影至 2D 畫布
    function project(pt) {
      const cosY = Math.cos(cam.yaw), sinY = Math.sin(cam.yaw);
      const x1 = pt.x * cosY - pt.y * sinY;
      const y1 = pt.x * sinY + pt.y * cosY;
      const z1 = pt.z;

      const tilt = (Math.PI / 2) - cam.pitch; // 0 = 正俯視
      const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
      const y2 = y1 * cosT - z1 * sinT;
      const z2 = y1 * sinT + z1 * cosT;

      const baseScale = Math.min(width, height) * 0.145 * cam.zoom;
      const cameraDist = 18;
      const persp = cameraDist / (cameraDist - z2 * 0.65);

      return {
        sx: width * 0.5 + x1 * baseScale * persp,
        sy: height * 0.52 - y2 * baseScale * persp,
        depth: z2,
        scale: persp
      };
    }

    function drawEclipticGrid() {
      const rings = [1, 2, 3, 5];
      ctx.save();
      ctx.lineWidth = 1;
      rings.forEach((au) => {
        ctx.beginPath();
        for (let k = 0; k <= 72; k++) {
          const ang = (k / 72) * Math.PI * 2;
          const p = project({ x: Math.cos(ang) * au, y: Math.sin(ang) * au, z: 0 });
          if (k === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        }
        ctx.strokeStyle = au === 1 ? 'rgba(56, 189, 248, 0.16)' : 'rgba(148, 163, 200, 0.09)';
        ctx.stroke();

        // 標示 AU 刻度
        const lbl = project({ x: au, y: 0, z: 0 });
        ctx.fillStyle = 'rgba(148, 163, 200, 0.42)';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillText(`${au} AU`, lbl.sx + 4, lbl.sy - 3);
      });

      // 春分點參考軸 (+X)
      const o = project({ x: 0, y: 0, z: 0 });
      const xAxis = project({ x: 5.5, y: 0, z: 0 });
      ctx.strokeStyle = 'rgba(148, 163, 200, 0.12)';
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(o.sx, o.sy);
      ctx.lineTo(xAxis.sx, xAxis.sy);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    function drawSun() {
      const s = project({ x: 0, y: 0, z: 0 });
      const grad = ctx.createRadialGradient(s.sx, s.sy, 1, s.sx, s.sy, 18);
      grad.addColorStop(0, '#fffbeb');
      grad.addColorStop(0.35, 'rgba(251, 191, 36, 0.9)');
      grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, 18, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef3c7';
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawPlanetOrbitsAndBodies() {
      planetPaths.forEach(({ planet, pts }) => {
        ctx.save();
        ctx.beginPath();
        pts.forEach((pt, idx) => {
          const p = project(pt);
          if (idx === 0) ctx.moveTo(p.sx, p.sy);
          else ctx.lineTo(p.sx, p.sy);
        });
        ctx.strokeStyle = planet.en === 'Earth'
          ? 'rgba(56, 189, 248, 0.42)'
          : planet.en === 'Mars'
            ? 'rgba(251, 113, 133, 0.28)'
            : planet.en === 'Jupiter'
              ? 'rgba(253, 186, 116, 0.24)'
              : 'rgba(148, 163, 200, 0.18)';
        ctx.lineWidth = planet.en === 'Earth' ? 1.35 : 1;
        ctx.stroke();

        // 行星即時位置
        const pos = bodyPositionAtJd(planet, simJd);
        const proj = project(pos);
        ctx.fillStyle = planet.color;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, planet.r, 0, Math.PI * 2);
        ctx.fill();

        if (planet.en === 'Earth' || planet.en === 'Mars' || planet.en === 'Jupiter') {
          ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
          ctx.font = '11px "Noto Sans TC", sans-serif';
          ctx.fillText(planet.name, proj.sx + 7, proj.sy + 3);
        }
        ctx.restore();
      });
    }

    function drawTargetOrbitAndAsteroid() {
      ctx.save();

      // 1. 依黃道面上下分段繪製：z >= 0 實線（北）、z < 0 虛線（南）
      for (let k = 0; k < targetPath.length - 1; k++) {
        const a3 = targetPath[k];
        const b3 = targetPath[k + 1];
        const pa = project(a3);
        const pb = project(b3);
        const above = (a3.z + b3.z) >= 0;

        ctx.beginPath();
        ctx.moveTo(pa.sx, pa.sy);
        ctx.lineTo(pb.sx, pb.sy);
        ctx.lineWidth = above ? 2.4 : 1.7;
        ctx.strokeStyle = above ? accentColor : accentGlow;
        ctx.setLineDash(above ? [] : [5, 5]);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // 2. 近日點 (q) 標記
      const qProj = project(perihelionPt);
      ctx.fillStyle = '#fde68a';
      ctx.beginPath();
      ctx.moveTo(qProj.sx, qProj.sy - 4.5);
      ctx.lineTo(qProj.sx + 4.5, qProj.sy);
      ctx.lineTo(qProj.sx, qProj.sy + 4.5);
      ctx.lineTo(qProj.sx - 4.5, qProj.sy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(254, 240, 138, 0.85)';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillText(`q=${orbit.q.toFixed(2)}`, qProj.sx + 7, qProj.sy + 3);

      // 3. 動態軌跡尾跡（過去 55 天）
      const trailSteps = 18;
      for (let s = trailSteps; s >= 1; s--) {
        const t1 = bodyPositionAtJd(orbit, simJd - s * 3.2);
        const t2 = bodyPositionAtJd(orbit, simJd - (s - 1) * 3.2);
        const p1 = project(t1);
        const p2 = project(t2);
        const alpha = (1 - s / (trailSteps + 1)) * 0.72;
        ctx.beginPath();
        ctx.moveTo(p1.sx, p1.sy);
        ctx.lineTo(p2.sx, p2.sy);
        ctx.strokeStyle = accentColor;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 3.2 * (1 - s / (trailSteps + 4));
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // 4. 小行星本體與黃道投影垂線（展現軌道傾角 i）
      const astPos = bodyPositionAtJd(orbit, simJd);
      const astProj = project(astPos);
      const eclProj = project({ x: astPos.x, y: astPos.y, z: 0 });

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      ctx.moveTo(astProj.sx, astProj.sy);
      ctx.lineTo(eclProj.sx, eclProj.sy);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(eclProj.sx, eclProj.sy, 2, 0, Math.PI * 2);
      ctx.fill();

      // 發光光暈
      const halo = ctx.createRadialGradient(astProj.sx, astProj.sy, 1, astProj.sx, astProj.sy, 16);
      halo.addColorStop(0, '#ffffff');
      halo.addColorStop(0.35, accentColor);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(astProj.sx, astProj.sy, 16, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(astProj.sx, astProj.sy, 4.4, 0, Math.PI * 2);
      ctx.fill();

      // 編號標籤
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "JetBrains Mono", monospace';
      ctx.fillText(asteroid.standard, astProj.sx + 10, astProj.sy - 6);

      ctx.restore();
    }

    function render(timestamp) {
      if (destroyed) return;
      if (!lastTimestamp) lastTimestamp = timestamp;
      const dtSec = Math.min((timestamp - lastTimestamp) / 1000, 0.08);
      lastTimestamp = timestamp;

      if (isPlaying) {
        simJd += dtSec * speedDaysPerSec;
      }

      // 深空漸層底色
      const bg = ctx.createRadialGradient(width * 0.5, height * 0.5, 10, width * 0.5, height * 0.5, Math.max(width, height) * 0.72);
      bg.addColorStop(0, '#0d193a');
      bg.addColorStop(1, '#040816');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      drawEclipticGrid();
      drawSun();
      drawPlanetOrbitsAndBodies();
      drawTargetOrbitAndAsteroid();

      if (hooks && typeof hooks.onDateUpdate === 'function') {
        hooks.onDateUpdate(jdToDateString(simJd));
      }

      rafId = requestAnimationFrame(render);
    }

    // 滑鼠 / 觸控拖拽旋轉
    function onPointerDown(e) {
      dragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      startYaw = cam.yaw;
      startPitch = cam.pitch;
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e) {
      if (!dragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      cam.yaw = startYaw + dx * 0.009;
      cam.pitch = Math.max(0.08, Math.min(Math.PI / 2, startPitch + dy * 0.008));
    }

    function onPointerUp() {
      dragging = false;
    }

    function onWheel(e) {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.11;
      cam.zoom = Math.max(0.32, Math.min(3.4, cam.zoom * factor));
    }

    resize();
    window.addEventListener('resize', resize);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    rafId = requestAnimationFrame(render);

    return {
      togglePlay() {
        isPlaying = !isPlaying;
        return isPlaying;
      },
      setSpeed(daysPerSec) {
        speedDaysPerSec = daysPerSec;
      },
      setPreset(mode) {
        if (mode === 'top') {
          cam.pitch = Math.PI / 2;
        } else if (mode === 'side') {
          cam.pitch = 0.22;
        } else {
          cam.yaw = -0.78;
          cam.pitch = 0.92;
          cam.zoom = defaultZoom;
        }
      },
      zoomBy(factor) {
        cam.zoom = Math.max(0.32, Math.min(3.4, cam.zoom * factor));
      },
      resetDate() {
        simJd = dateToJd(new Date());
      },
      destroy() {
        destroyed = true;
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('pointerdown', onPointerDown);
        canvas.removeEventListener('pointermove', onPointerMove);
        canvas.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('pointercancel', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
      }
    };
  }

  global.OrbitViewer = { mount };
})(window);
