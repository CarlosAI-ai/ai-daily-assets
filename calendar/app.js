(() => {
  const STORAGE_KEY = 'calendar_events_v1';
  const MAX_CHIPS = 3;

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth(); // 0-based

  // ── Storage ──────────────────────────────
  function loadEvents() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveEvents(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ── Helpers ──────────────────────────────
  function dateKey(year, month, day) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  function formatModalDate(year, month, day) {
    const d = new Date(year, month, day);
    return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  function isToday(year, month, day) {
    return year === today.getFullYear() && month === today.getMonth() && day === today.getDate();
  }

  // ── Render ───────────────────────────────
  function render() {
    const events = loadEvents();
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('monthTitle');

    title.textContent = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    grid.innerHTML = '';

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevDays = new Date(viewYear, viewMonth, 0).getDate();

    const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement('div');
      cell.className = 'cell';

      let cellYear = viewYear, cellMonth = viewMonth, cellDay;
      let otherMonth = false;

      if (i < firstDay) {
        cellDay = prevDays - firstDay + i + 1;
        cellMonth = viewMonth - 1;
        if (cellMonth < 0) { cellMonth = 11; cellYear = viewYear - 1; }
        otherMonth = true;
      } else if (i >= firstDay + daysInMonth) {
        cellDay = i - firstDay - daysInMonth + 1;
        cellMonth = viewMonth + 1;
        if (cellMonth > 11) { cellMonth = 0; cellYear = viewYear + 1; }
        otherMonth = true;
      } else {
        cellDay = i - firstDay + 1;
      }

      if (otherMonth) cell.classList.add('other-month');
      if (isToday(cellYear, cellMonth, cellDay)) cell.classList.add('today');

      const dayNum = document.createElement('div');
      dayNum.className = 'day-num';
      dayNum.textContent = cellDay;
      cell.appendChild(dayNum);

      const key = dateKey(cellYear, cellMonth, cellDay);
      const dayEvents = (events[key] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

      dayEvents.slice(0, MAX_CHIPS).forEach(ev => {
        const chip = document.createElement('div');
        chip.className = 'event-chip';
        chip.textContent = (ev.time ? ev.time + ' ' : '') + ev.title;
        cell.appendChild(chip);
      });

      if (dayEvents.length > MAX_CHIPS) {
        const more = document.createElement('div');
        more.className = 'more-label';
        more.textContent = `+${dayEvents.length - MAX_CHIPS} more`;
        cell.appendChild(more);
      }

      cell.addEventListener('click', () => openModal(cellYear, cellMonth, cellDay));
      grid.appendChild(cell);
    }
  }

  // ── Modal ────────────────────────────────
  let activeKey = null;

  function openModal(year, month, day) {
    activeKey = dateKey(year, month, day);
    document.getElementById('modalDate').textContent = formatModalDate(year, month, day);
    document.getElementById('eventInput').value = '';
    document.getElementById('eventTime').value = '';
    renderEventList();
    document.getElementById('modalOverlay').classList.add('open');
    document.getElementById('eventInput').focus();
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
    activeKey = null;
    render();
  }

  function renderEventList() {
    const events = loadEvents();
    const list = document.getElementById('eventList');
    list.innerHTML = '';
    const dayEvents = (events[activeKey] || []).sort((a, b) => (a.time || '').localeCompare(b.time || ''));

    dayEvents.forEach((ev, idx) => {
      const li = document.createElement('li');
      li.className = 'event-item';

      const timeSpan = document.createElement('span');
      timeSpan.className = 'event-time';
      timeSpan.textContent = ev.time || '';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'event-title';
      titleSpan.textContent = ev.title;

      const del = document.createElement('button');
      del.className = 'delete-event';
      del.innerHTML = '&times;';
      del.setAttribute('aria-label', 'Delete event');
      del.addEventListener('click', () => deleteEvent(idx));

      li.appendChild(timeSpan);
      li.appendChild(titleSpan);
      li.appendChild(del);
      list.appendChild(li);
    });
  }

  function addEvent(title, time) {
    const events = loadEvents();
    if (!events[activeKey]) events[activeKey] = [];
    events[activeKey].push({ title, time });
    saveEvents(events);
    renderEventList();
  }

  function deleteEvent(idx) {
    const events = loadEvents();
    if (!events[activeKey]) return;
    // re-sort to match displayed order before splice
    events[activeKey].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    events[activeKey].splice(idx, 1);
    if (events[activeKey].length === 0) delete events[activeKey];
    saveEvents(events);
    renderEventList();
  }

  // ── Wire-up ──────────────────────────────
  document.getElementById('prevMonth').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    render();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    render();
  });

  document.getElementById('goToday').addEventListener('click', () => {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    render();
  });

  document.getElementById('closeModal').addEventListener('click', closeModal);

  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });

  document.getElementById('eventForm').addEventListener('submit', e => {
    e.preventDefault();
    const title = document.getElementById('eventInput').value.trim();
    const time = document.getElementById('eventTime').value;
    if (!title) return;
    addEvent(title, time);
    document.getElementById('eventInput').value = '';
    document.getElementById('eventTime').value = '';
    document.getElementById('eventInput').focus();
  });

  render();
})();
