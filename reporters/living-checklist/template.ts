import type { RunRecord } from './types.ts';

/**
 * buildTemplate — สร้าง self-contained HTML report จาก history array
 * HTML embed ข้อมูลทั้งหมดไว้ใน script tag เพื่อใช้ offline ได้
 */
export function buildTemplate(history: RunRecord[]): string {
  const dataJson = JSON.stringify(history);

  return `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Living Checklist</title>
  <style>
    :root {
      --pass: #22c55e; --fail: #ef4444; --skip: #94a3b8;
      --manual: #f59e0b; --bg: #0f172a; --card: #1e293b;
      --border: #334155; --text: #e2e8f0; --muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); padding: 24px; }
    h1 { font-size: 1.5rem; margin-bottom: 16px; }
    .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 20px; }
    select, button { background: var(--card); color: var(--text); border: 1px solid var(--border);
      padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.875rem; }
    button:hover { background: var(--border); }
    .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 20px; }
    .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
    .card .num { font-size: 2rem; font-weight: 700; }
    .card .label { font-size: 0.75rem; color: var(--muted); margin-top: 4px; }
    .progress { height: 8px; background: var(--border); border-radius: 4px; overflow: hidden; margin-bottom: 20px; }
    .progress-bar { height: 100%; background: var(--pass); transition: width .4s; }
    .chart { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 16px;
      margin-bottom: 20px; overflow-x: auto; }
    .chart h3 { font-size: 0.875rem; margin-bottom: 12px; color: var(--muted); }
    svg text { fill: var(--muted); font-size: 11px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { text-align: left; padding: 10px 12px; background: var(--card); border-bottom: 2px solid var(--border);
      font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
    tr:hover td { background: rgba(255,255,255,.03); }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge-pass { background: rgba(34,197,94,.2); color: var(--pass); }
    .badge-fail { background: rgba(239,68,68,.2); color: var(--fail); }
    .badge-skip { background: rgba(148,163,184,.15); color: var(--skip); }
    .badge-manual { background: rgba(245,158,11,.15); color: var(--manual); }
    .check-wrap { display: flex; align-items: center; gap: 6px; }
    input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--manual); }
    .compare-panel { display: none; background: var(--card); border: 1px solid var(--border);
      border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .compare-panel.open { display: block; }
    .diff-new { color: var(--pass); } .diff-removed { color: var(--fail); } .diff-changed { color: var(--manual); }
    .export-bar { display: flex; gap: 8px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <h1>📋 Living Checklist</h1>

  <div class="toolbar">
    <label for="rel-select" style="font-size:.875rem;color:var(--muted)">Release:</label>
    <select id="rel-select"></select>
    <button id="compare-btn">⚖ Compare</button>
    <select id="compare-rel" style="display:none"></select>
    <button onclick="exportMd()">⬇ Markdown</button>
    <button onclick="exportJson()">⬇ JSON</button>
  </div>

  <div class="cards" id="summary-cards"></div>
  <div class="progress"><div class="progress-bar" id="progress-bar"></div></div>

  <div class="chart">
    <h3>Trend: automated vs manual across releases</h3>
    <svg id="trend-chart" width="100%" height="120" viewBox="0 0 800 120" preserveAspectRatio="none"></svg>
  </div>

  <div class="compare-panel" id="compare-panel">
    <h3 style="margin-bottom:12px;font-size:.875rem;color:var(--muted)">Comparison</h3>
    <div id="compare-content"></div>
  </div>

  <div class="export-bar"></div>
  <div style="overflow-x:auto">
    <table>
      <thead>
        <tr>
          <th>Feature</th><th>Scenario</th><th>Type</th><th>Status / Check</th><th>Tags</th>
        </tr>
      </thead>
      <tbody id="scenario-tbody"></tbody>
    </table>
  </div>

  <script>
    const history = ${dataJson};

    const relSelect = document.getElementById('rel-select');
    const compareSelect = document.getElementById('compare-rel');
    const compareBtn = document.getElementById('compare-btn');
    const comparePanel = document.getElementById('compare-panel');
    const tbody = document.getElementById('scenario-tbody');
    const cards = document.getElementById('summary-cards');
    const bar = document.getElementById('progress-bar');
    const chart = document.getElementById('trend-chart');

    // Populate release selectors
    history.forEach((r, i) => {
      const opt1 = new Option(\`\${r.tag}  (\${r.timestamp.slice(0,10)})\`, i);
      const opt2 = new Option(\`\${r.tag}  (\${r.timestamp.slice(0,10)})\`, i);
      relSelect.appendChild(opt1);
      compareSelect.appendChild(opt2);
    });
    relSelect.value = history.length - 1;

    function getManualKey(releaseTag, scenarioName) {
      return \`checklist:\${releaseTag}:\${scenarioName}\`;
    }

    function render() {
      const run = history[+relSelect.value];
      if (!run) return;

      // Summary cards
      const { summary } = run;
      cards.innerHTML = [
        { num: summary.total, label: 'Total Scenarios' },
        { num: summary.automated, label: 'Automated' },
        { num: summary.manual, label: 'Manual' },
        { num: summary.passed, label: 'Passed', color: 'var(--pass)' },
        { num: summary.failed, label: 'Failed', color: 'var(--fail)' },
      ].map(c => \`<div class="card"><div class="num" style="color:\${c.color||'inherit'}">\${c.num}</div><div class="label">\${c.label}</div></div>\`).join('');

      // Progress bar
      const autoPassed = run.scenarios.filter(s => !s.manual && s.status === 'passed').length;
      const autoTotal = run.scenarios.filter(s => !s.manual).length;
      bar.style.width = autoTotal ? \`\${Math.round(autoPassed / autoTotal * 100)}%\` : '0%';

      // Scenarios table
      tbody.innerHTML = run.scenarios.map(s => {
        const featureCell = \`<td>\${s.feature}</td>\`;
        const nameCell = \`<td>\${s.name}</td>\`;
        const typeCell = s.manual
          ? \`<td><span class="badge badge-manual">manual</span></td>\`
          : \`<td><span class="badge" style="background:rgba(99,102,241,.2);color:#818cf8">auto</span></td>\`;

        let statusCell;
        if (s.manual) {
          const key = getManualKey(run.tag, s.name);
          const checked = localStorage.getItem(key) === 'true' ? 'checked' : '';
          statusCell = \`<td><label class="check-wrap"><input type="checkbox" \${checked} onchange="saveCheck('\${key}',this.checked)" /><span style="color:var(--manual);font-size:.8rem">manual check</span></label></td>\`;
        } else {
          const cls = s.status === 'passed' ? 'badge-pass' : s.status === 'failed' ? 'badge-fail' : 'badge-skip';
          statusCell = \`<td><span class="badge \${cls}">\${s.status}</span>\${s.errorMessage ? \`<div style="color:var(--fail);font-size:.75rem;margin-top:4px">\${s.errorMessage.slice(0,120)}</div>\` : ''}</td>\`;
        }

        const tagsCell = \`<td style="color:var(--muted);font-size:.75rem">\${s.tags.join(' ')}</td>\`;
        return \`<tr>\${featureCell}\${nameCell}\${typeCell}\${statusCell}\${tagsCell}</tr>\`;
      }).join('');

      renderTrend();
    }

    function saveCheck(key, value) {
      localStorage.setItem(key, value);
    }

    function renderTrend() {
      if (history.length < 2) { chart.innerHTML = '<text x="10" y="60">Need 2+ releases for trend</text>'; return; }
      const W = 800, H = 120, PAD = 40;
      const maxAuto = Math.max(...history.map(r => r.summary.automated), 1);
      const maxManual = Math.max(...history.map(r => r.summary.manual), 1);
      const xStep = (W - PAD * 2) / (history.length - 1);

      const autoPoints = history.map((r, i) => [PAD + i * xStep, H - PAD - (r.summary.automated / maxAuto) * (H - PAD * 2)]);
      const manualPoints = history.map((r, i) => [PAD + i * xStep, H - PAD - (r.summary.manual / maxManual) * (H - PAD * 2)]);

      const polyline = pts => pts.map(p => p.join(',')).join(' ');
      const labels = history.map((r, i) => \`<text x="\${PAD + i * xStep}" y="\${H - 5}" text-anchor="middle">\${r.tag.slice(0,8)}</text>\`).join('');

      chart.innerHTML = \`
        <polyline points="\${polyline(autoPoints)}" fill="none" stroke="var(--pass)" stroke-width="2"/>
        <polyline points="\${polyline(manualPoints)}" fill="none" stroke="var(--manual)" stroke-width="2"/>
        \${autoPoints.map(p => \`<circle cx="\${p[0]}" cy="\${p[1]}" r="3" fill="var(--pass)"/>\`).join('')}
        \${manualPoints.map(p => \`<circle cx="\${p[0]}" cy="\${p[1]}" r="3" fill="var(--manual)"/>\`).join('')}
        \${labels}
        <text x="5" y="15" fill="var(--pass)">● auto</text>
        <text x="60" y="15" fill="var(--manual)">● manual</text>
      \`;
    }

    compareBtn.addEventListener('click', () => {
      const open = comparePanel.classList.toggle('open');
      compareSelect.style.display = open ? '' : 'none';
      if (open) renderCompare();
    });

    compareSelect.addEventListener('change', renderCompare);

    function renderCompare() {
      const a = history[+relSelect.value];
      const b = history[+compareSelect.value];
      if (!a || !b || a === b) { document.getElementById('compare-content').innerHTML = '<p style="color:var(--muted)">Select two different releases</p>'; return; }

      const aNames = new Set(a.scenarios.map(s => s.name));
      const bNames = new Set(b.scenarios.map(s => s.name));
      const added = [...bNames].filter(n => !aNames.has(n));
      const removed = [...aNames].filter(n => !bNames.has(n));
      const changed = a.scenarios
        .filter(s => bNames.has(s.name))
        .filter(s => {
          const bs = b.scenarios.find(x => x.name === s.name);
          return bs && bs.status !== s.status;
        });

      document.getElementById('compare-content').innerHTML = \`
        <p style="font-size:.875rem;color:var(--muted);margin-bottom:8px">
          <b>\${a.tag}</b> → <b>\${b.tag}</b>
        </p>
        <p class="diff-new">+ \${added.length} new: \${added.slice(0,3).join(', ')}\${added.length > 3 ? ' ...' : ''}</p>
        <p class="diff-removed">- \${removed.length} removed: \${removed.slice(0,3).join(', ')}\${removed.length > 3 ? ' ...' : ''}</p>
        <p class="diff-changed">~ \${changed.length} status changed: \${changed.slice(0,3).map(s => s.name).join(', ')}\${changed.length > 3 ? ' ...' : ''}</p>
      \`;
    }

    function exportMd() {
      const run = history[+relSelect.value];
      if (!run) return;
      const lines = [\`# Living Checklist — \${run.tag}\`, \`> \${run.timestamp}\`, '',
        \`| Feature | Scenario | Status |\`,
        \`|---------|----------|--------|\`,
        ...run.scenarios.map(s => \`| \${s.feature} | \${s.name} | \${s.status} |\`),
      ];
      download('checklist.md', lines.join('\\n'));
    }

    function exportJson() {
      const run = history[+relSelect.value];
      if (run) download('checklist.json', JSON.stringify(run, null, 2));
    }

    function download(name, content) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content]));
      a.download = name;
      a.click();
    }

    relSelect.addEventListener('change', render);
    render();
  </script>
</body>
</html>`;
}
