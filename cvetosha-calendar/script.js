const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');
const grid = document.getElementById('days-grid');
const saveBtn = document.querySelector('.dates__save');

const selectedDates = new Set();
const lockedDates = new Set();

// Получаем clientId из URL или подставляем дефолт
const urlParams = new URLSearchParams(window.location.search);
const clientId = +urlParams.get("id") || 546082827;

// 👇 Здесь ты можешь подключить свою API-функцию
async function getUserVariables(clientId) {
  // пример запроса — замени на своё API
  const res = await fetch(`/api/clients/${clientId}/variables`);
  const data = await res.json();
  return {
    sobitie_1: data.sobitie_1,
    sobitie_2: data.sobitie_2,
    sobitie_3: data.sobitie_3
  };
}

function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function getDaysInMonth(month, year) {
  if (month === 1) return isLeapYear(year) ? 29 : 28;
  if ([3, 5, 8, 10].includes(month)) return 30;
  return 31;
}

function isDisabledDate(day, month, year) {
  const d = new Date(year, month, day);
  const now = new Date();
  const diff = (d - now) / (1000 * 60 * 60 * 24);

  if (diff < 14) return true;
  if (month === 2 && day >= 1 && day <= 8) return true;
  if (month === 1 && (day === 13 || day === 14)) return true;
  if ((month === 7 && day === 31) || (month === 8 && day === 1)) return true;

  if (month === 10) {
    const lastDay = new Date(year, 11, 0);
    const offset = lastDay.getDay();
    const mothersDay = new Date(year, 10, lastDay.getDate() - offset);
    const dayBefore = new Date(mothersDay);
    dayBefore.setDate(mothersDay.getDate() - 1);
    if (
      d.toDateString() === mothersDay.toDateString() ||
      d.toDateString() === dayBefore.toDateString()
    ) return true;
  }

  return false;
}

function renderDays(month, year) {
  grid.innerHTML = '';
  const days = getDaysInMonth(month, year);
  selectedDates.clear();

  for (let day = 1; day <= days; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const btn = document.createElement('button');
    btn.className = 'dates__day';
    btn.textContent = day;

    const disabled = isDisabledDate(day, month, year);
    const locked = lockedDates.has(dateStr);

    if (locked) {
      btn.classList.add('dates__day--selected');
      btn.disabled = true;
    } else if (disabled) {
      btn.classList.add('dates__day--disabled');
      btn.disabled = true;
    } else {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('dates__day--selected')) {
          selectedDates.delete(dateStr);
          btn.classList.remove('dates__day--selected');
        } else {
          if (selectedDates.size + lockedDates.size < 3) {
            selectedDates.add(dateStr);
            btn.classList.add('dates__day--selected');
          }
        }
      });
    }

    grid.appendChild(btn);
  }
}

async function initApp() {
  // Получаем переменные клиента
  const { sobitie_1, sobitie_2, sobitie_3 } = await getUserVariables(clientId);
  [sobitie_1, sobitie_2, sobitie_3].forEach(dateStr => {
    if (dateStr) lockedDates.add(dateStr);
  });

  // Рендерим интерфейс
  renderDays(parseInt(monthSelect.value), parseInt(yearSelect.value));
}

monthSelect.addEventListener('change', () =>
  renderDays(parseInt(monthSelect.value), parseInt(yearSelect.value))
);
yearSelect.addEventListener('change', () =>
  renderDays(parseInt(monthSelect.value), parseInt(yearSelect.value))
);

// 🔥 Отправка данных в бота при сохранении
saveBtn.addEventListener('click', async () => {
  const result = [...lockedDates, ...selectedDates].slice(0, 3);

  await fetch('/webhook/save-dates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id: clientId,
      selected_dates: result
    })
  });

  alert('Даты сохранены!');
});

// Стартуем
initApp();