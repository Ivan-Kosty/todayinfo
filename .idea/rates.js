const CONVERTER_CONFIG = {
    API_KEY: 'fe6047248c94fd93ea2d5f78',
    API_BASE: 'https://v6.exchangerate-api.com/v6',
    UPDATE_INTERVAL: 3600000
};

const POPULAR_CURRENCIES = ['USD', 'EUR', 'RUB', 'BYN', 'GBP', 'CNY', 'PLN', 'UAH', 'KZT', 'TRY', 'JPY', 'CHF'];

let allRates = null;

const CurrencyConverter = {
    async fetchRates() {
        try {
            const apiUrl = `${CONVERTER_CONFIG.API_BASE}/${CONVERTER_CONFIG.API_KEY}/latest/USD`;
            const response = await fetch(apiUrl);

            if (!response.ok) {
                throw new Error('HTTP ' + response.status);
            }

            const data = await response.json();

            if (data.result === 'error') {
                throw new Error(data['error-type'] || 'Ошибка API');
            }

            if (!data.conversion_rates) {
                throw new Error('Нет данных о курсах');
            }

            allRates = data.conversion_rates;

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

    convert(fromCurrency, toCurrency, amount) {
        if (!allRates) return null;

        const fromRate = allRates[fromCurrency];
        const toRate = allRates[toCurrency];

        if (!fromRate || !toRate) return null;

        return amount * (toRate / fromRate);
    },

    getRateInfo(fromCurrency, toCurrency) {
        if (!allRates) return null;

        const fromRate = allRates[fromCurrency];
        const toRate = allRates[toCurrency];

        if (!fromRate || !toRate) return null;

        return toRate / fromRate;
    }
};

const ConverterUI = {
    renderConverter(container, data) {
        const optionsHtml = POPULAR_CURRENCIES.map(code =>
            `<option value="${code}">${code}</option>`
        ).join('');

        container.innerHTML = `
            <div class="converter-card">
                <div class="converter-row">
                    <div class="converter-side">
                        <select id="from-currency" class="converter-select">${optionsHtml}</select>
                        <input type="text" id="from-amount" class="converter-input" placeholder="0" value="1" inputmode="decimal" autocomplete="off">
                    </div>
                    <button id="swap-btn" class="swap-btn" title="Поменять местами">⇄</button>
                    <div class="converter-side">
                        <select id="to-currency" class="converter-select">${optionsHtml}</select>
                        <input type="text" id="to-amount" class="converter-input converter-input-result" placeholder="0" readonly>
                    </div>
                </div>
                <div class="converter-rate-info" id="rate-info"></div>
                <div class="converter-footer">
                    <small>Обновлено: ${new Date(data.date).toLocaleDateString('ru-RU')}</small>
                </div>
            </div>
        `;

        document.getElementById('from-currency').value = 'USD';
        document.getElementById('to-currency').value = 'BYN';

        this.updateCurrencyOptions();
        this.bindEvents();
        this.calculate();
    },

    updateCurrencyOptions() {
        const fromCurrency = document.getElementById('from-currency');
        const toCurrency = document.getElementById('to-currency');

        const fromVal = fromCurrency.value;
        const toVal = toCurrency.value;

        // Обновляем опции to: исключаем fromVal
        toCurrency.innerHTML = POPULAR_CURRENCIES
            .filter(code => code !== fromVal)
            .map(code => `<option value="${code}">${code}</option>`)
            .join('');

        // Обновляем опции from: исключаем toVal
        fromCurrency.innerHTML = POPULAR_CURRENCIES
            .filter(code => code !== toVal)
            .map(code => `<option value="${code}">${code}</option>`)
            .join('');

        // Восстанавливаем выбранные значения
        fromCurrency.value = fromVal;
        toCurrency.value = toVal;
    },

    bindEvents() {
        const fromAmount = document.getElementById('from-amount');
        const fromCurrency = document.getElementById('from-currency');
        const toCurrency = document.getElementById('to-currency');
        const swapBtn = document.getElementById('swap-btn');

        // Блокировка не-числовых символов
        fromAmount.addEventListener('keydown', (e) => {
            const allowed = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', '.'];
            if (e.ctrlKey || e.metaKey) return; // разрешаем Ctrl+A, Ctrl+C и т.д.
            if (allowed.includes(e.key)) return;
            if (!/^[0-9]$/.test(e.key)) {
                e.preventDefault();
            }
        });

        fromAmount.addEventListener('input', () => {
            // Убираем всё кроме цифр и точки
            fromAmount.value = fromAmount.value.replace(/[^0-9.]/g, '');
            // Только одна точка
            const parts = fromAmount.value.split('.');
            if (parts.length > 2) {
                fromAmount.value = parts[0] + '.' + parts.slice(1).join('');
            }
            this.calculate();
        });

        fromCurrency.addEventListener('change', () => {
            this.updateCurrencyOptions();
            this.calculate();
        });
        toCurrency.addEventListener('change', () => this.calculate());
        swapBtn.addEventListener('click', () => this.swap());
    },

    calculate() {
        const fromAmount = document.getElementById('from-amount');
        const toAmount = document.getElementById('to-amount');
        const fromCurrency = document.getElementById('from-currency');
        const toCurrency = document.getElementById('to-currency');
        const rateInfo = document.getElementById('rate-info');

        const amount = parseFloat(fromAmount.value) || 0;
        const from = fromCurrency.value;
        const to = toCurrency.value;

        const result = CurrencyConverter.convert(from, to, amount);
        const rate = CurrencyConverter.getRateInfo(from, to);

        if (result !== null) {
            toAmount.value = this.formatNumber(result);
        } else {
            toAmount.value = '';
        }

        if (rate) {
            rateInfo.textContent = `1 ${from} = ${this.formatNumber(rate)} ${to}`;
        } else {
            rateInfo.textContent = '';
        }
    },

    swap() {
        const fromCurrency = document.getElementById('from-currency');
        const toCurrency = document.getElementById('to-currency');
        const fromAmount = document.getElementById('from-amount');
        const toAmount = document.getElementById('to-amount');

        const tempCurrency = fromCurrency.value;
        fromCurrency.value = toCurrency.value;
        toCurrency.value = tempCurrency;

        if (toAmount.value) {
            fromAmount.value = toAmount.value;
        }

        this.updateCurrencyOptions();
        this.calculate();
    },

    formatNumber(num) {
        const n = parseFloat(num);
        if (isNaN(n)) return '0';
        if (n >= 1) {
            return n.toFixed(4).replace(/\.?0+$/, '');
        }
        return n.toFixed(6).replace(/\.?0+$/, '');
    },

    renderError(container, error) {
        let errorMessage = 'Не удалось загрузить курсы валют';

        if (error.message && error.message.includes('HTTP 404')) {
            errorMessage = 'API недоступен';
        } else if (error.message && error.message.includes('fetch')) {
            errorMessage = 'Проверьте подключение к интернету';
        }

        container.innerHTML = `
            <div class="currency-error">
                <div class="currency-error-icon">!</div>
                <div class="currency-error-text">${errorMessage}</div>
                <button class="currency-retry-btn" onclick="window.currencyWidget && window.currencyWidget.update()">Повторить</button>
            </div>
        `;
    },

    renderLoading(container) {
        container.innerHTML = `
            <div class="currency-loading">
                <div class="loading-spinner-small"></div>
                <span>Загрузка курсов...</span>
            </div>
        `;
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
        ConverterUI.renderLoading(this.container);

        try {
            const data = await CurrencyConverter.fetchRates();
            ConverterUI.renderConverter(this.container, data);
        } catch (error) {
            console.error('Ошибка курсов валют:', error);
            ConverterUI.renderError(this.container, error);
        } finally {
            this.isUpdating = false;
        }
    }

    startAutoUpdate() {
        const self = this;
        setInterval(function() {
            self.update();
        }, CONVERTER_CONFIG.UPDATE_INTERVAL);
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
