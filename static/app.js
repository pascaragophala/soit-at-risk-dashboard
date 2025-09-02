(function () {
  // Theme toggle
  const body = document.documentElement;
  const key = "soit_theme";
  const btn = document.getElementById("themeToggle");

  function apply(theme) {
    if (theme === "light") {
      body.setAttribute("data-theme", "light");
      if (btn) btn.textContent = "Dark mode";
    } else {
      body.removeAttribute("data-theme");
      if (btn) btn.textContent = "Light mode";
    }
  }

  const saved = localStorage.getItem(key) || "dark";
  apply(saved);
  if (btn) btn.addEventListener("click", () => {
    const next = (body.getAttribute("data-theme") === "light") ? "dark" : "light";
    localStorage.setItem(key, next);
    apply(next);
  });

  if (!window.__REPORT__) return;
  const report = window.__REPORT__;

  // Chart defaults
  Chart.defaults.font.family = '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;

  // Refs
  const weekSel = document.getElementById("weekFilter");
  const scopeSel = document.getElementById("moduleScope");
  const basisSel = document.getElementById("moduleBasis");
  const applyBtn = document.getElementById("applyFilters");
  const resetBtn = document.getElementById("resetFilters");

  // Charts instances
  let moduleChart, riskChart, reasonChart, resolvedChart, weekRiskChart, nonAttendanceChart, resolvedRateChart;

  // Helpers
  function makeBar(ctx, labels, data, horizontal = false) {
    const cfg = {
      type: "bar",
      data: { labels, datasets: [{ label: "Count", data }] },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: horizontal ? "y" : "x",
        plugins: { legend: { display: false }, tooltip: { intersect: false } },
        scales: {
          x: { ticks: { autoSkip: !horizontal, maxRotation: 0 }, grid: { display: !horizontal } },
          y: {
            beginAtZero: true, ticks: { precision: 0, autoSkip: horizontal ? false : true },
            grid: { display: horizontal }
          }
        }
      }
    };
    return new Chart(ctx, cfg);
  }

  function makeDoughnut(ctx, labels, data) {
    return new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ data, borderWidth: 0 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom" } } }
    });
  }

  function makeLine(ctx, labels, seriesArr) {
    return new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: seriesArr.map((s) => ({
          label: s.name, data: s.data, tension: 0.35, pointRadius: 2, pointHoverRadius: 4, fill: false
        }))
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom" } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }

  // ---------- Static charts ----------
  if (report.risk_counts && document.getElementById("riskChart")) {
    riskChart = makeBar(document.getElementById("riskChart"), Object.keys(report.risk_counts), Object.values(report.risk_counts));
  }
  if (report.by_reason && document.getElementById("reasonChart")) {
    reasonChart = makeBar(document.getElementById("reasonChart"), Object.keys(report.by_reason), Object.values(report.by_reason));
  }
  if (report.resolved_counts && document.getElementById("resolvedChart")) {
    resolvedChart = makeDoughnut(document.getElementById("resolvedChart"), Object.keys(report.resolved_counts), Object.values(report.resolved_counts));
  }
  if (report.week_risk && document.getElementById("weekRiskChart")) {
    weekRiskChart = makeLine(document.getElementById("weekRiskChart"), report.week_risk.weeks, report.week_risk.series);
  }
  if (report.by_week_attendance && Object.keys(report.by_week_attendance).length && document.getElementById("nonAttendanceChart")) {
    const weeks = Object.keys(report.by_week_attendance);
    const vals = weeks.map(w => report.by_week_attendance[w] || 0);
    nonAttendanceChart = new Chart(document.getElementById("nonAttendanceChart"), {
      type: "line",
      data: { labels: weeks, datasets: [{ label: "Non-attendance", data: vals, tension: 0.35, pointRadius: 2, pointHoverRadius: 4, fill: false }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
  }
  if (report.resolved_rate && Object.keys(report.resolved_rate).length && document.getElementById("resolvedRateChart")) {
    const weeks = Object.keys(report.resolved_rate);
    const vals = weeks.map(w => report.resolved_rate[w]);
    resolvedRateChart = new Chart(document.getElementById("resolvedRateChart"), {
      type: "line",
      data: { labels: weeks, datasets: [{ label: "Resolved %", data: vals, tension: 0.35, pointRadius: 2, pointHoverRadius: 4, fill: false }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: "bottom" } },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: v => v + "%" } } }
      }
    });
  }

  // ---------- Module chart with filters ----------
  function getModuleCounts({ week = "", basis = "all", scope = "all" }) {
    // basis: "all" or "attendance"
    // scope: "all", "top3_att", "top5_att", "top10_att"
    let dataMap = {};
    const isTop = scope.startsWith("top");
    const topN = scope === "top3_att" ? 3 : scope === "top5_att" ? 5 : scope === "top10_att" ? 10 : null;

    if (basis === "attendance") {
      if (week && report.by_week_module_attendance && report.by_week_module_attendance[week]) {
        dataMap = report.by_week_module_attendance[week];
      } else if (report.by_module_attendance) {
        dataMap = report.by_module_attendance;
      }
    } else {
      if (week && report.by_week_module_all && report.by_week_module_all[week]) {
        dataMap = report.by_week_module_all[week];
      } else if (report.by_module) {
        dataMap = report.by_module;
      }
    }

    // Convert to array and optionally take top N by value
    let pairs = Object.entries(dataMap).map(([k, v]) => [String(k), Number(v)]);
    pairs.sort((a, b) => b[1] - a[1]);
    if (isTop && topN) pairs = pairs.slice(0, topN);

    return { labels: pairs.map(p => p[0]), values: pairs.map(p => p[1]) };
  }

  function setDynamicHeight(canvas, count) {
    const perBar = 28; // px per bar
    const minH = 240;
    const maxH = Math.max(minH, count * perBar + 60);
    const wrap = canvas.parentElement; // .chart-wrap
    wrap.style.height = maxH + "px";
  }

  function renderModuleChart() {
    const week  = weekSel ? weekSel.value : "";
    const scope = scopeSel ? scopeSel.value : "all";
    const basis = basisSel ? basisSel.value : "all";

    const { labels, values } = getModuleCounts({ week, basis, scope });
    const ctx = document.getElementById("moduleChart");

    // Ensure all modules show and align: horizontal bars, no autoSkip on y-axis, dynamic height
    setDynamicHeight(ctx, labels.length);

    if (moduleChart) {
      moduleChart.destroy();
    }
    moduleChart = makeBar(ctx, labels, values, true);
  }

  // Initial render
  if (document.getElementById("moduleChart")) renderModuleChart();

  // Filter actions
  if (applyBtn) applyBtn.addEventListener("click", (e) => { e.preventDefault(); renderModuleChart(); });
  if (resetBtn)  resetBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (weekSel) weekSel.value = "";
    if (scopeSel) scopeSel.value = "all";
    if (basisSel) basisSel.value = "all";
    renderModuleChart();
  });
})();
