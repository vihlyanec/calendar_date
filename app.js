// Цветочные напоминания — Telegram Mini App

// --- Telegram WebApp API (можно тестировать и без Telegram) ---
let tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : { close: () => {} };

// --- Глобальные переменные ---
let currentDate = new Date();
let selectedDate = null;
let savedDates = [];
let userVariables = {};
let lastSavedYear = null;

// --- Праздники РФ (2025) ---
const holidays2025 = [
    '2025-01-01','2025-01-02','2025-01-03','2025-01-04','2025-01-05','2025-01-06','2025-01-07','2025-01-08',
    '2025-02-23','2025-03-08','2025-05-01','2025-05-09','2025-06-12','2025-11-04'
];

// --- DOM элементы ---
const elements = {
    currentMonth: document.getElementById('currentMonth'),
    calendarDays: document.getElementById('calendarDays'),
    prevMonth: document.getElementById('prevMonth'),
    nextMonth: document.getElementById('nextMonth'),
    eventModal: document.getElementById('eventModal'),
    notificationModal: document.getElementById('notificationModal'),
    selectedDateText: document.getElementById('selectedDateText'),
    eventName: document.getElementById('eventName'),
    datesList: document.getElementById('datesList'),
    saveBtn: document.getElementById('saveBtn'),
    statusInfo: document.getElementById('statusInfo'),
    savedDates: document.getElementById('savedDatesSection')
};

// --- Получение clientId из URL (или дефолт для теста) ---
function getClientId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || '546082827';
}

// --- Загрузка переменных пользователя ---
async function loadUserVariables() {
    try {
        const clientId = getClientId();
        const response = await fetch(`https://chatter.salebot.pro/api/da37e22b33eb13cc4cabaa04dfe21df9/get_variables?client_id=${clientId}`);
        if (!response.ok) {
            userVariables = {};
            savedDates = [];
            lastSavedYear = null;
            return;
        }
        const data = await response.json();
        userVariables = data.variables || {};
        savedDates = [];
        for (let i = 1; i <= 3; i++) {
            const key = `sobitie_${i}`;
            if (userVariables[key]) {
                try {
                    const parsed = JSON.parse(userVariables[key]);
                    savedDates.push({ date: parsed.date, name: parsed.name, index: i });
                } catch (err) {
                    console.warn(`Ошибка парсинга ${key}`, err);
                }
            }
        }
        lastSavedYear = userVariables.last_saved_year ? parseInt(userVariables.last_saved_year) : null;
    } catch (err) {
        userVariables = {};
        savedDates = [];
        lastSavedYear = null;
    }
}

// --- Проверка возможности изменения дат ---
function canModifyDates() {
    const currentYear = new Date().getFullYear();
    if (!lastSavedYear) return true;
    return currentYear > lastSavedYear;
}

// --- Обновление информации о статусе ---
function updateStatusInfo() {
    const currentYear = new Date().getFullYear();
    const canModify = canModifyDates();
    if (!canModify) {
        elements.statusInfo.innerHTML = `<strong>Внимание!</strong> Даты можно изменять только раз в год. Следующее изменение возможно в ${currentYear + 1} году.`;
        elements.statusInfo.style.background = "#ffeaea";
        elements.statusInfo.style.color = "#b71c1c";
    } else if (savedDates.length >= 3) {
        elements.statusInfo.innerHTML = `<strong>Максимум дат достигнут!</strong> У вас уже выбрано 3 памятные даты.`;
        elements.statusInfo.style.background = "#fff3cd";
        elements.statusInfo.style.color = "#856404";
    } else if (savedDates.length === 0) {
        elements.statusInfo.innerHTML = `Выберите до 3 памятных дат, чтобы получать цветочные напоминания 🌸`;
        elements.statusInfo.style.background = "#e1bee7";
        elements.statusInfo.style.color = "#4a148c";
    } else {
        elements.statusInfo.innerHTML = `Выбрано дат: ${savedDates.length}/3. Можно добавлять новые даты.`;
        elements.statusInfo.style.background = "#e1bee7";
        elements.statusInfo.style.color = "#4a148c";
    }
}

// --- Рендер календаря ---
function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthNames = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
    elements.currentMonth.textContent = `${monthNames[month]} ${year}`;
    elements.calendarDays.innerHTML = '';
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1));
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();
        if (date.getMonth() !== month) {
            dayElement.classList.add('other-month');
        } else {
            const dateString = date.toISOString().split('T')[0];
            if (holidays2025.includes(dateString)) {
                dayElement.classList.add('holiday');
            } else {
                const isSaved = savedDates.some(saved => saved.date === dateString);
                if (isSaved) {
                    dayElement.classList.add('saved');
                } else if (!canSelectDate(date)) {
                    dayElement.classList.add('disabled');
                } else {
                    dayElement.addEventListener('click', () => selectDate(date));
                }
            }
        }
        elements.calendarDays.appendChild(dayElement);
    }
}

// --- Проверка возможности выбора даты ---
function canSelectDate(date) {
    const today = new Date();
    today.setHours(0,0,0,0);
    const currentYear = today.getFullYear();
    if (date.getFullYear() < currentYear) return false;
    if (date.getFullYear() === currentYear && date.getMonth() < today.getMonth()) return false;
    if (date.getFullYear() === currentYear && date.getMonth() === today.getMonth() && date.getDate() < today.getDate()) return false;
    const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < 15) return false;
    return true;
}

