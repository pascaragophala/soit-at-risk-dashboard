(function() {
  if (!window.__REPORT__) return;

  const report = window.__REPORT__;

  function barChart(ctx, labels, data, title) {
    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: title,
          data: data
        }]
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { autoSkip: true, maxRotation: 45, minRotation: 0 } },
          y: { beginAtZero: true, precision: 0 }
        }
      }
    });
  }

  function pieChart(ctx, labels, data, title) {
    new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          label: title,
          data: data
        }]
      },
      options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });
  }

  if (report.risk_counts) {
    const labels = Object.keys(report.risk_counts);
    const data = Object.values(report.risk_counts);
    barChart(document.getElementById('riskChart'), labels, data, 'Count');
  }

  if (report.by_reason) {
    const labels = Object.keys(report.by_reason);
    const data = Object.values(report.by_reason);
    barChart(document.getElementById('reasonChart'), labels, data, 'Top reasons');
  }

  if (report.by_module) {
    const labels = Object.keys(report.by_module);
    const data = Object.values(report.by_module);
    barChart(document.getElementById('moduleChart'), labels, data, 'Unique students flagged');
  }

  if (report.resolved_counts) {
    const labels = Object.keys(report.resolved_counts).map(k => k === "null" ? "Unknown" : k);
    const data = Object.values(report.resolved_counts);
    pieChart(document.getElementById('resolvedChart'), labels, data, 'Resolved?');
  }

  if (report.week_risk && report.week_risk.weeks && report.week_risk.series) {
    const ctx = document.getElementById('weekRiskChart');
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: report.week_risk.weeks,
        datasets: report.week_risk.series.map(s => ({
          label: s.name,
          data: s.data,
          fill: false
        }))
      },
      options: {
        responsive: true,
        interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' } },
        scales: { y: { beginAtZero: true, precision: 0 } }
      }
    });
  }
})();
