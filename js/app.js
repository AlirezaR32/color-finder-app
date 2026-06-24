/**
 * app.js — Camera capture + UI controller for رنگ‌یاب (Color Finder)
 * --------------------------------------------------------------------
 * Depends on colors.js being loaded first (window.ColorEngine).
 */
(function () {
  "use strict";

  const { findNearest, rgbToHex } = window.ColorEngine;

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  /* ---------------------------------------------------------
     DOM refs
  --------------------------------------------------------- */
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const permOverlay = document.getElementById("permOverlay");
  const permDetail = document.getElementById("permDetail");
  const swatchMain = document.getElementById("swatchMain");
  const swatchRaw = document.getElementById("swatchRaw");
  const nameFa = document.getElementById("nameFa");
  const nameEn = document.getElementById("nameEn");
  const meter = document.getElementById("meter");
  const meterSegs = meter.querySelectorAll("span");
  const matchLabel = document.getElementById("matchLabel");
  const hexVal = document.getElementById("hexVal");
  const rgbVal = document.getElementById("rgbVal");
  const deVal = document.getElementById("deVal");
  const liveToggle = document.getElementById("liveToggle");
  const shutterBtn = document.getElementById("shutterBtn");
  const histToggle = document.getElementById("histToggle");
  const historyEl = document.getElementById("history");
  const flipBtn = document.getElementById("flipBtn");
  const retryBtn = document.getElementById("retryBtn");
  const searchBtn = document.getElementById("searchBtn");
  const colorBrowser = document.getElementById("colorBrowser");
  const cbClose = document.getElementById("cbClose");
  const cbSearch = document.getElementById("cbSearch");
  const cbGrid = document.getElementById("cbGrid");
  const cbCount = document.getElementById("cbCount");

  /* ---------------------------------------------------------
     State
  --------------------------------------------------------- */
  let stream = null;
  let facingMode = "environment";
  let isLive = true;
  let sampleTimer = null;
  let videoReady = false;
  let historyItems = [];
  let lastReading = null;

  const SAMPLE_BOX = 26; // px region averaged at the reticle centre
  const SAMPLE_INTERVAL_MS = 260;
  const HISTORY_LIMIT = 14;

  /* ---------------------------------------------------------
     Camera
  --------------------------------------------------------- */
  async function startCamera() {
    stopCamera();
    videoReady = false;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      video.srcObject = stream;
      video.classList.toggle("mirror", facingMode === "user");
      await video.play();
      permOverlay.hidden = true;
      video.onloadedmetadata = () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        videoReady = true;
      };
      if (isLive) startSampling();
    } catch (err) {
      showPermissionError(err);
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
    stopSampling();
  }

  function showPermissionError(err) {
    let msg = "برای تشخیص رنگ، اجازهٔ دسترسی به دوربین را در مرورگر بدهید.";
    if (err && err.name === "NotAllowedError") {
      msg = "دسترسی به دوربین رد شد. آن را از تنظیمات مرورگر برای این صفحه فعال کنید.";
    } else if (err && err.name === "NotFoundError") {
      msg = "هیچ دوربینی روی این دستگاه پیدا نشد.";
    } else if (location.protocol === "file:") {
      msg =
        "این فایل به‌صورت مستقیم (file://) باز شده و مرورگرها برای آن دوربین را مسدود می‌کنند. آن را روی یک سرور محلی یا HTTPS اجرا کنید (به README.md مراجعه کنید).";
    }
    permDetail.textContent = msg;
    permOverlay.hidden = false;
  }

  /* ---------------------------------------------------------
     Sampling loop
  --------------------------------------------------------- */
  function sampleOnce() {
    if (!videoReady || video.videoWidth === 0) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const cx = Math.floor(canvas.width / 2);
    const cy = Math.floor(canvas.height / 2);
    const half = Math.floor(SAMPLE_BOX / 2);
    const x = clamp(cx - half, 0, canvas.width - SAMPLE_BOX);
    const y = clamp(cy - half, 0, canvas.height - SAMPLE_BOX);
    const data = ctx.getImageData(x, y, SAMPLE_BOX, SAMPLE_BOX).data;
    let r = 0,
      g = 0,
      b = 0,
      n = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n++;
    }
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  }

  function renderReading(rgb) {
    const { match, deltaE } = findNearest(rgb[0], rgb[1], rgb[2]);
    const rawHex = rgbToHex(rgb[0], rgb[1], rgb[2]);

    swatchMain.style.background = match.hex;
    swatchRaw.style.background = rawHex;
    nameFa.textContent = match.fa;
    nameEn.textContent = match.en;
    hexVal.textContent = rawHex;
    rgbVal.textContent = rgb[0] + ", " + rgb[1] + ", " + rgb[2];
    deVal.textContent = deltaE.toFixed(1);

    let segsOn, label;
    if (deltaE <= 2) {
      segsOn = 5;
      label = "تطبیق دقیق";
    } else if (deltaE <= 5) {
      segsOn = 4;
      label = "تطبیق نزدیک";
    } else if (deltaE <= 10) {
      segsOn = 3;
      label = "تطبیق خوب";
    } else if (deltaE <= 18) {
      segsOn = 2;
      label = "تخمینی";
    } else {
      segsOn = 1;
      label = "نزدیک‌ترین مورد";
    }
    meterSegs.forEach((s, i) => s.classList.toggle("on", i < segsOn));
    matchLabel.textContent = label;

    return { rgb, rawHex, match, deltaE };
  }

  function tick() {
    const rgb = sampleOnce();
    if (rgb) lastReading = renderReading(rgb);
  }

  function startSampling() {
    stopSampling();
    sampleTimer = setInterval(tick, SAMPLE_INTERVAL_MS);
  }

  function stopSampling() {
    if (sampleTimer) {
      clearInterval(sampleTimer);
      sampleTimer = null;
    }
  }

  /* ---------------------------------------------------------
     History
  --------------------------------------------------------- */
  function renderHistory() {
    historyEl.innerHTML = "";
    if (historyItems.length === 0) {
      const hint = document.createElement("p");
      hint.className = "history-hint";
      hint.textContent =
        "نشانگر وسط را روی رنگ مدنظر بگیرید؛ با دکمهٔ شاتر، رنگ‌ها اینجا ذخیره می‌شوند.";
      historyEl.appendChild(hint);
      return;
    }
    historyItems.forEach((item) => {
      const div = document.createElement("div");
      div.className = "hist-item";
      div.style.background = item.match.hex;
      div.title = item.match.fa + " / " + item.match.en + " · " + item.rawHex;
      div.addEventListener("click", () => renderReading(item.rgb));
      historyEl.appendChild(div);
    });
  }

  function addToHistory(reading) {
    historyItems.unshift(reading);
    historyItems = historyItems.slice(0, HISTORY_LIMIT);
    renderHistory();
  }

  /* ---------------------------------------------------------
     Controls
  --------------------------------------------------------- */
  liveToggle.addEventListener("click", () => {
    isLive = !isLive;
    liveToggle.classList.toggle("off", !isLive);
    if (isLive) startSampling();
    else stopSampling();
  });

  shutterBtn.addEventListener("click", () => {
    if (!isLive) tick(); // single-shot read while frozen
    shutterBtn.classList.add("frozen");
    setTimeout(() => shutterBtn.classList.remove("frozen"), 220);
    if (lastReading) addToHistory(lastReading);
  });

  histToggle.addEventListener("click", () => {
    historyEl.classList.toggle("collapsed");
  });

  flipBtn.addEventListener("click", () => {
    facingMode = facingMode === "environment" ? "user" : "environment";
    startCamera();
  });

  retryBtn.addEventListener("click", startCamera);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopSampling();
    else if (isLive) startSampling();
  });

  /* ---------------------------------------------------------
     Color browser / search
  --------------------------------------------------------- */
  let cbBuilt = false;

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch (e) {
      /* clipboard unsupported — swatch tap still shows the hex visually */
    }
    document.body.removeChild(ta);
  }

  function buildColorGrid() {
    cbGrid.innerHTML = "";
    window.ColorEngine.COLOR_LIST.forEach((entry) => {
      const item = document.createElement("button");
      item.className = "cb-item";
      item.dataset.en = entry.en.toLowerCase();
      item.dataset.fa = entry.fa;

      const swatch = document.createElement("div");
      swatch.className = "cb-swatch";
      swatch.style.background = entry.hex;
      const check = document.createElement("span");
      check.className = "check";
      check.textContent = "کپی شد";
      swatch.appendChild(check);

      const nameFaEl = document.createElement("span");
      nameFaEl.className = "cb-name-fa";
      nameFaEl.textContent = entry.fa;

      const nameEnEl = document.createElement("span");
      nameEnEl.className = "cb-name-en";
      nameEnEl.textContent = entry.en + " · " + entry.hex;

      item.appendChild(swatch);
      item.appendChild(nameFaEl);
      item.appendChild(nameEnEl);

      item.addEventListener("click", () => {
        copyText(entry.hex);
        swatch.classList.add("copied");
        setTimeout(() => swatch.classList.remove("copied"), 700);
      });

      cbGrid.appendChild(item);
    });
    cbBuilt = true;
  }

  function filterColorGrid() {
    const q = cbSearch.value.trim().toLowerCase();
    let visible = 0;
    cbGrid.querySelectorAll(".cb-item").forEach((item) => {
      const match = !q || item.dataset.en.includes(q) || item.dataset.fa.includes(q);
      item.style.display = match ? "" : "none";
      if (match) visible++;
    });
    cbCount.textContent = visible + " / " + window.ColorEngine.COLOR_LIST.length;
  }

  searchBtn.addEventListener("click", () => {
    if (!cbBuilt) buildColorGrid();
    filterColorGrid();
    colorBrowser.hidden = false;
    setTimeout(() => cbSearch.focus(), 50);
  });

  cbClose.addEventListener("click", () => {
    colorBrowser.hidden = true;
  });

  cbSearch.addEventListener("input", filterColorGrid);

  /* ---------------------------------------------------------
     Boot
  --------------------------------------------------------- */
  renderHistory();
  startCamera();
})();
