(() => {
  const tasks = window.XIANGQI_TASKS;
  const labels = window.EVAL_LABELS;
  const STORAGE_KEY = 'xiangqi-position-stage1-v1';

  const state = {
    chapter: 0,
    mistakesOnly: false,
    index: 0,
    selectedScore: null,
    confidence: null,
    checked: false,
    progress: loadProgress()
  };

  const el = Object.fromEntries([
    'chapterFilters','mistakesOnly','taskChapter','taskTitle','taskCounter','boardImage','sideToMove',
    'scale','confidence','submitBtn','revealBtn','feedback','prevBtn','nextBtn','resetBtn',
    'statSolved','statExact','statDirection','statMeanError','progressFill'
  ].map(id => [id, document.getElementById(id)]));

  const chapterNames = {0:'Все 30 задач',1:'1. Ценность фигур',2:'2. Скорость развития',3:'3. Расположение фигур'};
  const shortLabels = {
    '-4':'выигрыш\nчёрных','-3':'большой\nперевес','-2':'перевес\nчёрных','-1':'малый\nперевес',
    '0':'равенство','1':'малый\nперевес','2':'перевес\nкрасных','3':'большой\nперевес','4':'выигрыш\nкрасных'
  };

  function loadProgress() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }
  function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress)); }
  function sign(n) { return n === 0 ? 0 : n > 0 ? 1 : -1; }
  function filteredTasks() {
    let list = state.chapter ? tasks.filter(t => t.chapter === state.chapter) : [...tasks];
    if (state.mistakesOnly) {
      list = list.filter(t => state.progress[t.id] && !state.progress[t.id].exact);
    }
    return list;
  }
  function currentTask() { return filteredTasks()[state.index] || null; }

  function renderFilters() {
    el.chapterFilters.innerHTML = '';
    Object.entries(chapterNames).forEach(([key, name]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      b.className = Number(key) === state.chapter ? 'active' : '';
      b.addEventListener('click', () => {
        state.chapter = Number(key); state.index = 0; resetAnswer(); render();
      });
      el.chapterFilters.appendChild(b);
    });
  }

  function renderScale(task) {
    el.scale.innerHTML = '';
    for (let score = -4; score <= 4; score++) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.score = String(score); b.setAttribute('role','radio');
      b.setAttribute('aria-checked', String(state.selectedScore === score));
      if (state.selectedScore === score) b.classList.add('selected');
      if (state.checked && score === task.score) b.classList.add('correct');
      const num = score > 0 ? `+${score}` : String(score);
      b.innerHTML = `<span class="num">${num}</span><span class="short">${shortLabels[score].replace('\n','<br>')}</span>`;
      b.disabled = state.checked;
      b.addEventListener('click', () => { state.selectedScore = score; renderAnswerControls(task); });
      el.scale.appendChild(b);
    }
  }

  function renderConfidence() {
    [...el.confidence.querySelectorAll('button')].forEach(b => {
      b.classList.toggle('selected', b.dataset.confidence === state.confidence);
      b.disabled = state.checked;
    });
  }

  function renderAnswerControls(task) {
    renderScale(task); renderConfidence();
    el.submitBtn.disabled = state.selectedScore === null || state.checked;
    el.revealBtn.disabled = state.checked;
  }

  function renderFeedback(task, answer, revealed = false) {
    const delta = Math.abs(answer - task.score);
    const exact = delta === 0;
    const directionCorrect = sign(answer) === sign(task.score);
    let title;
    if (revealed) title = 'Ответ показан без оценки';
    else if (exact) title = 'Точно';
    else if (directionCorrect) title = `Верное направление, ошибка ${delta} ${delta === 1 ? 'ступень' : 'ступени'}`;
    else title = `Ошибка направления, разница ${delta} ступени`;

    const yourLabel = revealed ? '—' : `${answer > 0 ? '+' : ''}${answer}: ${labels[answer]}`;
    const correctLabel = `${task.score > 0 ? '+' : ''}${task.score}: ${labels[task.score]}`;
    el.feedback.innerHTML = `
      <div class="result-title ${exact ? 'good' : 'bad'}">${title}</div>
      <dl>
        <dt>Ваш ответ</dt><dd>${yourLabel}</dd>
        <dt>Ответ книги</dt><dd>${correctLabel} (вариант ${task.option})</dd>
      </dl>
      <div class="explanation">
        ${task.material ? `<p><b>Материал:</b> ${task.material}</p>` : ''}
        <p><b>Оценка позиции:</b> ${task.explanation}</p>
        ${task.line ? `<div class="line"><b>Вариант автора:</b> ${task.line}</div>` : ''}
      </div>`;
    el.feedback.hidden = false;
  }

  function submitAnswer(revealed = false) {
    const task = currentTask(); if (!task) return;
    const answer = revealed ? null : state.selectedScore;
    state.checked = true;
    if (!revealed) {
      const delta = Math.abs(answer - task.score);
      state.progress[task.id] = {
        score: answer,
        confidence: state.confidence || 'not-set',
        exact: delta === 0,
        directionCorrect: sign(answer) === sign(task.score),
        delta,
        at: new Date().toISOString()
      };
      saveProgress();
    }
    renderAnswerControls(task);
    renderFeedback(task, answer, revealed);
    renderStats();
  }

  function resetAnswer() {
    state.selectedScore = null; state.confidence = null; state.checked = false;
    el.feedback.hidden = true; el.feedback.innerHTML = '';
  }

  function renderStats() {
    const entries = Object.values(state.progress);
    const solved = entries.length;
    const exact = solved ? Math.round(entries.filter(x => x.exact).length / solved * 100) : 0;
    const direction = solved ? Math.round(entries.filter(x => x.directionCorrect).length / solved * 100) : 0;
    const mean = solved ? (entries.reduce((s,x) => s + x.delta, 0) / solved).toFixed(1) : '—';
    el.statSolved.textContent = `${solved}/${tasks.length}`;
    el.statExact.textContent = `${exact}%`;
    el.statDirection.textContent = `${direction}%`;
    el.statMeanError.textContent = mean;
    el.progressFill.style.width = `${solved / tasks.length * 100}%`;
  }

  function render() {
    renderFilters(); renderStats();
    const list = filteredTasks();
    if (state.index >= list.length) state.index = Math.max(0, list.length - 1);
    const task = currentTask();
    if (!task) {
      el.taskChapter.textContent = 'Фильтр'; el.taskTitle.textContent = 'Нет задач';
      el.taskCounter.textContent = '';
      el.boardImage.removeAttribute('src'); el.boardImage.alt = '';
      el.sideToMove.textContent = 'В выбранном режиме нет решённых с ошибкой задач.';
      el.scale.innerHTML = ''; el.feedback.hidden = true;
      el.submitBtn.disabled = true; el.revealBtn.disabled = true;
      return;
    }
    el.taskChapter.textContent = `Раздел ${task.chapter} · ${task.chapterTitle}`;
    el.taskTitle.textContent = `Задача ${task.id}`;
    el.taskCounter.textContent = `${state.index + 1} / ${list.length}`;
    el.boardImage.src = task.image;
    el.boardImage.alt = `Диаграмма к задаче ${task.id}`;
    el.sideToMove.textContent = `Ход: ${task.sideToMove.toLowerCase()}`;
    renderAnswerControls(task);
    el.prevBtn.disabled = state.index === 0;
    el.nextBtn.disabled = state.index === list.length - 1;
  }

  el.confidence.addEventListener('click', e => {
    const b = e.target.closest('button[data-confidence]');
    if (!b || state.checked) return;
    state.confidence = b.dataset.confidence; renderConfidence();
  });
  el.submitBtn.addEventListener('click', () => submitAnswer(false));
  el.revealBtn.addEventListener('click', () => submitAnswer(true));
  el.prevBtn.addEventListener('click', () => { if (state.index > 0) { state.index--; resetAnswer(); render(); } });
  el.nextBtn.addEventListener('click', () => { if (state.index < filteredTasks().length - 1) { state.index++; resetAnswer(); render(); } });
  el.mistakesOnly.addEventListener('change', () => { state.mistakesOnly = el.mistakesOnly.checked; state.index = 0; resetAnswer(); render(); });
  el.resetBtn.addEventListener('click', () => {
    if (confirm('Удалить весь сохранённый прогресс?')) { state.progress = {}; saveProgress(); state.mistakesOnly = false; el.mistakesOnly.checked = false; state.index = 0; resetAnswer(); render(); }
  });
  document.addEventListener('keydown', e => {
    if (state.checked) return;
    const n = Number(e.key);
    if (Number.isInteger(n) && n >= 0 && n <= 4) {
      state.selectedScore = e.shiftKey ? -n : n; renderAnswerControls(currentTask());
    }
  });
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  render();
})();
