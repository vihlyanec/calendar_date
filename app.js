// Инициализация Telegram Web App
let tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Глобальные переменные
let currentDate = new Date();
let selectedDate = null;
let savedDates = [];
let userVariables = {};
let lastSavedYear = null;

// Государственные праздники РФ (2025 год)
const holidays2025 = [
    '2025-01-01', // Новый год
    '2025-01-02', // Новый год (продолжение)
    '2025-01-03', // Новый год (продолжение)
    '2025-01-04', // Новый год (продолжение)
    '2025-01-05', // Новый год (продолжение)
    '2025-01-06', // Новый год (продолжение)
    '2025-01-07', // Рождество Христово
    '2025-01-08', // Новый год (продолжение)
    '2025-02-23', // День защитника Отечества
    '2025-03-08', // Международный женский день
    '2025-05-01', // Праздник Весны и Труда
    '2025-05-09', // День Победы
    '2025-06-12', // День России
    '2025-11-04', // День народного единства
];

// DOM элементы
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

// Инициализация приложения
async function initApp() {
    try {
        await loadUserVariables();
        renderCalendar();
        renderSavedDates();
        updateStatusInfo();
        updateSaveButton();
        setupEventListeners();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка загрузки данных. Попробуйте еще раз.');
    }
}

// Получение clientId только из параметра id в URL (и дефолт для теста)
function getClientId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || '546082827'; // дефолтный id для теста
}

// Загрузка переменных пользователя из бота
async function loadUserVariables() {
    try {
        const clientId = getClientId();
        const response = await fetch(`https://chatter.salebot.pro/api/318b69f1db777329490d1c7dba584c26/get_variables?client_id=${clientId}`);

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
                    savedDates.push({
                        date: parsed.date,
                        name: parsed.name,
                        index: i
                    });
                } catch (err) {
                    console.warn(`Ошибка парсинга ${key}`, err);
                }
            }
        }

        if (userVariables.last_saved_year) {
            lastSavedYear = parseInt(userVariables.last_saved_year);
        } else {
            lastSavedYear = null;
        }

    } catch (err) {
        console.error('Ошибка загрузки переменных:', err);
        userVariables = {};
        savedDates = [];
        lastSavedYear = null;
    }
}

// Проверка возможности изменения дат
function canModifyDates() {
    const currentYear = new Date().getFullYear();
    
    // Если даты еще не сохранялись, можно добавлять
    if (!lastSavedYear) {
        return true;
    }
    
    // Если текущий год больше года последнего сохранения, можно изменять
    return currentYear > lastSavedYear;
}

// Обновление информации о статусе
function updateStatusInfo() {
    const currentYear = new Date().getFullYear();
    const canModify = canModifyDates();
    
    if (!canModify) {
        elements.statusInfo.innerHTML = `
            <strong>Внимание!</strong> Даты можно изменять только раз в год. 
            Следующее изменение возможно в ${currentYear + 1} году.
        `;
        elements.statusInfo.style.color = '#dc3545';
        elements.statusInfo.style.background = '#f8d7da';
        elements.statusInfo.style.border = '1px solid #f5c6cb';
    } else if (savedDates.length >= 3) {
        elements.statusInfo.innerHTML = `
            <strong>Максимум дат достигнут!</strong> У вас уже выбрано 3 памятные даты.
        `;
        elements.statusInfo.style.color = '#856404';
        elements.statusInfo.style.background = '#fff3cd';
        elements.statusInfo.style.border = '1px solid #ffeaa7';
    } else {
        elements.statusInfo.innerHTML = `
            Выбрано дат: ${savedDates.length}/3. ${canModify ? 'Можно добавлять новые даты.' : ''}
        `;
        elements.statusInfo.style.color = '#155724';
        elements.statusInfo.style.background = '#d4edda';
        elements.statusInfo.style.border = '1px solid #c3e6cb';
    }
}

