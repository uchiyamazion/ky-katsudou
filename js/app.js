// ════════════════════════════════════════════════
// KY(危険予知)活動記録 - app.js
// ════════════════════════════════════════════════

let hazardCount = 0;
let workerCount = 0;
let kyRecords = [];

// 署名データ（Base64 PNG）
const workerSignatures = {};   // { workerRowId: dataUrl }
let confirmSignature = '';

// ---- 危険予知テンプレート（空調・HVAC現場でよくあるKY項目） ----
const HAZARD_TEMPLATES = [
  { label: '脚立・はしごからの転落', point: '脚立やはしごの昇降中に足を踏み外し転落する', action: '脚立の天板に立たず、必ず三点支持で昇降する。使用前に脚立の開き止め金具を確認する。' },
  { label: '高所（屋根上・室外機置場）からの墜落', point: '屋根上や高所での室外機設置・点検作業中に足を滑らせ墜落する', action: '安全帯（フルハーネス）を着用し、親綱に必ずフックを掛ける。作業範囲に養生・囲いを設置する。' },
  { label: 'クレーン作業中の吊り荷落下・挟まれ', point: 'クレーンで室外機等を吊り上げる際、玉掛けの外れや旋回時の接触により吊り荷が落下し作業者が挟まれる', action: '玉掛けは有資格者が実施し、吊り荷の下に入らない。合図者を配置し声出し確認を徹底する。' },
  { label: '冷媒ガスによる薬傷・凍傷', point: '冷媒（フロン類）取り扱い時にガス漏れ・噴出により薬傷や凍傷を負う', action: '保護メガネ・手袋を着用し、換気を確保した状態で作業する。バルブの開閉は指差し呼称で確認する。' },
  { label: '電気配線作業中の感電', point: '電気配線・端子接続作業中に通電状態の回路へ触れ感電する', action: '作業前に必ずブレーカーを遮断し検電器で無通電を確認する。濡れた手での作業は行わない。' },
  { label: '重量物運搬による腰痛・ぎっくり腰', point: '室外機等の重量物を人力で運搬する際、無理な体勢により腰を痛める', action: '複数人での運搬を徹底し、台車やチェーンブロックを活用する。持ち上げ時は膝を使い腰への負担を減らす。' },
  { label: '悪天候（雨・強風）でのスリップ・転倒', point: '雨天や強風時の屋外・屋上作業で足元が滑り転倒する', action: '滑りにくい安全靴を着用し、無理な作業は中止・延期する。強風時は高所作業を控える。' },
  { label: '車両誘導・搬入時の接触事故', point: '資材搬入や車両誘導中に、後退する車両や通行人と接触する', action: '誘導員を配置し、笛や合図で意思疎通を徹底する。周囲の歩行者・車両に注意を払う。' },
  { label: '切断工具・カッターによる切創', point: '配管や断熱材の切断作業中に工具が滑り手指を切創する', action: '保護手袋を着用し、刃先の向きに指を置かない。切断時は周囲に人がいないことを確認する。' },
  { label: '断熱材・粉じんの吸入', point: 'グラスウール等の断熱材切断時に粉じんを吸い込む', action: '防塵マスクを着用し、屋外や換気の良い場所で作業する。切断くずはこまめに清掃する。' }
];

