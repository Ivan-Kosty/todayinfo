const CURRENCY_CONFIG = {
    API_URL: 'https://v6.exchangerate-api.com/v6/fe6047248c94fd93ea2d5f78/latest/BYN',
    UPDATE_INTERVAL: 3600000
};

const CurrencyAPI = {
    async fetchRates() {
        try {
            const response = await fetch(CURRENCY_CONFIG.API_URL);

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error('Неверный API ключ');
                }
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();

            if (data.result === 'error') {
                throw new Error(data['error-type'] || 'Ошибка API');
            }

            if (!data.conversion_rates) {
                throw new Error('Нет данных о курсах');
            }

            return {
                base: data.base_code,
                date: data.time_last_update_utc,
                rates: data.conversion_rates
            };
        } catch (error) {
            console.error('Ошибка загрузки курсов:', error);
            throw error;
        }
    },

    getUSDRate(rates) {
        // rates.USD = сколько USD за 1 BYN → нужно 1 / rates.USD = сколько BYN за 1 USD
        if (rates.USD) {
            return 1 / rates.USD;
        }
        return null;
    },

    getEURRate(rates) {
        // rates.EUR = сколько EUR за 1 BYN → нужно 1 / rates.EUR = сколько BYN за 1 EUR
        if (rates.EUR) {
            return 1 / rates.EUR;
        }
        return null;
    },

    getRUBRate(rates) {
        // rates.RUB = сколько RUB за 1 BYN → 1 / rates.RUB = сколько BYN за 1 RUB
        if (rates.RUB) {
            return (1 / rates.RUB) * 100;
        }
        return null;
    },

    formatRate(rate) {
        const num = parseFloat(rate);
        if (isNaN(num)) return '0.00';
        return num.toFixed(2);
    }
};

const CurrencyUI = {
    renderRates: function(container, data) {
        let dateStr = '';
        if (data.date) {
            const date = new Date(data.date);
            dateStr = date.toLocaleDateString('ru-RU');
        } else {
            dateStr = new Date().toLocaleDateString('ru-RU');
        }

        const usdRate = CurrencyAPI.getUSDRate(data.rates);
        const eurRate = CurrencyAPI.getEURRate(data.rates);
        const rubRate = CurrencyAPI.getRUBRate(data.rates);

        let usdHtml = '';
        let eurHtml = '';
        let rubHtml = '';

        if (usdRate) {
            const formattedRate = CurrencyAPI.formatRate(usdRate);
            usdHtml = '<div class="currency-item">' +
                '<span class="currency-code">1 USD</span>' +
                '<span class="currency-dots"></span>' +
                '<span class="currency-rate">' + formattedRate + ' BYN</span>' +
                '</div>';
        }

        if (eurRate) {
            const formattedRate = CurrencyAPI.formatRate(eurRate);
            eurHtml = '<div class="currency-item">' +
                '<span class="currency-code">1 EUR</span>' +
                '<span class="currency-dots"></span>' +
                '<span class="currency-rate">' + formattedRate + ' BYN</span>' +
                '</div>';
        }

        if (rubRate) {
            const formattedRate = CurrencyAPI.formatRate(rubRate);
            rubHtml = '<div class="currency-item">' +
                '<span class="currency-code">100 RUB</span>' +
                '<span class="currency-dots"></span>' +
                '<span class="currency-rate">' + formattedRate + ' BYN</span>' +
                '</div>';
        }

        const html = '<div class="currency-header">' +
            '<div class="currency-base">Курсы валют</div>' +
            '</div>' +
            '<div class="currency-list">' + usdHtml + eurHtml + rubHtml + '</div>' +
            '<div class="currency-footer">' +
            '<small>Обновлено: ' + dateStr + '</small>' +
            '</div>';

        container.innerHTML = html;
    },

    renderError: function(container, error) {
        let errorMessage = 'Не удалось загрузить курсы валют';

        if (error.message && error.message.includes('ключ')) {
            errorMessage = 'Неверный API ключ';
        } else if (error.message && error.message.includes('HTTP 404')) {
            errorMessage = 'API недоступен';
        } else if (error.message && error.message.includes('fetch')) {
            errorMessage = 'Проверьте подключение к интернету';
        }

        container.innerHTML = '<div class="currency-error">' +
            '<div class="currency-error-icon">!</div>' +
            '<div class="currency-error-text">' + errorMessage + '</div>' +
            '<button class="currency-retry-btn" onclick="window.currencyWidget && window.currencyWidget.update()">Повторить</button>' +
            '</div>';
    },

    renderLoading: function(container) {
        container.innerHTML = '<div class="currency-loading">' +
            '<div class="loading-spinner-small"></div>' +
            '<span>Загрузка курсов...</span>' +
            '</div>';
    }
};

class CurrencyWidget {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.isUpdating = false;

        if (!this.container) {
            console.error('Элемент currency-info не найден');
            return;
        }

        this.init();
    }

    async init() {
        await this.update();
        this.startAutoUpdate();
    }

    async update() {
        if (this.isUpdating) return;

        this.isUpdating = true;
        CurrencyUI.renderLoading(this.container);

        try {
            const data = await CurrencyAPI.fetchRates();
            CurrencyUI.renderRates(this.container, data);
        } catch (error) {
            console.error('Ошибка курсов валют:', error);
            CurrencyUI.renderError(this.container, error);
        } finally {
            this.isUpdating = false;
        }
    }

    startAutoUpdate() {
        const self = this;
        setInterval(function() {
            self.update();
        }, CURRENCY_CONFIG.UPDATE_INTERVAL);
    }
}

(function initCurrencyWidget() {
    const init = function() {
        const widget = new CurrencyWidget('currency-info');
        window.currencyWidget = widget;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();