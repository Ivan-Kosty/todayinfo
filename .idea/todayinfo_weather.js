/**
 * Модуль погоды для TodayInfo
 * Использует Open-Meteo API и геолокацию
 */

// ========== КОНФИГУРАЦИЯ ==========
const CONFIG = {
    GEO_TIMEOUT: 5000,        // Таймаут для геокодера (5 сек)
    LOCATION_TIMEOUT: 10000,  // Таймаут для определения местоположения (10 сек)
    UPDATE_INTERVAL: 600000,  // Интервал обновления (10 мин)
    WEATHER_API: 'https://api.open-meteo.com/v1/forecast',
    GEO_API: 'https://nominatim.openstreetmap.org/reverse'
};

// ========== СЛОВАРИ И КОНСТАНТЫ ==========
const WEATHER_CODES = {
    // Коды погоды WMO
    CLEAR_SKY: [0],
    MAINLY_CLEAR: [1],
    PARTLY_CLOUDY: [2],
    OVERCAST: [3],
    FOG: [45, 48],
    DRIZZLE: [51, 53, 55],
    FREEZING_DRIZZLE: [56, 57],
    RAIN: [61, 63, 65],
    FREEZING_RAIN: [66, 67],
    SNOW_FALL: [71, 73, 75],
    SNOW_GRAINS: [77],
    RAIN_SHOWERS: [80, 81, 82],
    SNOW_SHOWERS: [85, 86],
    THUNDERSTORM: [95, 96, 99]
};

const WEATHER_ICONS = {
    // Иконки для разных погодных условий (день/ночь)
    CLEAR_SKY: { day: '☀️', night: '🌙' },
    MAINLY_CLEAR: { day: '🌤️', night: '☁️🌙' },
    PARTLY_CLOUDY: '⛅',
    OVERCAST: '☁️',
    FOG: '🌫️',
    DRIZZLE: '🌦️',
    FREEZING_DRIZZLE: '🌨️',
    RAIN: '🌧️',
    FREEZING_RAIN: '🌨️',
    SNOW_FALL: '❄️',
    SNOW_GRAINS: '❄️',
    RAIN_SHOWERS: '🌧️',
    SNOW_SHOWERS: '❄️',
    THUNDERSTORM: '⛈️',
    DEFAULT: { day: '☁️', night: '☁️🌙' }
};

// ========== УТИЛИТЫ ==========
const WeatherUtils = {
    /**
     * Получить иконку погоды по коду
     * @param {number} code - WMO код погоды
     * @param {boolean} isDay - День или ночь
     * @returns {string} Иконка
     */
    getWeatherIcon(code, isDay) {
        if (WEATHER_CODES.CLEAR_SKY.includes(code)) {
            return isDay ? WEATHER_ICONS.CLEAR_SKY.day : WEATHER_ICONS.CLEAR_SKY.night;
        }
        if (WEATHER_CODES.MAINLY_CLEAR.includes(code)) {
            return isDay ? WEATHER_ICONS.MAINLY_CLEAR.day : WEATHER_ICONS.MAINLY_CLEAR.night;
        }
        if (WEATHER_CODES.PARTLY_CLOUDY.includes(code)) return WEATHER_ICONS.PARTLY_CLOUDY;
        if (WEATHER_CODES.OVERCAST.includes(code)) return WEATHER_ICONS.OVERCAST;
        if (WEATHER_CODES.FOG.some(c => WEATHER_CODES.FOG.includes(code))) return WEATHER_ICONS.FOG;
        if (WEATHER_CODES.DRIZZLE.some(c => WEATHER_CODES.DRIZZLE.includes(code))) return WEATHER_ICONS.DRIZZLE;
        if (WEATHER_CODES.FREEZING_DRIZZLE.some(c => WEATHER_CODES.FREEZING_DRIZZLE.includes(code))) return WEATHER_ICONS.FREEZING_DRIZZLE;
        if (WEATHER_CODES.RAIN.some(c => WEATHER_CODES.RAIN.includes(code))) return WEATHER_ICONS.RAIN;
        if (WEATHER_CODES.FREEZING_RAIN.some(c => WEATHER_CODES.FREEZING_RAIN.includes(code))) return WEATHER_ICONS.FREEZING_RAIN;
        if (WEATHER_CODES.SNOW_FALL.some(c => WEATHER_CODES.SNOW_FALL.includes(code))) return WEATHER_ICONS.SNOW_FALL;
        if (WEATHER_CODES.SNOW_GRAINS.includes(code)) return WEATHER_ICONS.SNOW_GRAINS;
        if (WEATHER_CODES.RAIN_SHOWERS.some(c => WEATHER_CODES.RAIN_SHOWERS.includes(code))) return WEATHER_ICONS.RAIN_SHOWERS;
        if (WEATHER_CODES.SNOW_SHOWERS.some(c => WEATHER_CODES.SNOW_SHOWERS.includes(code))) return WEATHER_ICONS.SNOW_SHOWERS;
        if (WEATHER_CODES.THUNDERSTORM.some(c => WEATHER_CODES.THUNDERSTORM.includes(code))) return WEATHER_ICONS.THUNDERSTORM;

        return isDay ? WEATHER_ICONS.DEFAULT.day : WEATHER_ICONS.DEFAULT.night;
    },

    /**
     * Форматировать сообщение об ошибке
     * @param {Error} error - Объект ошибки
     * @returns {string} Отформатированное сообщение
     */
    formatErrorMessage(error) {
        if (error.message.includes('геолокация') || error.code === 1) {
            return 'Доступ к геолокации запрещен';
        }
        if (error.code === 2) {
            return 'Не удалось определить местоположение';
        }
        if (error.code === 3) {
            return 'Превышено время ожидания';
        }
        if (error.message.includes('network') || error.message.includes('fetch')) {
            return 'Проверьте подключение к интернету';
        }
        return 'Не удалось загрузить погоду';
    }
};

