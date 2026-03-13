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
    .toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
    select, button, input[type=text] {
      background: var(--card); color: var(--text); border: 1px solid var(--border);
      padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.875rem;
    }
    input[type=text] { cursor: text; }
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
    .filter-bar { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px;
      background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; }
    .filter-bar label { font-size: 0.75rem; color: var(--muted); }
    .filter-bar input[type=text] { flex: 1; min-width: 180px; }
    table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
    th { text-align: left; padding: 10px 12px; background: var(--card); border-bottom: 2px solid var(--border);
      font-size: 0.75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 10px 12px; border-bottom: 1px solid var(--border); }
    tr:hover td { background: rgba(255,255,255,.03); }
    tr.hidden { display: none; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 0.75rem; font-weight: 600; }
    .badge-pass { background: rgba(34,197,94,.2); color: var(--pass); }
    .badge-fail { background: rgba(239,68,68,.2); color: var(--fail); }
    .badge-skip { background: rgba(148,163,184,.15); color: var(--skip); }
    .badge-manual { background: rgba(245,158,11,.15); color: var(--manual); }
    .check-wrap { display: flex; align-items: center; gap: 6px; }
    input[type=checkbox] { width: 16px; height: 16px; cursor: pointer; accent-color: var(--manual); }
    .tester-hint { font-size: 0.72rem; color: var(--muted); margin-top: 2px; }
    .compare-panel { display: none; background: var(--card); border: 1px solid var(--border);
      border-radius: 8px; padding: 16px; margin-bottom: 20px; }
    .compare-panel.open { display: block; }
    .diff-new { color: var(--pass); } .diff-removed { color: var(--fail); } .diff-changed { color: var(--manual); }
    .export-bar { display: flex; gap: 8px; margin-bottom: 16px; }
    /* Sign-off banner */
    .sign-off-banner {
      display: none; background: rgba(34,197,94,.1); border: 1px solid var(--pass);
      border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; color: var(--pass);
    }
    .sign-off-banner.visible { display: block; }
    /* Sign-off form */
    .sign-off-form {
      display: none; background: var(--card); border: 1px solid var(--border);
      border-radius: 8px; padding: 16px; margin-bottom: 20px; gap: 10px; flex-wrap: wrap;
      align-items: flex-end;
    }
    .sign-off-form.open { display: flex; }
    .sign-off-form label { font-size: 0.75rem; color: var(--muted); display: block; margin-bottom: 4px; }
    .sign-off-form input[type=text], .sign-off-form textarea {
      background: var(--bg); color: var(--text); border: 1px solid var(--border);
      padding: 6px 10px; border-radius: 6px; font-size: 0.875rem; width: 100%;
    }
    .sign-off-form .field { display: flex; flex-direction: column; flex: 1; min-width: 160px; }
    .btn-approve { background: rgba(34,197,94,.2) !important; color: var(--pass) !important; border-color: var(--pass) !important; }
    .btn-approve:hover { background: rgba(34,197,94,.35) !important; }
    .save-indicator { font-size: 0.75rem; color: var(--muted); margin-left: auto; }
    .save-indicator.saving { color: var(--manual); }
    .save-indicator.saved { color: var(--pass); }
    /* Print styles */
    @media print {
      body { background: white; color: black; padding: 12px; }
      .toolbar, .chart, .compare-panel, .filter-bar, .export-bar,
      button, select, input, .sign-off-form { display: none !important; }
      .sign-off-banner { display: block !important; background: #d1fae5 !important;
        border-color: #059669 !important; color: #065f46 !important; }
      :root { --bg: white; --card: #f8fafc; --border: #cbd5e1;
              --text: #1e293b; --muted: #64748b; }
      .badge { border: 1px solid currentColor; }
      input[type=checkbox]:checked::after { content: '\\2611'; }
      input[type=checkbox]::after { content: '\\2610'; }
    }
  </style>
</head>
<body>
  <h1>📋 Living Checklist</h1>

  <!-- Tester name + toolbar -->
  <div class="toolbar">
    <label for="tester-name" style="font-size:.875rem;color:var(--muted)">Your name:</label>
    <input type="text" id="tester-name" placeholder="QA name" style="width:140px" />
    <label for="rel-select" style="font-size:.875rem;color:var(--muted)">Release:</label>
    <select id="rel-select"></select>
    <button id="compare-btn">⚖ Compare</button>
    <select id="compare-rel" style="display:none"></select>
    <button onclick="exportMd()">⬇ Markdown</button>
    <button onclick="exportJson()">⬇ JSON</button>
    <button id="approve-btn" class="btn-approve">✓ Approve Release</button>
    <span class="save-indicator" id="save-indicator"></span>
  </div>

  <!-- Sign-off form -->
  <div class="sign-off-form" id="sign-off-form">
    <div class="field">
      <label>Approver name</label>
      <input type="text" id="approver-name" placeholder="Your name" />
    </div>
    <div class="field">
      <label>Comment (optional)</label>
      <input type="text" id="approver-comment" placeholder="All scenarios verified, ready to ship" />
    </div>
    <button onclick="confirmSignOff()" class="btn-approve">Confirm Sign-Off</button>
    <button onclick="cancelSignOff()">Cancel</button>
  </div>

  <!-- Sign-off banner -->
  <div class="sign-off-banner" id="sign-off-banner"></div>

  <!-- Filter bar -->
  <div class="filter-bar">
    <label>Search:</label>
    <input type="text" id="filter-search" placeholder="Feature or scenario name..." oninput="applyFilters()" />
    <label>Status:</label>
    <select id="filter-status" onchange="applyFilters()">
      <option value="">All</option>
      <option value="passed">Passed</option>
      <option value="failed">Failed</option>
      <option value="skipped">Skipped</option>
      <option value="pending">Pending</option>
    </select>
    <label>Type:</label>
    <select id="filter-type" onchange="applyFilters()">
      <option value="">All</option>
      <option value="auto">Auto</option>
      <option value="manual">Manual</option>
    </select>
    <span id="filter-count" style="font-size:.75rem;color:var(--muted);margin-left:auto"></span>
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
    const testerInput = document.getElementById('tester-name');
    const signOffBanner = document.getElementById('sign-off-banner');
    const signOffForm = document.getElementById('sign-off-form');
    const saveIndicator = document.getElementById('save-indicator');

    const SERVER_BASE = 'http://localhost:3030';
    let serverAvailable = false;
    let saveTimer = null;

    // --- Tester name persistence ---
    testerInput.value = localStorage.getItem('checklist:tester') || '';
    testerInput.addEventListener('input', () => {
      localStorage.setItem('checklist:tester', testerInput.value);
    });

    // Probe server availability
    fetch(SERVER_BASE + '/api/history').then(() => { serverAvailable = true; }).catch(() => {});

    // --- Populate release selectors ---
    history.forEach((r, i) => {
      const isLatest = i === history.length - 1;
      const label = \`\${r.tag}  (\${r.timestamp.slice(0,10)})\${isLatest ? '  ● Latest' : ''}\`;
      relSelect.appendChild(new Option(label, i));
      compareSelect.appendChild(new Option(\`\${r.tag}  (\${r.timestamp.slice(0,10)})\`, i));
    });
    relSelect.value = history.length - 1;

    // Pre-fill approver name from tester field
    document.getElementById('approver-name').value = testerInput.value;
    testerInput.addEventListener('input', () => {
      if (!document.getElementById('approver-name').dataset.touched) {
        document.getElementById('approver-name').value = testerInput.value;
      }
    });
    document.getElementById('approver-name').addEventListener('input', function() {
      this.dataset.touched = '1';
    });

    // --- Auto-save helpers ---
    function scheduleSave() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = setTimeout(persistState, 1000);
    }

    async function persistState() {
      saveIndicator.textContent = 'Saving...';
      saveIndicator.className = 'save-indicator saving';
      if (serverAvailable) {
        try {
          await fetch(SERVER_BASE + '/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(history),
          });
          saveIndicator.textContent = 'Saved ✓';
          saveIndicator.className = 'save-indicator saved';
        } catch {
          fallbackSave();
        }
      } else {
        fallbackSave();
      }
      setTimeout(() => { saveIndicator.textContent = ''; saveIndicator.className = 'save-indicator'; }, 3000);
    }

    function fallbackSave() {
      try { localStorage.setItem('checklist:history', JSON.stringify(history)); } catch {}
      saveIndicator.textContent = 'Saved locally';
      saveIndicator.className = 'save-indicator saved';
    }

    // --- Render ---
    function relativeTime(iso) {
      const diff = Date.now() - new Date(iso).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return 'just now';
      if (m < 60) return m + 'm ago';
      const h = Math.floor(m / 60);
      if (h < 24) return h + 'h ago';
      return Math.floor(h / 24) + 'd ago';
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

      // Sign-off banner
      if (run.signOff) {
        const so = run.signOff;
        signOffBanner.className = 'sign-off-banner visible';
        signOffBanner.innerHTML = \`✓ Approved by <strong>\${so.tester}</strong> on \${so.timestamp.slice(0,10)}\${so.comment ? \` — \${so.comment}\` : ''}\`;
      } else {
        signOffBanner.className = 'sign-off-banner';
      }

      // Scenarios table
      tbody.innerHTML = run.scenarios.map((s, idx) => {
        const featureCell = \`<td>\${s.feature}</td>\`;
        const nameCell = \`<td>\${s.name}</td>\`;
        const typeCell = s.manual
          ? \`<td><span class="badge badge-manual">manual</span></td>\`
          : \`<td><span class="badge" style="background:rgba(99,102,241,.2);color:#818cf8">auto</span></td>\`;

        let statusCell;
        if (s.manual) {
          const checked = s.manualCheck?.checked ? 'checked' : '';
          const hint = s.manualCheck?.checked
            ? \`<div class="tester-hint">\${s.manualCheck.tester} · \${relativeTime(s.manualCheck.timestamp)}</div>\`
            : '';
          statusCell = \`<td>
            <label class="check-wrap">
              <input type="checkbox" \${checked} data-idx="\${idx}" onchange="saveCheck(this, \${idx})" />
              <span style="color:var(--manual);font-size:.8rem">manual check</span>
            </label>
            \${hint}
          </td>\`;
        } else {
          const cls = s.status === 'passed' ? 'badge-pass' : s.status === 'failed' ? 'badge-fail' : 'badge-skip';
          statusCell = \`<td><span class="badge \${cls}">\${s.status}</span>\${s.errorMessage ? \`<div style="color:var(--fail);font-size:.75rem;margin-top:4px">\${s.errorMessage.slice(0,120)}</div>\` : ''}</td>\`;
        }

        const tagsCell = \`<td style="color:var(--muted);font-size:.75rem">\${s.tags.join(' ')}</td>\`;
        return \`<tr data-feature="\${s.feature.toLowerCase()}" data-name="\${s.name.toLowerCase()}" data-status="\${s.status}" data-type="\${s.manual?'manual':'auto'}">\${featureCell}\${nameCell}\${typeCell}\${statusCell}\${tagsCell}</tr>\`;
      }).join('');

      applyFilters();
      renderTrend();
    }

    function saveCheck(checkbox, idx) {
      const run = history[+relSelect.value];
      if (!run) return;
      const tester = testerInput.value.trim() || 'QA';
      run.scenarios[idx].manualCheck = {
        tester,
        timestamp: new Date().toISOString(),
        checked: checkbox.checked,
      };
      // Update hint inline
      const td = checkbox.closest('td');
      let hint = td.querySelector('.tester-hint');
      if (checkbox.checked) {
        if (!hint) { hint = document.createElement('div'); hint.className = 'tester-hint'; td.appendChild(hint); }
        hint.textContent = \`\${tester} · just now\`;
      } else if (hint) {
        hint.remove();
      }
      scheduleSave();
    }

    // --- Filter ---
    function applyFilters() {
      const search = document.getElementById('filter-search').value.toLowerCase();
      const status = document.getElementById('filter-status').value;
      const type = document.getElementById('filter-type').value;
      const rows = tbody.querySelectorAll('tr');
      let visible = 0;
      rows.forEach(row => {
        const matchSearch = !search ||
          row.dataset.feature.includes(search) ||
          row.dataset.name.includes(search);
        const matchStatus = !status || row.dataset.status === status;
        const matchType = !type || row.dataset.type === type;
        const show = matchSearch && matchStatus && matchType;
        row.classList.toggle('hidden', !show);
        if (show) visible++;
      });
      document.getElementById('filter-count').textContent = \`\${visible} / \${rows.length} scenarios\`;
    }

    // --- Sign-off ---
    document.getElementById('approve-btn').addEventListener('click', () => {
      signOffForm.classList.toggle('open');
    });

    function cancelSignOff() {
      signOffForm.classList.remove('open');
    }

    function confirmSignOff() {
      const run = history[+relSelect.value];
      if (!run) return;
      const name = document.getElementById('approver-name').value.trim() || testerInput.value.trim() || 'QA';
      const comment = document.getElementById('approver-comment').value.trim();
      run.signOff = {
        tester: name,
        timestamp: new Date().toISOString(),
        ...(comment ? { comment } : {}),
      };
      signOffForm.classList.remove('open');
      render();
      scheduleSave();
    }

    // --- Trend chart ---
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

    // --- Compare ---
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
        .filter(s => { const bs = b.scenarios.find(x => x.name === s.name); return bs && bs.status !== s.status; });

      document.getElementById('compare-content').innerHTML = \`
        <p style="font-size:.875rem;color:var(--muted);margin-bottom:8px"><b>\${a.tag}</b> → <b>\${b.tag}</b></p>
        <p class="diff-new">+ \${added.length} new: \${added.slice(0,3).join(', ')}\${added.length > 3 ? ' ...' : ''}</p>
        <p class="diff-removed">- \${removed.length} removed: \${removed.slice(0,3).join(', ')}\${removed.length > 3 ? ' ...' : ''}</p>
        <p class="diff-changed">~ \${changed.length} status changed: \${changed.slice(0,3).map(s => s.name).join(', ')}\${changed.length > 3 ? ' ...' : ''}</p>
      \`;
    }

    // --- Exports ---
    function exportMd() {
      const run = history[+relSelect.value];
      if (!run) return;
      const signOffLine = run.signOff
        ? \`\\n> ✓ Approved by \${run.signOff.tester} on \${run.signOff.timestamp.slice(0,10)}\${run.signOff.comment ? ' — ' + run.signOff.comment : ''}\`
        : '';
      const lines = [
        \`# Living Checklist — \${run.tag}\`,
        \`> \${run.timestamp}\${signOffLine}\`,
        '',
        \`| Feature | Scenario | Type | Status | Checked By |\`,
        \`|---------|----------|------|--------|------------|\`,
        ...run.scenarios.map(s => {
          const check = s.manual
            ? (s.manualCheck?.checked ? \`[x] \${s.manualCheck.tester}\` : '[ ]')
            : s.status;
          return \`| \${s.feature} | \${s.name} | \${s.manual ? 'manual' : 'auto'} | \${s.status} | \${check} |\`;
        }),
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
