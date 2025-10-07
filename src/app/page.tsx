"use client";

import React, { useEffect, useState } from "react";

type Scenario = {
  _id?: string;
  scenario_name?: string;
  [key: string]: any;
};

// Use relative /api by default so the frontend can call the backend via Next.js proxy or same-origin in production.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";

function defaultInputs() {
  return {
    scenario_name: "",
    monthly_invoice_volume: 2000,
    num_ap_staff: 3,
    avg_hours_per_invoice: 0.1667, // 10 mins
    hourly_wage: 30,
    error_rate_manual: 0.5,
    error_cost: 100,
    time_horizon_months: 36,
    one_time_implementation_cost: 50000,
  };
}

export default function Home() {
  const [inputs, setInputs] = useState(defaultInputs());
  const [result, setResult] = useState<any>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const LS_KEY = 'roi_scenarios_v1';
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  function validateInputs() {
    const errors: string[] = [];
    if (!inputs.monthly_invoice_volume || inputs.monthly_invoice_volume < 1) errors.push('monthly_invoice_volume');
    if (!inputs.hourly_wage || inputs.hourly_wage <= 0) errors.push('hourly_wage');
    if (!inputs.time_horizon_months || inputs.time_horizon_months < 1) errors.push('time_horizon_months');
    return errors;
  }

  useEffect(() => {
    runSim();
    fetchScenarios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runSim(localInputs = inputs) {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localInputs),
      });
      const j = await res.json();
      if (j.ok) setResult(j.result);
      else setResult(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchScenarios() {
    try {
      const res = await fetch(`${API_BASE}/scenarios`);
      const j = await res.json();
      if (j.ok) {
        // merge server scenarios with local (local wins on id collision)
        const local = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
        const merged = [...(j.scenarios || []), ...local.filter((l:any)=>!(j.scenarios||[]).find((s:any)=>String(s._id)===String(l._id)))];
        setScenarios(merged);
        return;
      }
      // if not ok, fallthrough to local
    } catch (err) {
      // console.error(err);
    }
    // fallback to localStorage
    try {
      const local = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      setScenarios(local);
    } catch (e) {
      setScenarios([]);
    }
  }

  async function saveScenario() {
    setStatusMessage(null);
    const payload = { ...inputs };
    const errs = validateInputs();
    if (errs.length) {
      setStatusMessage('Please correct inputs highlighted in red');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/scenarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await res.json();
      if (j.ok) {
        await fetchScenarios();
        setStatusMessage('Saved to server');
        return;
      }
      // if server returns not ok, fallback
      console.warn('Server rejected save, falling back to local');
    } catch (err) {
      console.warn('Server save failed, falling back to local', err);
    }

    // Fallback: save to localStorage
    try {
      const raw = localStorage.getItem(LS_KEY) || '[]';
      const local = JSON.parse(raw);
      const id = 'ls_' + Date.now();
      const doc = { ...payload, _id: id, createdAt: new Date().toISOString() };
      local.unshift(doc);
      localStorage.setItem(LS_KEY, JSON.stringify(local));
      setStatusMessage('Saved locally (no DB)');
      setScenarios(s => [doc, ...s]);
    } catch (e) {
      console.error('Local save failed', e);
      setStatusMessage('Save failed');
    }
  }

  async function loadScenario(id: string) {
    try {
      // try server first
      const res = await fetch(`${API_BASE}/scenarios/${id}`);
      const j = await res.json();
      if (j.ok && j.scenario) {
        setInputs(j.scenario);
        runSim(j.scenario);
        return;
      }
    } catch (err) {
      // ignore and try local
    }
    // try local
    try {
      const local = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
      const found = local.find((x:any) => String(x._id) === String(id));
      if (found) {
        setInputs(found);
        runSim(found);
      }
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteScenario(id: string) {
    if (!confirm('Delete scenario?')) return;
    setStatusMessage(null);
    try {
      const res = await fetch(`${API_BASE}/scenarios/${id}`, { method: 'DELETE' });
      const j = await res.json();
      if (j.ok) {
        await fetchScenarios();
        setStatusMessage('Deleted from server');
        return;
      }
    } catch (err) {
      // ignore
    }
    // fallback: remove from local
    try {
      const raw = localStorage.getItem(LS_KEY) || '[]';
      const local = JSON.parse(raw).filter((x:any) => String(x._id) !== String(id));
      localStorage.setItem(LS_KEY, JSON.stringify(local));
      setScenarios(local);
      setStatusMessage('Deleted locally');
    } catch (e) {
      console.error(e);
      setStatusMessage('Delete failed');
    }
  }

  // Analytics helpers
  function aggregateMetrics(items: Scenario[]) {
    if (!items || items.length===0) return { total:0, avgMonthlySavings:0, top:null };
    const total = items.length;
    const withSavings = items.map(i => i.monthly_savings || 0);
    const avgMonthlySavings = withSavings.reduce((a,b)=>a+b,0)/total;
    const topIdx = withSavings.indexOf(Math.max(...withSavings));
    return { total, avgMonthlySavings, top: items[topIdx] };
  }

  function exportCsv() {
    const rows = scenarios.map(s => ({
      scenario_name: s.scenario_name,
      monthly_invoice_volume: s.monthly_invoice_volume,
      monthly_savings: s.monthly_savings,
      createdAt: s.createdAt
    }));
    const header = Object.keys(rows[0] || {}).join(',') + '\n';
    const csv = header + rows.map(r => Object.values(r).map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'scenarios.csv'; a.click(); URL.revokeObjectURL(url);
  }

  function duplicateScenario(id:string) {
    const s = scenarios.find(x => String(x._id)===String(id));
    if (!s) return;
    const copy = { ...s, scenario_name: (s.scenario_name || 'Copy') + ' (copy)', _id: 'ls_' + Date.now(), createdAt: new Date().toISOString() };
    localStorage.setItem(LS_KEY, JSON.stringify([copy, ...(JSON.parse(localStorage.getItem(LS_KEY)||'[]'))]));
    setScenarios(prev => [copy, ...prev]);
  }

  const [compareLeft, setCompareLeft] = useState<string | null>(null);
  const [compareRight, setCompareRight] = useState<string | null>(null);
  const compareLeftObj = scenarios.find(s=>String(s._id)===String(compareLeft)) || null;
  const compareRightObj = scenarios.find(s=>String(s._id)===String(compareRight)) || null;
  

  async function generateReport() {
    if (!email) return alert('Please enter email to generate report');
    try {
      setGeneratingPdf(true);
      // request PDF download
      const res = await fetch(`${API_BASE}/report/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, input: inputs, format: 'pdf' }),
      });

      if (!res.ok) {
        const j = await res.json().catch(()=>null);
        return alert('Report generation failed: ' + (j?.error || res.statusText));
      }

  const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'roi-report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setGeneratingPdf(false);
    } catch (err) {
      setGeneratingPdf(false);
      console.error(err);
    }
  }

  function updateField<K extends keyof ReturnType<typeof defaultInputs>>(key: K, value: any) {
    const next = { ...inputs, [key]: value };
    setInputs(next);
    runSim(next);
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 text-gray-900">
      <div className="container">
        <header className="mb-4 header">
          <div>
            <div className="brand">ROI Simulator</div>
            <div className="subtle">Invoicing automation savings & payback</div>
          </div>
          <div className="stepper">
            <div className="step">1 Inputs</div>
            <div className="step">2 Results</div>
            <div className="step">3 Save / Report</div>
          </div>
        </header>

        {showBanner && <div className="status-banner"><div className="msg">This is a demo. Results are biased in favor of automation (server-side).</div><div className="close" onClick={()=>setShowBanner(false)}>Dismiss</div></div>}

        <div className="grid-2">
          <div className="card">
            <h2 className="text-lg font-semibold">Inputs</h2>
            <div className="mt-4 space-y-3">
              <div className="help-box">Tip: Start with monthly invoice volume and hourly wage — other fields can be adjusted later.</div>
              
              <div>
                <label className="block text-sm">Scenario name</label>
                <input value={inputs.scenario_name || ''} onChange={e=>updateField('scenario_name', e.target.value)} className={`w-full border p-2 rounded mt-1 ${(!inputs.scenario_name) ? '' : ''}`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Monthly invoice volume
                  <input type="number" value={inputs.monthly_invoice_volume} onChange={e=>updateField('monthly_invoice_volume', Number(e.target.value))} className={`w-full border p-2 rounded mt-1 ${(!inputs.monthly_invoice_volume || inputs.monthly_invoice_volume<1) ? 'input-error' : ''}`} />
                  {(!inputs.monthly_invoice_volume || inputs.monthly_invoice_volume<1) && <div className="error-text">Enter a value &gt; 0</div>}
                </label>
                <label className="block text-sm">Number of AP staff
                  <input type="number" value={inputs.num_ap_staff} onChange={e=>updateField('num_ap_staff', Number(e.target.value))} className="w-full border p-2 rounded mt-1" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Avg hours per invoice
                  <input type="number" step="0.0001" value={inputs.avg_hours_per_invoice} onChange={e=>updateField('avg_hours_per_invoice', Number(e.target.value))} className="w-full border p-2 rounded mt-1" />
                </label>
                <label className="block text-sm">Hourly wage
                  <input type="number" value={inputs.hourly_wage} onChange={e=>updateField('hourly_wage', Number(e.target.value))} className={`w-full border p-2 rounded mt-1 ${( !inputs.hourly_wage || inputs.hourly_wage<=0) ? 'input-error' : ''}`} />
                  {( !inputs.hourly_wage || inputs.hourly_wage<=0) && <div className="error-text">Enter hourly wage &gt; 0</div>}
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Manual error rate (%)
                  <input type="number" step="0.01" value={inputs.error_rate_manual} onChange={e=>updateField('error_rate_manual', Number(e.target.value))} className="w-full border p-2 rounded mt-1" />
                </label>
                <label className="block text-sm">Error cost
                  <input type="number" value={inputs.error_cost} onChange={e=>updateField('error_cost', Number(e.target.value))} className="w-full border p-2 rounded mt-1" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm">Time horizon (months)
                  <input type="number" value={inputs.time_horizon_months} onChange={e=>updateField('time_horizon_months', Number(e.target.value))} className={`w-full border p-2 rounded mt-1 ${( !inputs.time_horizon_months || inputs.time_horizon_months<1) ? 'input-error' : ''}`} />
                  {( !inputs.time_horizon_months || inputs.time_horizon_months<1) && <div className="error-text">Enter a horizon &gt; 0</div>}
                </label>
                <label className="block text-sm">One-time implementation cost
                  <input type="number" value={inputs.one_time_implementation_cost} onChange={e=>updateField('one_time_implementation_cost', Number(e.target.value))} className="w-full border p-2 rounded mt-1" />
                </label>
              </div>

              <div className="flex gap-3 mt-3">
                <button onClick={saveScenario} className="btn btn-primary">Save scenario</button>
                <button onClick={()=>{ setInputs(defaultInputs()); runSim(defaultInputs()); }} className="btn btn-ghost">Reset</button>
              </div>
            </div>
          </div>

          <aside>
            <div className="card">
              <h2 className="text-lg font-semibold">Results</h2>
              <div className="mt-3 space-y-3">
                {loading && <div>Calculating...</div>}
                {!result && !loading && <div className="muted">No results yet</div>}
                {result && (
                  <div className="space-y-2">
                    <div className="stat"><div className="label">Labor cost (monthly)</div><div className="value">${result.labor_cost_manual?.toFixed?.(2) ?? '0.00'}</div></div>
                    <div className="stat"><div className="label">Automation cost (monthly)</div><div className="value">${result.auto_cost?.toFixed?.(2) ?? '0.00'}</div></div>
                    <div className="stat"><div className="label">Error savings (monthly)</div><div className="value">${result.error_savings?.toFixed?.(2) ?? '0.00'}</div></div>
                    <div className="stat" style={{background:'#eef6ff'}}><div className="label">Monthly savings (biased)</div><div className="value accent">${result.monthly_savings?.toFixed?.(2)}</div></div>
                    <div className="stat"><div className="label">Cumulative ({result.time_horizon_months} mo)</div><div className="value">${result.cumulative_savings?.toFixed?.(2)}</div></div>
                    <div className="stat"><div className="label">Net savings</div><div className="value">${result.net_savings?.toFixed?.(2)}</div></div>
                    <div className="stat"><div className="label">Payback (months)</div><div className="value">{result.payback_months ? result.payback_months.toFixed(1) : '—'}</div></div>
                    <div className="stat"><div className="label">ROI (%)</div><div className="value">{result.roi_percentage ? result.roi_percentage.toFixed(1) : '—'}</div></div>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <h3 className="font-medium">Report</h3>
                <div className="flex gap-2 mt-2">
                  <input placeholder="you@company.com" value={email} onChange={e=>setEmail(e.target.value)} className="flex-1 border p-2 rounded" />
                  <button onClick={generateReport} className="btn btn-primary">Generate</button>
                </div>
              </div>
            </div>

            <div className="card mt-4">
              <h3 className="text-lg font-semibold">Saved scenarios</h3>
              <div className="mt-3 space-y-2">
                {scenarios.length===0 && <div className="muted">No saved scenarios</div>}
                {scenarios.map(s => (
                  <div key={s._id} className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.scenario_name || '(no name)'}</div>
                      <div className="text-xs muted">{s.createdAt ? new Date(s.createdAt).toLocaleString?.() : ''}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={()=>s._id && loadScenario(s._id)} className="btn btn-ghost">Load</button>
                      <button onClick={()=>s._id && deleteScenario(s._id)} className="btn" style={{border:'1px solid #fee2e2', color:'#b91c1c'}}>Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card mt-4 analytics">
              <h3 className="text-lg font-semibold">Analytics</h3>
              <div className="cards mt-2">
                <div className="card-small">Total scenarios<br/><strong>{scenarios.length}</strong></div>
                <div className="card-small">Avg monthly savings<br/><strong>${aggregateMetrics(scenarios).avgMonthlySavings?.toFixed?.(2) || '0.00'}</strong></div>
                <div className="card-small">Top scenario<br/><strong>{aggregateMetrics(scenarios).top?.scenario_name || '—'}</strong></div>
              </div>
              <div className="mt-3">
                <h4 className="font-medium">Scenarios summary</h4>
                <div className="muted">Charts removed — summary metrics are shown above. Use Export CSV for data export.</div>
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={exportCsv} className="btn btn-ghost">Export CSV</button>
                <button onClick={()=>fetchScenarios()} className="btn btn-ghost">Refresh</button>
              </div>

              <div className="mt-3">
                <h4 className="font-medium">Compare scenarios</h4>
                <div className="flex gap-2 mt-2">
                  <select value={compareLeft||''} onChange={e=>setCompareLeft(e.target.value||null)} className="flex-1 border p-2 rounded">
                    <option value="">Select left</option>
                    {scenarios.map(s=>(<option key={'L'+s._id} value={s._id}>{s.scenario_name || s._id}</option>))}
                  </select>
                  <select value={compareRight||''} onChange={e=>setCompareRight(e.target.value||null)} className="flex-1 border p-2 rounded">
                    <option value="">Select right</option>
                    {scenarios.map(s=>(<option key={'R'+s._id} value={s._id}>{s.scenario_name || s._id}</option>))}
                  </select>
                </div>

                {compareLeftObj && compareRightObj && (
                  <table className="compare-table mt-3">
                    <thead><tr><th>Metric</th><th>{compareLeftObj.scenario_name}</th><th>{compareRightObj.scenario_name}</th></tr></thead>
                    <tbody>
                      <tr><td>Monthly savings</td><td>${compareLeftObj.monthly_savings?.toFixed?.(2)||'0.00'}</td><td>${compareRightObj.monthly_savings?.toFixed?.(2)||'0.00'}</td></tr>
                      <tr><td>Labor cost (monthly)</td><td>${compareLeftObj.labor_cost_manual?.toFixed?.(2)||'0.00'}</td><td>${compareRightObj.labor_cost_manual?.toFixed?.(2)||'0.00'}</td></tr>
                      <tr><td>Automation cost (monthly)</td><td>${compareLeftObj.auto_cost?.toFixed?.(2)||'0.00'}</td><td>${compareRightObj.auto_cost?.toFixed?.(2)||'0.00'}</td></tr>
                      <tr><td>ROI (%)</td><td>{compareLeftObj.roi_percentage?.toFixed?.(1)||'—'}</td><td>{compareRightObj.roi_percentage?.toFixed?.(1)||'—'}</td></tr>
                    </tbody>
                  </table>
                )}
                <div className="mt-4">
                  <h4 className="font-medium">Cumulative savings preview</h4>
                  <div style={{height:180}}>
                    <div className="muted">Cumulative preview removed (charts disabled).</div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