function renderCalendar() {
    // Безопасная инициализация даты
    const current = typeof currentDate !== 'undefined' ? currentDate : new Date();
    const year = current.getFullYear();
    const month = current.getMonth();

    // Массив названий месяцев
    const monthNames = [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];

    // Проверка наличия элементов в DOM
    if (!elements?.currentMonth || !elements?.calendarDays) {
        console.error('❌ Не найдены элементы currentMonth или calendarDays.');
        return;
    }

    // Заголовок месяца
    elements.currentMonth.textContent = `${monthNames[month]} ${year}`;

    // Очищаем предыдущий календарь
    elements.calendarDays.innerHTML = '';

    // Расчёт начальной и конечной даты
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Определяем, с какого дня начинать отображение (понедельник – начало недели)
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay(); // 0 — воскресенье, 1 — понедельник и т.д.
    const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate.setDate(startDate.getDate() + offset);

    // Рендерим 6 недель (42 дня)
    for (let i = 0; i < 42; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);

        const dateString = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
        const isCurrentMonth = date.getMonth() === month;

        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        dayElement.textContent = date.getDate();

        if (!isCurrentMonth) {
            dayElement.classList.add('other-month');
        } else if (Array.isArray(holidays2025) && holidays2025.includes(dateString)) {
            dayElement.classList.add('holiday');
        } else if (Array.isArray(savedDates) && savedDates.some(saved => {
            const d = new Date(saved.date);
            return d.getFullYear() === date.getFullYear()
                && d.getMonth() === date.getMonth()
                && d.getDate() === date.getDate();
        })) {
            dayElement.classList.add('saved');
        } else if (typeof canSelectDate === 'function' && !canSelectDate(date)) {
            dayElement.classList.add('disabled');
        } else {
            dayElement.classList.add('selectable');
            dayElement.addEventListener('click', () => {
                if (typeof selectDate === 'function') {
                    selectDate(date);
                } else {
                    console.warn('⚠️ Функция selectDate не определена');
                }
            });
        }

        elements.calendarDays.appendChild(dayElement);
    }
}

// Проверка возможности выбора даты
function canSelectDate(date) {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // Нельзя выбирать даты прошлых лет
    if (date.getFullYear() < currentYear) {
        return false;
    }
    
    // Нельзя выбирать даты прошлых месяцев текущего года
    if (date.getFullYear() === currentYear && date.getMonth() < today.getMonth()) {
        return false;
    }
    
    // Нельзя выбирать прошедшие дни текущего месяца
    if (date.getFullYear() === currentYear && 
        date.getMonth() === today.getMonth() && 
        date.getDate() < today.getDate()) {
        return false;
    }
    
    // Проверяем ограничение на 15 дней
    const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < 15) {
        return false;
    }
    
    return true;
}

// Выбор даты
function selectDate(date) {
    if (!canModifyDates()) {
        showNotification('Даты можно изменять только раз в год. Следующее изменение возможно в следующем году.');
        return;
    }
    
    if (savedDates.length >= 3) {
        showNotification('Достигнут максимум дат (3). Удалите одну из существующих дат, чтобы добавить новую.');
        return;
    }
    
    // Проверяем ограничение на 15 дней
    const today = new Date();
    const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
    if (daysDiff < 15) {
        showNotification('Нельзя добавлять даты, до которых меньше 15 дней.');
        return;
    }
    
    selectedDate = date;
    const dateString = date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    elements.selectedDateText.textContent = dateString;
    elements.eventName.value = '';
    showPopup(elements.eventModal);
}

// Показать попап
function showPopup(popup) {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('show');
    popup.classList.add('show');
}

// Скрыть попап
function hidePopup(popup) {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('show');
    popup.classList.remove('show');
}

// Показать уведомление
function showNotification(message) {
    document.getElementById('notificationText').textContent = message;
    showPopup(elements.notificationModal);
}