function applyHazardTemplate(id, idx) {
  const row = document.querySelector(`#hazard-list [data-hazard-id="${id}"]`);
  if (!row) return;
  if (idx === '') return; // 「－ テンプレートを選択 －」に戻した場合は何もしない
  const t = HAZARD_TEMPLATES[idx];
  if (!t) return;
  row.querySelector('.hz-point').value = t.point;
  row.querySelector('.hz-action').value = t.action;
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('date').valueAsDate = new Date();
  addHazardRow();
  addHazardRow();
  addWorkerRow();
  bindTabs();
  bindForm();
  initSignPad();
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
      <label>テンプレートから選ぶ（該当なければ下欄に自由入力）</label>
      <select class="hz-template" onchange="applyHazardTemplate(${id}, this.value)">
        <option value="">－ テンプレートを選択 －</option>
        ${HAZARD_TEMPLATES.map((t, i) => `<option value="${i}">${escapeHtml(t.label)}</option>`).join('')}
      </select>
    </div>
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

// ---- 作業者の行を追加（氏名＋署名） ----
function addWorkerRow() {
  workerCount++;
  const id = workerCount;
  const wrap = document.getElementById('worker-list');
  const row = document.createElement('div');
  row.className = 'worker-row';
  row.dataset.workerId = id;
  row.innerHTML = `
    <button type="button" class="remove-worker" onclick="removeWorkerRow(${id})">×</button>
    <div class="worker-num">作業者 #${id}</div>
    <div class="field">
      <label>氏名</label>
      <input type="text" class="wk-name" placeholder="例：内山">
    </div>
    <div class="field">
      <label>署名 <span class="sign-hint">（タップしてサインしてください）</span></label>
      <div class="sign-input-wrap">
        <div class="sign-canvas-area" id="worker-sign-preview-${id}" onclick="openSignPad(${id})">
          <img id="worker-sign-preview-img-${id}" src="" alt="サイン">
          <span id="worker-sign-preview-ph-${id}" class="sign-ph-text">タップしてサイン ✏</span>
        </div>
        <div class="sign-input-btns">
          <button type="button" class="btn btn-ghost btn-sm" onclick="openSignPad(${id})">✏ サイン</button>
          <button type="button" class="btn btn-ghost btn-sm" onclick="clearSignInput(${id})">クリア</button>
        </div>
      </div>
    </div>
  `;
  wrap.appendChild(row);
  renumberWorkers();
}

function removeWorkerRow(id) {
  const wrap = document.getElementById('worker-list');
  if (wrap.querySelectorAll('.worker-row').length <= 1) {
    showToast('作業者は最低1名必要です');
    return;
  }
  const row = wrap.querySelector(`[data-worker-id="${id}"]`);
  if (row) row.remove();
  delete workerSignatures[id];
  renumberWorkers();
}

function renumberWorkers() {
  document.querySelectorAll('#worker-list .worker-row').forEach((row, i) => {
    row.querySelector('.worker-num').textContent = `作業者 #${i + 1}`;
  });
}

function collectWorkers() {
  const rows = document.querySelectorAll('#worker-list .worker-row');
  const workers = [];
  rows.forEach(row => {
    const id = row.dataset.workerId;
    const name = row.querySelector('.wk-name').value.trim();
    const signature = workerSignatures[id] || '';
    if (name || signature) workers.push({ name, signature });
  });
  return workers;
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

  const workers = collectWorkers();

  const payload = {
    date, siteName, workContent, workers, hazards, priorityAction,
    confirmedBy,
    confirmedBySignature: confirmSignature || ''
  };

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

  document.getElementById('worker-list').innerHTML = '';
  workerCount = 0;
  Object.keys(workerSignatures).forEach(k => delete workerSignatures[k]);
  addWorkerRow();

  confirmSignature = '';
  clearSignInputDisplay('confirm');
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

function workerNames(rec) {
  const workers = Array.isArray(rec.workers) ? rec.workers : [];
  if (workers.length) return workers.map(w => (typeof w === 'string' ? w : w.name || '')).filter(Boolean).join('、');
  return rec.workers || '';
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
    const workers = workerNames(rec);
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

function signImgHtml(dataUrl) {
  if (!dataUrl) return '';
  return `<img class="detail-sign-img" src="${dataUrl}" alt="署名">`;
}

// ---- 詳細表示 ----
function showDetail(rec) {
  const overlay = document.getElementById('detail-overlay');
  const body = document.getElementById('detail-body');
  const hazards = Array.isArray(rec.hazards) ? rec.hazards : [];
  const workers = Array.isArray(rec.workers) ? rec.workers : [];

  let hazardsHtml = hazards.map((h, i) => `
    <div class="detail-hazard">
      <div class="dh-label">危険予知 #${i + 1} ／ 危険のポイント</div>
      <div class="dh-point">${escapeHtml(h.point || '')}</div>
      <div class="dh-label">対策・行動目標</div>
      <div class="dh-action">${escapeHtml(h.action || '')}</div>
    </div>
  `).join('');

  let workersHtml;
  if (workers.length && typeof workers[0] === 'object') {
    workersHtml = workers.map((w, i) => `
      <div class="field" style="margin-bottom:${i === workers.length - 1 ? '0' : '10px'};">
        <label>作業者 #${i + 1}：${escapeHtml(w.name || '')}</label>
        ${signImgHtml(w.signature)}
      </div>
    `).join('');
  } else {
    workersHtml = `<div class="field"><label>作業者</label><div>${escapeHtml(workerNames(rec))}</div></div>`;
  }

  body.innerHTML = `
    <div class="field"><label>日付</label><div>${formatDate(rec.date)}</div></div>
    <div class="field"><label>現場名</label><div>${escapeHtml(rec.siteName || '')}</div></div>
    <div class="field"><label>作業内容</label><div>${escapeHtml(rec.workContent || '')}</div></div>
    ${workersHtml}
    ${hazardsHtml}
    ${rec.priorityAction ? `<div class="field"><label>今日の重点実施項目</label><div>${escapeHtml(rec.priorityAction)}</div></div>` : ''}
    ${rec.confirmedBy ? `<div class="field" style="margin-bottom:0;"><label>確認者：${escapeHtml(rec.confirmedBy)}</label>${signImgHtml(rec.confirmedBySignature)}</div>` : ''}
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

// ============================================================
// 署名パッド（作業者・確認者 共通）
// ============================================================
let padCanvas, padCtx, padDrawing = false;
let currentSignTarget = null; // 'confirm' または 作業者の行id

function initSignPad() {
  padCanvas = document.getElementById('sign-pad-canvas');
  padCtx = padCanvas.getContext('2d');

  function pos(e) {
    const r = padCanvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }
  padCanvas.addEventListener('mousedown', e => { padDrawing = true; const p = pos(e); padCtx.beginPath(); padCtx.moveTo(p.x, p.y); });
  padCanvas.addEventListener('mousemove', e => { if (!padDrawing) return; const p = pos(e); padCtx.lineTo(p.x, p.y); padCtx.stroke(); });
  padCanvas.addEventListener('mouseup', () => padDrawing = false);
  padCanvas.addEventListener('mouseleave', () => padDrawing = false);
  padCanvas.addEventListener('touchstart', e => { e.preventDefault(); padDrawing = true; const p = pos(e); padCtx.beginPath(); padCtx.moveTo(p.x, p.y); });
  padCanvas.addEventListener('touchmove', e => { e.preventDefault(); if (!padDrawing) return; const p = pos(e); padCtx.lineTo(p.x, p.y); padCtx.stroke(); });
  padCanvas.addEventListener('touchend', () => padDrawing = false);
}

function resizePadCanvas() {
  const dpr = window.devicePixelRatio || 1;
  padCanvas.width = padCanvas.offsetWidth * dpr;
  padCanvas.height = padCanvas.offsetHeight * dpr;
  padCtx.scale(dpr, dpr);
  padCtx.strokeStyle = '#000';
  padCtx.lineWidth = 6;
  padCtx.lineCap = 'round';
  padCtx.lineJoin = 'round';
}

window.openSignPad = function(target) {
  currentSignTarget = target;
  document.getElementById('sign-pad-modal').classList.add('open');
  setTimeout(resizePadCanvas, 80);
};
window.closeSignPad = function() {
  document.getElementById('sign-pad-modal').classList.remove('open');
  currentSignTarget = null;
};
window.clearSignPad = function() {
  padCtx.clearRect(0, 0, padCanvas.width, padCanvas.height);
};
window.confirmSignPad = function() {
  const px = padCtx.getImageData(0, 0, padCanvas.width, padCanvas.height).data;
  if (!px.some((v, i) => i % 4 === 3 && v > 0)) {
    alert('サインを入力してください');
    return;
  }
  const dataUrl = padCanvas.toDataURL('image/png');
  const target = currentSignTarget;

  if (target === 'confirm') {
    confirmSignature = dataUrl;
    setSignPreview('confirm', dataUrl);
  } else if (target) {
    workerSignatures[target] = dataUrl;
    setSignPreview(target, dataUrl);
  }
  closeSignPad();
};

function setSignPreview(target, dataUrl) {
  const areaId = target === 'confirm' ? 'confirm-sign-preview' : `worker-sign-preview-${target}`;
  const imgId = target === 'confirm' ? 'confirm-sign-preview-img' : `worker-sign-preview-img-${target}`;
  const phId = target === 'confirm' ? 'confirm-sign-preview-ph' : `worker-sign-preview-ph-${target}`;
  const img = document.getElementById(imgId);
  const ph = document.getElementById(phId);
  const area = document.getElementById(areaId);
  if (!img || !ph || !area) return;
  img.src = dataUrl; img.style.display = 'block';
  ph.style.display = 'none';
  area.classList.add('signed');
}

window.clearSignInput = function(target) {
  if (target === 'confirm') confirmSignature = '';
  else delete workerSignatures[target];
  clearSignInputDisplay(target);
};

function clearSignInputDisplay(target) {
  const imgId = target === 'confirm' ? 'confirm-sign-preview-img' : `worker-sign-preview-img-${target}`;
  const phId = target === 'confirm' ? 'confirm-sign-preview-ph' : `worker-sign-preview-ph-${target}`;
  const areaId = target === 'confirm' ? 'confirm-sign-preview' : `worker-sign-preview-${target}`;
  const img = document.getElementById(imgId);
  const ph = document.getElementById(phId);
  const area = document.getElementById(areaId);
  if (!img || !ph || !area) return;
  img.src = ''; img.style.display = 'none';
  ph.style.display = '';
  area.classList.remove('signed');
}
