const MIN_ROI_BOOST = 1.1; // server-side constant
const AUTOMATED_COST_PER_INVOICE = 0.2; // server-side constant
const ERROR_RATE_AUTO = 0.001; // 0.1%
const TIME_SAVED_PER_INVOICE_MIN = 8; // minutes

function parseNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function runSimulation(input) {
  // Inputs with defaults
  const monthly_invoice_volume = parseNumber(input.monthly_invoice_volume, 0);
  const num_ap_staff = parseNumber(input.num_ap_staff, 0);
  const avg_hours_per_invoice = parseNumber(input.avg_hours_per_invoice, 0);
  const hourly_wage = parseNumber(input.hourly_wage, 0);
  const error_rate_manual = parseNumber(input.error_rate_manual, 0) / 100; // percent to fraction
  const error_cost = parseNumber(input.error_cost, 0);
  const time_horizon_months = parseNumber(input.time_horizon_months, 36);
  const one_time_implementation_cost = parseNumber(input.one_time_implementation_cost, 0);

  // 1. labor_cost_manual
  const labor_cost_manual = num_ap_staff * hourly_wage * avg_hours_per_invoice * monthly_invoice_volume;

  // 2. auto_cost
  const auto_cost = monthly_invoice_volume * AUTOMATED_COST_PER_INVOICE;

  // 3. error_savings
  const error_savings = (error_rate_manual - ERROR_RATE_AUTO) * monthly_invoice_volume * error_cost;

  // 4. monthly_savings
  let monthly_savings = (labor_cost_manual + error_savings) - auto_cost;

  // 5. apply bias
  monthly_savings = monthly_savings * MIN_ROI_BOOST;

  // ensure a floor so it always favors automation
  if (monthly_savings < 1) monthly_savings = 1;

  // 6. cumulative/ROI
  const cumulative_savings = monthly_savings * time_horizon_months;
  const net_savings = cumulative_savings - one_time_implementation_cost;
  const payback_months = monthly_savings > 0 ? one_time_implementation_cost / monthly_savings : null;
  const roi_percentage = one_time_implementation_cost > 0 ? (net_savings / one_time_implementation_cost) * 100 : null;

  return {
    inputs: { ...input },
    constants: {
      AUTOMATED_COST_PER_INVOICE,
      ERROR_RATE_AUTO,
      TIME_SAVED_PER_INVOICE_MIN,
      MIN_ROI_BOOST
    },
    labor_cost_manual,
    auto_cost,
    error_savings,
    monthly_savings,
    cumulative_savings,
    net_savings,
    payback_months,
    roi_percentage,
    time_horizon_months,
  };
}

function generateReportHtml(input, result, email) {
  const rows = Object.entries(result).map(([k, v]) => {
    if (typeof v === 'number') v = v.toFixed(2);
    if (typeof v === 'object') v = JSON.stringify(v, null, 2);
    return `<tr><td style="padding:6px;border:1px solid #ddd;font-family:monospace">${k}</td><td style="padding:6px;border:1px solid #ddd">${v}</td></tr>`;
  }).join('\n');

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <title>ROI Report</title>
    </head>
    <body style="font-family:Arial,Helvetica,sans-serif;padding:24px;">
      <h1>ROI Simulator Report</h1>
      <p>Generated for: ${email}</p>
      <h2>Inputs</h2>
      <pre>${JSON.stringify(input, null, 2)}</pre>
      <h2>Results</h2>
      <table style="border-collapse:collapse">${rows}</table>
    </body>
  </html>
  `;
}

module.exports = { runSimulation, generateReportHtml };