// Добавить событие
function addEvent() {
    const eventName = elements.eventName.value.trim();
    
    if (!eventName) {
        showNotification('Пожалуйста, введите название события.');
        return;
    }
    
    if (!selectedDate) {
        showNotification('Ошибка: дата не выбрана.');
        return;
    }
    
    // Добавляем новую дату
    const newIndex = savedDates.length + 1;
    savedDates.push({
        date: selectedDate.toISOString().split('T')[0],
        name: eventName,
        index: newIndex
    });
    
    hidePopup(elements.eventModal);
    renderCalendar();
    renderSavedDates();
    updateStatusInfo();
    updateSaveButton();
}

// Удалить дату
function removeDate(index) {
    savedDates = savedDates.filter(date => date.index !== index);
    
    // Переиндексируем оставшиеся даты
    savedDates.forEach((date, i) => {
        date.index = i + 1;
    });
    
    renderCalendar();
    renderSavedDates();
    updateStatusInfo();
    updateSaveButton();
}

// Рендер сохраненных дат
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
        const formattedDate = dateObj.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
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

// Обновление кнопки сохранения
function updateSaveButton() {
    const canSave = savedDates.length > 0 && canModifyDates();
    elements.saveBtn.disabled = !canSave;
}

// Сохранение дат
async function saveDates() {
    try {
        const clientId = getClientId();
        if (!clientId) {
            throw new Error('Не удалось получить ID пользователя');
        }
        
        // Подготавливаем данные для отправки
        const currentYear = new Date().getFullYear();
        const data = {
            client_id: clientId,
            year: currentYear,
            last_saved_year: currentYear,
            sobitie_1: '',
            sobitie_2: '',
            sobitie_3: ''
        };
        
        // Заполняем события
        savedDates.forEach((date, index) => {
            const eventData = JSON.stringify({
                date: date.date,
                name: date.name
            });
            data[`sobitie_${index + 1}`] = eventData;
        });
        
        console.log('Отправляем данные:', data);
        
        // Отправляем вебхук
        const response = await fetch('https://chatter.salebot.pro/api/318b69f1db777329490d1c7dba584c26/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        
        console.log('Ответ сервера:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ошибка сервера:', errorText);
            throw new Error(`Ошибка сохранения данных: ${response.status} ${response.statusText}`);
        }
        
        const responseData = await response.json();
        console.log('Данные ответа:', responseData);
        
        showNotification('Даты успешно сохранены!');
        
        // Закрываем приложение через 2 секунды
        setTimeout(() => {
            tg.close();
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification(`Ошибка сохранения данных: ${error.message}. Попробуйте еще раз.`);
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Навигация по месяцам
    elements.prevMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        renderCalendar();
    });
    
    elements.nextMonth.addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        renderCalendar();
    });
    
    // Попап добавления события
    document.getElementById('closeEventModal').addEventListener('click', () => {
        hidePopup(elements.eventModal);
    });
    
    document.getElementById('cancelEvent').addEventListener('click', () => {
        hidePopup(elements.eventModal);
    });
    
    document.getElementById('addEvent').addEventListener('click', addEvent);
    
    // Попап уведомлений
    document.getElementById('closeNotificationModal').addEventListener('click', () => {
        hidePopup(elements.notificationModal);
    });
    
    document.getElementById('okNotification').addEventListener('click', () => {
        hidePopup(elements.notificationModal);
    });
    
    // Кнопка сохранения
    elements.saveBtn.addEventListener('click', saveDates);
    
    // Закрытие попапов по клику вне их области
    elements.eventModal.addEventListener('click', (e) => {
        if (e.target === elements.eventModal) {
            hidePopup(elements.eventModal);
        }
    });
    
    elements.notificationModal.addEventListener('click', (e) => {
        if (e.target === elements.notificationModal) {
            hidePopup(elements.notificationModal);
        }
    });
    
    // Закрытие по клику на overlay
    document.getElementById('modalOverlay').addEventListener('click', () => {
        hidePopup(elements.eventModal);
        hidePopup(elements.notificationModal);
    });
    
    // Ввод в поле события по Enter
    elements.eventName.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            addEvent();
        }
    });
}

// Запуск приложения
document.addEventListener('DOMContentLoaded', initApp); 
