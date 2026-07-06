// ════════════════════════════════════════════════
// KY(危険予知)活動記録 - app.js
// ════════════════════════════════════════════════

let hazardCount = 0;
let kyRecords = [];

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date').valueAsDate = new Date();
  addHazardRow();
  addHazardRow();
  bindTabs();
  bindForm();
  loadKyList();
});

// ---- タブ切り替え ----
function bindTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.view).classList.add('active');
      if (btn.dataset.view === 'view-list') loadKyList();
    });
  });
}

// ---- 危険予知の行を追加 ----
function addHazardRow() {
  hazardCount++;
  const id = hazardCount;
  const wrap = document.getElementById('hazard-list');
  const row = document.createElement('div');
  row.className = 'hazard-row';
  row.dataset.hazardId = id;
  row.innerHTML = `
    <button type="button" class="remove-hazard" onclick="removeHazardRow(${id})">×</button>
    <div class="hazard-num">危険予知 #${id}</div>
    <div class="field">
      <label>どんな危険が潜んでいるか（危険のポイント）</label>
      <textarea class="hz-point" placeholder="例：脚立から降りる際に足を踏み外す"></textarea>
    </div>
    <div class="field" style="margin-bottom:0;">
      <label>対策・行動目標</label>
      <textarea class="hz-action" placeholder="例：脚立の天板に立たず、必ず三点支持で昇降する"></textarea>
    </div>
  `;
  wrap.appendChild(row);
  renumberHazards();
}

function removeHazardRow(id) {
  const wrap = document.getElementById('hazard-list');
  if (wrap.querySelectorAll('.hazard-row').length <= 1) {
    showToast('危険予知は最低1件必要です');
    return;
  }
  const row = wrap.querySelector(`[data-hazard-id="${id}"]`);
  if (row) row.remove();
  renumberHazards();
}

function renumberHazards() {
  document.querySelectorAll('#hazard-list .hazard-row').forEach((row, i) => {
    row.querySelector('.hazard-num').textContent = `危険予知 #${i + 1}`;
  });
}

// ---- フォーム送信 ----
function bindForm() {
  document.getElementById('ky-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveKy();
  });
}

function collectHazards() {
  const rows = document.querySelectorAll('#hazard-list .hazard-row');
  const hazards = [];
  rows.forEach(row => {
    const point = row.querySelector('.hz-point').value.trim();
    const action = row.querySelector('.hz-action').value.trim();
    if (point || action) hazards.push({ point, action });
  });
  return hazards;
}

async function saveKy() {
  const date = document.getElementById('date').value;
  const siteName = document.getElementById('siteName').value.trim();
  const workContent = document.getElementById('workContent').value.trim();
  const workersRaw = document.getElementById('workers').value.trim();
  const priorityAction = document.getElementById('priorityAction').value.trim();
  const confirmedBy = document.getElementById('confirmedBy').value.trim();

  if (!siteName || !workContent) {
    showToast('現場名と作業内容を入力してください');
    return;
  }

  const hazards = collectHazards();
  if (hazards.length === 0) {
    showToast('危険予知の内容を最低1件入力してください');
    return;
  }

  const workers = workersRaw ? workersRaw.split(/[、,\s]+/).filter(Boolean) : [];

  const payload = { date, siteName, workContent, workers, hazards, priorityAction, confirmedBy };

  const submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = '保存中…';

  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'ky_create', payload })
    });
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.data || '保存に失敗しました');

    showToast('KY活動を保存しました');
    resetForm();
    switchToListTab();
  } catch (err) {
    showToast('保存エラー: ' + err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'KY活動を保存する';
  }
}

function resetForm() {
  document.getElementById('ky-form').reset();
  document.getElementById('date').valueAsDate = new Date();
  document.getElementById('hazard-list').innerHTML = '';
  hazardCount = 0;
  addHazardRow();
  addHazardRow();
}

function switchToListTab() {
  document.querySelector('.tab-btn[data-view="view-list"]').click();
}

// ---- 一覧読み込み ----
async function loadKyList() {
  const container = document.getElementById('ky-list-container');
  container.innerHTML = '<div class="loading-state">読み込み中…</div>';
  try {
    const res = await fetch(`${GAS_URL}?action=ky_list`);
    const json = await res.json();
    if (json.status !== 'success') throw new Error(json.data || '取得に失敗しました');
    kyRecords = json.data || [];
    renderKyList();
  } catch (err) {
    container.innerHTML = `<div class="empty-state">読み込みに失敗しました<br><span style="opacity:.6">${err.message}</span></div>`;
  }
}

function renderKyList() {
  const container = document.getElementById('ky-list-container');
  if (!kyRecords.length) {
    container.innerHTML = '<div class="empty-state">まだKY活動の記録がありません。<br>「新規記録」タブから登録してください。</div>';
    return;
  }
  container.innerHTML = '';
  kyRecords.forEach(rec => {
    const hazards = Array.isArray(rec.hazards) ? rec.hazards : [];
    const workers = rec.workers || '';
    const card = document.createElement('div');
    card.className = 'ky-card';
    card.addEventListener('click', () => showDetail(rec));
    card.innerHTML = `
      <div class="ky-card-head">
        <span class="ky-card-date">${formatDate(rec.date)}</span>
      </div>
      <div class="ky-card-site">${escapeHtml(rec.siteName || '(現場名未入力)')}</div>
      <div class="ky-card-work">${escapeHtml(rec.workContent || '')}</div>
      <div class="ky-card-meta">
        <span>危険予知 ${hazards.length}件</span>
        <span>${escapeHtml(workers)}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function formatDate(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return String(d);
  return `${dt.getFullYear()}/${dt.getMonth()+1}/${dt.getDate()}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- 詳細表示 ----
function showDetail(rec) {
  const overlay = document.getElementById('detail-overlay');
  const body = document.getElementById('detail-body');
  const hazards = Array.isArray(rec.hazards) ? rec.hazards : [];

  let hazardsHtml = hazards.map((h, i) => `
    <div class="detail-hazard">
      <div class="dh-label">危険予知 #${i + 1} ／ 危険のポイント</div>
      <div class="dh-point">${escapeHtml(h.point || '')}</div>
      <div class="dh-label">対策・行動目標</div>
      <div class="dh-action">${escapeHtml(h.action || '')}</div>
    </div>
  `).join('');

  body.innerHTML = `
    <div class="field"><label>日付</label><div>${formatDate(rec.date)}</div></div>
    <div class="field"><label>現場名</label><div>${escapeHtml(rec.siteName || '')}</div></div>
    <div class="field"><label>作業内容</label><div>${escapeHtml(rec.workContent || '')}</div></div>
    <div class="field"><label>作業者</label><div>${escapeHtml(rec.workers || '')}</div></div>
    ${hazardsHtml}
    ${rec.priorityAction ? `<div class="field"><label>今日の重点実施項目</label><div>${escapeHtml(rec.priorityAction)}</div></div>` : ''}
    ${rec.confirmedBy ? `<div class="field" style="margin-bottom:0;"><label>確認者</label><div>${escapeHtml(rec.confirmedBy)}</div></div>` : ''}
  `;
  overlay.classList.remove('hidden');
}

function closeDetail() {
  document.getElementById('detail-overlay').classList.add('hidden');
}

// ---- トースト ----
let toastTimer = null;
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
}