// ========== API СЕРВИСЫ ==========
const WeatherAPI = {
    /**
     * Получить текущие координаты
     * @returns {Promise<{latitude: number, longitude: number}>}
     */
    async getCurrentPosition() {
        if (!navigator.geolocation) {
            throw new Error('Геолокация не поддерживается вашим браузером');
        }

        return new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: CONFIG.LOCATION_TIMEOUT,
                enableHighAccuracy: true,
                maximumAge: 0
            });
        });
    },

    /**
     * Получить название города по координатам
     * @param {number} lat - Широта
     * @param {number} lon - Долгота
     * @returns {Promise<string>} Название города
     */
    async getCityName(lat, lon) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), CONFIG.GEO_TIMEOUT);

            const response = await fetch(
                `${CONFIG.GEO_API}?lat=${lat}&lon=${lon}&format=json&accept-language=ru`,
                { signal: controller.signal }
            );

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();

            if (data?.address) {
                const addr = data.address;
                return addr.city || addr.town || addr.village ||
                    addr.state_district || addr.state || 'Ваше местоположение';
            }

            return 'Ваше местоположение';
        } catch (error) {
            console.warn('Геокодер:', error.message);
            return 'Ваше местоположение';
        }
    },

    /**
     * Получить данные о погоде
     * @param {number} lat - Широта
     * @param {number} lon - Долгота
     * @returns {Promise<Object>} Данные погоды
     */
    async getWeatherData(lat, lon) {
        const url = new URL(CONFIG.WEATHER_API);
        url.searchParams.append('latitude', lat);
        url.searchParams.append('longitude', lon);
        url.searchParams.append('current', 'temperature_2m,weather_code,is_day');
        url.searchParams.append('timezone', 'auto');

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.current) {
            throw new Error('Нет данных о погоде');
        }

        return data;
    }
};

// ========== UI КОМПОНЕНТЫ ==========
const WeatherUI = {
    /**
     * Обновить UI с данными погоды
     * @param {HTMLElement} container - Контейнер
     * @param {Object} data - Данные погоды
     */
    renderWeather(container, { city, temp, icon }) {
        container.innerHTML = `
            <div class="weather-content">
                <div class="weather-location">${this.escapeHTML(city)}</div>
                <div class="weather-icon">${icon}</div>
                <div class="weather-temp">${temp}°C</div>
                <div class="weather-desc">Сейчас</div>
            </div>
        `;
    },

    /**
     * Показать ошибку
     * @param {HTMLElement} container - Контейнер
     * @param {string} message - Сообщение об ошибке
     */
    renderError(container, message) {
        container.innerHTML = `
            <div class="weather-error">
                <div style="font-size: 40px; margin-bottom: 12px;">🌍</div>
                <div>${this.escapeHTML(message)}</div>
                <small>Пожалуйста, разрешите доступ к геолокации</small>
            </div>
        `;
    },

    /**
     * Экранирование HTML
     * @param {string} text - Текст
     * @returns {string} Безопасный текст
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ========== ОСНОВНАЯ ЛОГИКА ==========
class WeatherWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isUpdating = false;
    }

    /**
     * Инициализация виджета
     */
    async init() {
        if (!this.container) {
            console.error('❌ Элемент weather-info не найден');
            return;
        }

        await this.update();
        this.startAutoUpdate();
    }

    /**
     * Обновление данных
     */
    async update() {
        if (this.isUpdating) return;

        this.isUpdating = true;
        console.log('🔄 Обновление погоды...');

        try {
            // Получаем координаты
            const position = await WeatherAPI.getCurrentPosition();
            const { latitude, longitude } = position.coords;

            console.log(`📍 Координаты: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);

            // Параллельно получаем город и погоду
            const [city, weatherData] = await Promise.all([
                WeatherAPI.getCityName(latitude, longitude),
                WeatherAPI.getWeatherData(latitude, longitude)
            ]);

            const temp = Math.round(weatherData.current.temperature_2m);
            const weatherCode = weatherData.current.weather_code;
            const isDay = weatherData.current.is_day === 1;
            const icon = WeatherUtils.getWeatherIcon(weatherCode, isDay);

            console.log(`☁️ Погода: ${temp}°C, код: ${weatherCode}, день: ${isDay}`);
            console.log(`🏙️ Город: ${city}`);

            // Обновляем UI
            WeatherUI.renderWeather(this.container, { city, temp, icon });

        } catch (error) {
            console.error('❌ Ошибка:', error);
            const errorMessage = WeatherUtils.formatErrorMessage(error);
            WeatherUI.renderError(this.container, errorMessage);
        } finally {
            this.isUpdating = false;
        }
    }

    /**
     * Запуск автообновления
     */
    startAutoUpdate() {
        setInterval(() => {
            this.update();
        }, CONFIG.UPDATE_INTERVAL);
        console.log(`⏰ Автообновление каждые ${CONFIG.UPDATE_INTERVAL / 60000} минут`);
    }
}

// ========== ЗАПУСК ==========
// Создаем и инициализируем виджет при загрузке страницы
(function initWeatherWidget() {
    // Ждем загрузки DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            const widget = new WeatherWidget('weather-info');
            widget.init();
        });
    } else {
        const widget = new WeatherWidget('weather-info');
        widget.init();
    }
})();

// Экспорт для использования в других модулях
export { WeatherWidget, WeatherAPI, WeatherUtils };