// --- Выбор даты ---
function selectDate(date) {
    if (!canModifyDates()) return showNotification('Даты можно изменять только раз в год. Следующее изменение возможно в следующем году.');
    if (savedDates.length >= 3) return showNotification('Достигнут максимум дат (3). Удалите одну из существующих дат, чтобы добавить новую.');
    const today = new Date();
    const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < 15) return showNotification('Нельзя добавлять даты, до которых меньше 15 дней.');
    selectedDate = date;
    elements.selectedDateText.textContent = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    elements.eventName.value = '';
    showPopup(elements.eventModal);
}

// --- Popup/Notification helpers ---
function showPopup(popup) {
    document.getElementById('modalOverlay').classList.add('show');
    popup.classList.add('show');
}
function hidePopup(popup) {
    document.getElementById('modalOverlay').classList.remove('show');
    popup.classList.remove('show');
}
function showNotification(message) {
    document.getElementById('notificationText').textContent = message;
    showPopup(elements.notificationModal);
}

// --- Добавить событие ---
function addEvent() {
    const eventName = elements.eventName.value.trim();
    if (!eventName) return showNotification('Пожалуйста, введите название события.');
    if (!selectedDate) return showNotification('Ошибка: дата не выбрана.');
    const newIndex = savedDates.length + 1;
    savedDates.push({ date: selectedDate.toISOString().split('T')[0], name: eventName, index: newIndex });
    hidePopup(elements.eventModal);
    renderCalendar();
    renderSavedDates();
    updateStatusInfo();
    updateSaveButton();
}

// --- Удалить дату ---
function removeDate(index) {
    savedDates = savedDates.filter(date => date.index !== index);
    savedDates.forEach((date, i) => { date.index = i + 1; });
    renderCalendar();
    renderSavedDates();
    updateStatusInfo();
    updateSaveButton();
}

// --- Рендер сохранённых дат ---
function renderSavedDates() {
    if (savedDates.length === 0) {
        elements.savedDates.style.display = 'none';
        return;
    }
    elements.savedDates.style.display = 'block';
    elements.datesList.innerHTML = '';
    savedDates.forEach(date => {
        const dateElement = document.createElement('div');
        dateElement.className = 'date-item';
        const dateObj = new Date(date.date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
        dateElement.innerHTML = `
            <div class="date-info">
                <div class="date-number">${formattedDate}</div>
                <div class="event-name">${date.name}</div>
            </div>
            <button class="remove-btn" onclick="removeDate(${date.index})">Удалить</button>
        `;
        elements.datesList.appendChild(dateElement);
    });
}

// --- Обновление кнопки сохранения ---
function updateSaveButton() {
    elements.saveBtn.disabled = !(savedDates.length > 0 && canModifyDates());
}

// --- Сохранение дат ---
async function saveDates() {
    try {
        const clientId = getClientId();
        if (!clientId) return showNotification('Не удалось получить ID пользователя');
        const currentYear = new Date().getFullYear();
        const data = {
            client_id: clientId,
            year: currentYear,
            last_saved_year: currentYear,
            sobitie_1: '', sobitie_2: '', sobitie_3: ''
        };
        savedDates.forEach((date, index) => {
            data[`sobitie_${index + 1}`] = JSON.stringify({ date: date.date, name: date.name });
        });
        elements.saveBtn.disabled = true;
        elements.saveBtn.querySelector('.btn-text').textContent = 'Сохраняем...';
        const response = await fetch('https://chatter.salebot.pro/api/318b69f1db777329490d1c7dba584c26/callback', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        elements.saveBtn.querySelector('.btn-text').textContent = 'Сохранить даты';
        elements.saveBtn.disabled = false;
        if (!response.ok) {
            const errorText = await response.text();
            return showNotification(`Ошибка сохранения данных: ${response.status} ${response.statusText}\n${errorText}`);
        }
        showNotification('Даты успешно сохранены!');
        setTimeout(() => { tg.close(); }, 2000);
    } catch (error) {
        elements.saveBtn.querySelector('.btn-text').textContent = 'Сохранить даты';
        elements.saveBtn.disabled = false;
        showNotification(`Ошибка сохранения данных: ${error.message}. Попробуйте еще раз.`);
    }
}

// --- События ---
function setupEventListeners() {
    elements.prevMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    elements.nextMonth.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });
    document.getElementById('closeEventModal').addEventListener('click', () => hidePopup(elements.eventModal));
    document.getElementById('cancelEvent').addEventListener('click', () => hidePopup(elements.eventModal));
    document.getElementById('addEvent').addEventListener('click', addEvent);
    document.getElementById('closeNotificationModal').addEventListener('click', () => hidePopup(elements.notificationModal));
    document.getElementById('okNotification').addEventListener('click', () => hidePopup(elements.notificationModal));
    elements.saveBtn.addEventListener('click', saveDates);
    elements.eventModal.addEventListener('click', (e) => { if (e.target === elements.eventModal) hidePopup(elements.eventModal); });
    elements.notificationModal.addEventListener('click', (e) => { if (e.target === elements.notificationModal) hidePopup(elements.notificationModal); });
    document.getElementById('modalOverlay').addEventListener('click', () => {
        hidePopup(elements.eventModal);
        hidePopup(elements.notificationModal);
    });
    elements.eventName.addEventListener('keypress', (e) => { if (e.key === 'Enter') addEvent(); });
}

// --- Инициализация приложения ---
async function initApp() {
    await loadUserVariables();
    renderCalendar();
    renderSavedDates();
    updateStatusInfo();
    updateSaveButton();
    setupEventListeners();
}
document.addEventListener('DOMContentLoaded', initApp);
