(function () {
  // Theme toggle
  const body = document.documentElement; // use :root for variables
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

  if (btn) {
    btn.addEventListener("click", () => {
      const next = (body.getAttribute("data-theme") === "light") ? "dark" : "light";
      localStorage.setItem(key, next);
      apply(next);
    });
  }

  // Charts
  if (!window.__REPORT__) return;
  const report = window.__REPORT__;

  // Match font with the UI
  Chart.defaults.font.family = '"Inter", system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
  Chart.defaults.plugins.legend.labels.usePointStyle = true;

  function barChart(ctx, labels, data, title) {
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [{ label: title, data }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false }, tooltip: { intersect: false } },
        scales: {
          x: { ticks: { autoSkip: true, maxRotation: 0 }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }

  function pieChart(ctx, labels, data, title) {
    new Chart(ctx, {
      type: "doughnut",
      data: { labels, datasets: [{ label: title, data, borderWidth: 0 }] },
      options: { responsive: true, cutout: "62%", plugins: { legend: { position: "bottom" } } }
    });
  }

  if (report.risk_counts && document.getElementById("riskChart")) {
    barChart(
      document.getElementById("riskChart"),
      Object.keys(report.risk_counts),
      Object.values(report.risk_counts),
      "Count"
    );
  }

  if (report.by_reason && document.getElementById("reasonChart")) {
    barChart(
      document.getElementById("reasonChart"),
      Object.keys(report.by_reason),
      Object.values(report.by_reason),
      "Top reasons"
    );
  }

  if (report.by_module && document.getElementById("moduleChart")) {
    barChart(
      document.getElementById("moduleChart"),
      Object.keys(report.by_module),
      Object.values(report.by_module),
      "Unique students flagged"
    );
  }

  if (report.resolved_counts && document.getElementById("resolvedChart")) {
    const labels = Object.keys(report.resolved_counts);
    const data = Object.values(report.resolved_counts);
    pieChart(document.getElementById("resolvedChart"), labels, data, "Resolved?");
  }

  if (report.week_risk && report.week_risk.weeks && report.week_risk.series && document.getElementById("weekRiskChart")) {
    new Chart(document.getElementById("weekRiskChart"), {
      type: "line",
      data: {
        labels: report.week_risk.weeks,
        datasets: report.week_risk.series.map((s) => ({
          label: s.name,
          data: s.data,
          tension: 0.35,
          pointRadius: 2,
          pointHoverRadius: 4,
          fill: false
        }))
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom" } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
  }
})();
