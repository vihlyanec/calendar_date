/**
 * Telegram Mini App - Цветочные напоминания
 * Основной JavaScript файл
 */

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();
tg.ready();

// Конфигурация
const CONFIG = {
    API_URLS: {
        GET_VARIABLES: 'https://chatter.salebot.pro/api/da37e22b33eb13cc4cabaa04dfe21df9/get_variables',
        SAVE_DATES: 'https://chatter.salebot.pro/api/318b69f1db777329490d1c7dba584c26/callback'
    },
    MAX_DATES: 3,
    MIN_DAYS_AHEAD: 15,
    HOLIDAYS_2025: [
        '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05',
        '2025-01-06', '2025-01-07', '2025-01-08', '2025-02-23', '2025-03-08',
        '2025-05-01', '2025-05-09', '2025-06-12', '2025-11-04'
    ],
    MONTH_NAMES: [
        'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
        'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ]
};

// Состояние приложения
class AppState {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.savedDates = [];
        this.userVariables = {};
        this.lastSavedYear = null;
        this.isLoading = false;
    }

    reset() {
        this.selectedDate = null;
        this.savedDates = [];
        this.userVariables = {};
        this.lastSavedYear = null;
    }
}

// Основной класс приложения
class FlowerRemindersApp {
    constructor() {
        this.state = new AppState();
        this.elements = this.initializeElements();
        this.bindEvents();
    }

    // Инициализация DOM элементов
    initializeElements() {
        return {
            // Календарь
            currentMonth: document.getElementById('currentMonth'),
            calendarDays: document.getElementById('calendarDays'),
            prevMonth: document.getElementById('prevMonth'),
            nextMonth: document.getElementById('nextMonth'),
            
            // Информация
            infoPanel: document.getElementById('infoPanel'),
            infoContent: document.getElementById('infoContent'),
            
            // Сохраненные даты
            savedDatesSection: document.getElementById('savedDatesSection'),
            datesList: document.getElementById('datesList'),
            
            // Кнопки
            saveBtn: document.getElementById('saveBtn'),
            
            // Модальные окна
            modalOverlay: document.getElementById('modalOverlay'),
            eventModal: document.getElementById('eventModal'),
            notificationModal: document.getElementById('notificationModal'),
            
            // Формы
            selectedDateText: document.getElementById('selectedDateText'),
            eventName: document.getElementById('eventName'),
            notificationText: document.getElementById('notificationText')
        };
    }

    // Привязка событий
    bindEvents() {
        // Навигация календаря
        this.elements.prevMonth.addEventListener('click', () => this.navigateMonth(-1));
        this.elements.nextMonth.addEventListener('click', () => this.navigateMonth(1));
        
        // Модальные окна
        this.elements.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.elements.modalOverlay) {
                this.hideAllModals();
            }
        });
        
        // События
        document.getElementById('closeEventModal').addEventListener('click', () => this.hideModal('eventModal'));
        document.getElementById('cancelEvent').addEventListener('click', () => this.hideModal('eventModal'));
        document.getElementById('addEvent').addEventListener('click', () => this.addEvent());
        
        // Уведомления
        document.getElementById('closeNotificationModal').addEventListener('click', () => this.hideModal('notificationModal'));
        document.getElementById('okNotification').addEventListener('click', () => this.hideModal('notificationModal'));
        
        // Сохранение
        this.elements.saveBtn.addEventListener('click', () => this.saveDates());
        
        // Ввод в поле события
        this.elements.eventName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addEvent();
            }
        });
    }

    // Инициализация приложения
    async init() {
        try {
            this.showLoading();
            await this.loadUserVariables();
            this.renderCalendar();
            this.renderSavedDates();
            this.updateInfoPanel();
            this.updateSaveButton();
            this.hideLoading();
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showNotification('Ошибка загрузки данных. Попробуйте еще раз.', 'error');
            this.hideLoading();
        }
    }

    // Загрузка переменных пользователя
    async loadUserVariables() {
        const clientId = tg.initDataUnsafe?.user?.id || tg.initDataUnsafe?.query_id;
        if (!clientId) {
            throw new Error('Не удалось получить ID пользователя');
        }

        const response = await fetch(`${CONFIG.API_URLS.GET_VARIABLES}?client_id=${clientId}`);
        
        if (!response.ok) {
            throw new Error('Ошибка получения данных от сервера');
        }

        const data = await response.json();
        this.state.userVariables = data.variables || {};
        
        // Проверяем, есть ли сохраненные даты (первый вход пользователя)
        const hasSavedDates = Object.keys(this.state.userVariables).some(key => 
            key.startsWith('sobitie_') && this.state.userVariables[key]
        );
        
        if (!hasSavedDates) {
            // Первый вход пользователя - сбрасываем состояние
            this.state.savedDates = [];
            this.state.lastSavedYear = null;
            console.log('Первый вход пользователя - нет сохраненных дат');
        } else {
            // Парсим сохраненные даты
            this.state.savedDates = [];
            for (let i = 1; i <= CONFIG.MAX_DATES; i++) {
                const eventKey = `sobitie_${i}`;
                if (this.state.userVariables[eventKey]) {
                    try {
                        const eventData = JSON.parse(this.state.userVariables[eventKey]);
                        this.state.savedDates.push({
                            date: eventData.date,
                            name: eventData.name,
                            index: i
                        });
                    } catch (e) {
                        console.warn(`Ошибка парсинга события ${i}:`, e);
                    }
                }
            }

            // Получаем год последнего сохранения
            if (this.state.userVariables.last_saved_year) {
                this.state.lastSavedYear = parseInt(this.state.userVariables.last_saved_year);
            }
        }
    }

    // Проверка возможности изменения дат
    canModifyDates() {
        const currentYear = new Date().getFullYear();
        
        if (!this.state.lastSavedYear) {
            return true;
        }
        
        return currentYear > this.state.lastSavedYear;
    }

    // Обновление информационной панели
    updateInfoPanel() {
        const currentYear = new Date().getFullYear();
        const canModify = this.canModifyDates();
        const isFirstEntry = this.state.savedDates.length === 0 && !this.state.lastSavedYear;
        
        let message, type;
        
        if (isFirstEntry) {
            message = `Добро пожаловать! Выберите до ${CONFIG.MAX_DATES} памятных дат для напоминаний о цветах.`;
            type = 'success';
        } else if (!canModify) {
            message = `Внимание! Даты можно изменять только раз в год. Следующее изменение возможно в ${currentYear + 1} году.`;
            type = 'error';
        } else if (this.state.savedDates.length >= CONFIG.MAX_DATES) {
            message = 'Максимум дат достигнут! У вас уже выбрано 3 памятные даты.';
            type = 'warning';
        } else {
            message = `Выбрано дат: ${this.state.savedDates.length}/${CONFIG.MAX_DATES}. Можно добавлять новые даты.`;
            type = 'success';
        }
        
        this.elements.infoContent.textContent = message;
        this.elements.infoContent.className = `info-content ${type}`;
        this.elements.infoPanel.style.display = 'block';
    }

    // Рендер календаря
    renderCalendar() {
        const year = this.state.currentDate.getFullYear();
        const month = this.state.currentDate.getMonth();
        
        // Обновляем заголовок
        this.elements.currentMonth.textContent = `${CONFIG.MONTH_NAMES[month]} ${year}`;
        
        // Очищаем календарь
        this.elements.calendarDays.innerHTML = '';
        
        // Получаем первый день месяца и количество дней
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay() + (firstDay.getDay() === 0 ? -6 : 1));
        
        // Создаем дни календаря
        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'day';
            dayElement.textContent = date.getDate();
            
            // Проверяем, является ли день текущего месяца
            if (date.getMonth() !== month) {
                dayElement.classList.add('other-month');
            } else {
                // Проверяем, является ли праздником
                const dateString = date.toISOString().split('T')[0];
                if (CONFIG.HOLIDAYS_2025.includes(dateString)) {
                    dayElement.classList.add('holiday');
                    // Праздники недоступны для выбора
                    dayElement.classList.add('disabled');
                } else {
                    // Проверяем, является ли сохраненной датой
                    const isSaved = this.state.savedDates.some(saved => {
                        const savedDate = new Date(saved.date);
                        return savedDate.getDate() === date.getDate() && 
                               savedDate.getMonth() === date.getMonth() && 
                               savedDate.getFullYear() === date.getFullYear();
                    });
                    
                    if (isSaved) {
                        dayElement.classList.add('saved');
                    } else {
                        // Проверяем, можно ли выбрать дату
                        const canSelect = this.canSelectDate(date);
                        if (!canSelect) {
                            dayElement.classList.add('disabled');
                        } else {
                            dayElement.addEventListener('click', () => this.selectDate(date));
                        }
                    }
                }
            }
            
            this.elements.calendarDays.appendChild(dayElement);
        }
    }

    // Проверка возможности выбора даты
    canSelectDate(date) {
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
        if (daysDiff < CONFIG.MIN_DAYS_AHEAD) {
            return false;
        }
        
        return true;
    }

    // Выбор даты
    selectDate(date) {
        if (!this.canModifyDates()) {
            this.showNotification('Даты можно изменять только раз в год. Следующее изменение возможно в следующем году.', 'error');
            return;
        }
        
        if (this.state.savedDates.length >= CONFIG.MAX_DATES) {
            this.showNotification('Достигнут максимум дат (3). Удалите одну из существующих дат, чтобы добавить новую.', 'warning');
            return;
        }
        
        // Дополнительная проверка на праздники
        const dateString = date.toISOString().split('T')[0];
        if (CONFIG.HOLIDAYS_2025.includes(dateString)) {
            this.showNotification('Государственные праздники недоступны для выбора.', 'warning');
            return;
        }
        
        // Проверяем ограничение на 15 дней
        const today = new Date();
        const daysDiff = Math.ceil((date - today) / (1000 * 60 * 60 * 24));
        if (daysDiff < CONFIG.MIN_DAYS_AHEAD) {
            this.showNotification('Нельзя добавлять даты, до которых меньше 15 дней.', 'warning');
            return;
        }
        
        this.state.selectedDate = date;
        const formattedDate = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        this.elements.selectedDateText.textContent = formattedDate;
        this.elements.eventName.value = '';
        this.showModal('eventModal');
    }

    // Навигация по месяцам
    navigateMonth(direction) {
        this.state.currentDate.setMonth(this.state.currentDate.getMonth() + direction);
        this.renderCalendar();
    }

    // Добавление события
    addEvent() {
        const eventName = this.elements.eventName.value.trim();
        
        if (!eventName) {
            this.showNotification('Пожалуйста, введите название события.', 'warning');
            return;
        }
        
        if (!this.state.selectedDate) {
            this.showNotification('Ошибка: дата не выбрана.', 'error');
            return;
        }
        
        // Добавляем новую дату
        const newIndex = this.state.savedDates.length + 1;
        this.state.savedDates.push({
            date: this.state.selectedDate.toISOString().split('T')[0],
            name: eventName,
            index: newIndex
        });
        
        this.hideModal('eventModal');
        this.renderCalendar();
        this.renderSavedDates();
        this.updateInfoPanel();
        this.updateSaveButton();
    }

    // Удаление даты
    removeDate(index) {
        this.state.savedDates = this.state.savedDates.filter(date => date.index !== index);
        
        // Переиндексируем оставшиеся даты
        this.state.savedDates.forEach((date, i) => {
            date.index = i + 1;
        });
        
        this.renderCalendar();
        this.renderSavedDates();
        this.updateInfoPanel();
        this.updateSaveButton();
    }

    // Рендер сохраненных дат
    renderSavedDates() {
        if (this.state.savedDates.length === 0) {
            this.elements.savedDatesSection.style.display = 'none';
            return;
        }
        
        this.elements.savedDatesSection.style.display = 'block';
        this.elements.datesList.innerHTML = '';
        
        this.state.savedDates.forEach(date => {
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
                <button class="remove-btn" onclick="app.removeDate(${date.index})">Удалить</button>
            `;
            
            this.elements.datesList.appendChild(dateElement);
        });
    }

    // Обновление кнопки сохранения
    updateSaveButton() {
        const canSave = this.state.savedDates.length > 0 && this.canModifyDates();
        this.elements.saveBtn.disabled = !canSave;
    }

    // Сохранение дат
    async saveDates() {
        if (this.state.isLoading) return;
        
        try {
            this.state.isLoading = true;
            this.elements.saveBtn.disabled = true;
            
            const clientId = tg.initDataUnsafe?.user?.id || tg.initDataUnsafe?.query_id;
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
            this.state.savedDates.forEach((date, index) => {
                const eventData = JSON.stringify({
                    date: date.date,
                    name: date.name
                });
                data[`sobitie_${index + 1}`] = eventData;
            });
            
            console.log('Отправляем данные:', data);
            
            // Отправляем вебхук
            const response = await fetch(CONFIG.API_URLS.SAVE_DATES, {
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
            
            this.showNotification('Даты успешно сохранены!', 'success');
            
            // Закрываем приложение через 2 секунды
            setTimeout(() => {
                tg.close();
            }, 2000);
            
        } catch (error) {
            console.error('Ошибка сохранения:', error);
            this.showNotification(`Ошибка сохранения данных: ${error.message}. Попробуйте еще раз.`, 'error');
        } finally {
            this.state.isLoading = false;
            this.updateSaveButton();
        }
    }

    // Показать модальное окно
    showModal(modalId) {
        this.elements.modalOverlay.classList.add('show');
        document.getElementById(modalId).classList.add('show');
    }

    // Скрыть модальное окно
    hideModal(modalId) {
        document.getElementById(modalId).classList.remove('show');
        this.elements.modalOverlay.classList.remove('show');
    }

    // Скрыть все модальные окна
    hideAllModals() {
        this.elements.modalOverlay.classList.remove('show');
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    // Показать уведомление
    showNotification(message, type = 'info') {
        this.elements.notificationText.textContent = message;
        this.showModal('notificationModal');
    }

    // Показать загрузку
    showLoading() {
        this.elements.saveBtn.disabled = true;
        this.elements.saveBtn.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">Загрузка...</span>';
    }

    // Скрыть загрузку
    hideLoading() {
        this.updateSaveButton();
    }
}

// Глобальная переменная для доступа к приложению
let app;

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
    app = new FlowerRemindersApp();
    app.init();
}); 
