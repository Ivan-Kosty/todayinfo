const NEWS_CONFIG = {
    API_URL: 'https://newsdata.io/api/1/latest',
    API_KEY: 'pub_b8b4e5f896f34647a54e0fa5ee5befb8',
    COUNTRY_BY: 'by',
    LANGUAGE: 'ru',
    NEWS_COUNT: 2,
    FETCH_COUNT: 20,
    UPDATE_INTERVAL: 600000,
    EXCLUDE_KEYWORDS: ['футбол', 'хоккей', 'баскетбол', 'теннис', 'football', 'hockey', 'olympic', 'чемпионат', 'матч', 'гол', 'лига чемпионов', 'премьер-лига']
    //отключил по причине того что новостей со спортом слишком много и они интересны не для всех
};

const NewsAPI = {
    async fetchNews(country) {
        const params = new URLSearchParams({
            apikey: NEWS_CONFIG.API_KEY,
            language: NEWS_CONFIG.LANGUAGE
        });

        if (country) {
            params.set('country', country);
        }

        const url = NEWS_CONFIG.API_URL + '?' + params.toString();
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const data = await response.json();

        if (data.status !== 'success') {
            throw new Error(data.message || 'Ошибка API');
        }

        return data.results || [];
    },

    isExcluded(article) {
        var text = ((article.title || '') + ' ' + (article.description || '') + ' ' + (article.category || '')).toLowerCase();
        for (var i = 0; i < NEWS_CONFIG.EXCLUDE_KEYWORDS.length; i++) {
            if (text.indexOf(NEWS_CONFIG.EXCLUDE_KEYWORDS[i]) !== -1) {
                return true;
            }
        }
        return false;
    },

    async fetchBelarusNews() {
        return this.fetchNews(NEWS_CONFIG.COUNTRY_BY);
    },

    async fetchGeneralNews() {
        return this.fetchNews(null);
    },

    async fetchWithFallback() {
        try {
            var byNews = await this.fetchBelarusNews();
            if (byNews.length > 0) {
                return { news: byNews, source: 'belarus' };
            }
        } catch (e) {
            console.warn('Не удалось загрузить новости Беларуси:', e);
        }

        var generalNews = await this.fetchGeneralNews();
        return { news: generalNews, source: 'general' };
    },

    getTopNews(count) {
        var self = this;
        return this.fetchWithFallback().then(function(result) {
            var filtered = result.news.filter(function(article) {
                return !self.isExcluded(article);
            });

            var sorted = filtered.sort(function(a, b) {
                return (b.source_priority || 0) - (a.source_priority || 0);
            });

            return {
                news: sorted.slice(0, count).map(function(article) {
                    return {
                        title: article.title || 'Без заголовка',
                        description: article.description || '',
                        link: article.link || '#',
                        image: article.image_url || null,
                        date: article.pubDate ? new Date(article.pubDate) : new Date(),
                        source: article.source_id || ''
                    };
                }),
                source: result.source
            };
        });
    }
};

const NewsUI = {
    formatDate(date) {
        var now = new Date();
        var diffMs = now - date;
        var diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 5) return 'только что';
        if (diffMin < 60) return diffMin + ' мин. назад';

        var diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return diffHours + ' ч. назад';

        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short'
        });
    },

    renderSingleNews(containerId, article, index, source) {
        var container = document.getElementById(containerId);
        if (!container) return;

        var sourceLabel = source === 'belarus' ? '🇧🇾 Беларусь' : 'Мировые новости';

        var imageHtml = article.image
            ? '<img class="news-image" src="' + article.image + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">'
            : '<div class="news-image-placeholder"></div>';

        var descHtml = article.description
            ? '<span class="news-desc">' + article.description + '</span>'
            : '';

        container.innerHTML = '<div class="news-single">' +
            '<div class="news-single-header">' +
            '<span class="news-badge">' + sourceLabel + '</span>' +
            '<button class="news-refresh" onclick="window.newsWidget && window.newsWidget.update()" title="Обновить">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
            '<polyline points="23 4 23 10 17 10"></polyline>' +
            '<polyline points="1 20 1 14 7 14"></polyline>' +
            '<path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>' +
            '</svg>' +
            '</button>' +
            '</div>' +
            '<a class="news-single-content" href="' + article.link + '" target="_blank" rel="noopener">' +
            imageHtml +
            '<span class="news-single-title">' + article.title + '</span>' +
            descHtml +
            '<div class="news-single-meta">' +
            '<span class="news-date">' + this.formatDate(article.date) + '</span>' +
            (article.source ? '<span class="news-source-name">' + article.source + '</span>' : '') +
            '</div>' +
            '</a>' +
            '</div>';
    },

    renderLoading(container) {
        container.innerHTML = '<div class="news-loading">' +
            '<div class="loading-spinner-small"></div>' +
            '<span>Загрузка новостей...</span>' +
            '</div>';
    },

    renderError(container, error) {
        var message = 'Не удалось загрузить новости';

        if (error.message && error.message.includes('API')) {
            message = 'API ключ не указан или неверный';
        } else if (error.message && error.message.includes('fetch')) {
            message = 'Проверьте подключение к интернету';
        }

        container.innerHTML = '<div class="news-error">' +
            '<div class="news-error-icon">!</div>' +
            '<div class="news-error-text">' + message + '</div>' +
            '<button class="news-retry-btn" onclick="window.newsWidget && window.newsWidget.update()">Повторить</button>' +
            '</div>';
    }
};

class NewsWidget {
    constructor() {
        this.containers = ['news-info-1', 'news-info-2'];
        this.isUpdating = false;
    }

    async init() {
        await this.update();
        this.startAutoUpdate();
    }

    async update() {
        if (this.isUpdating) return;

        this.isUpdating = true;

        var self = this;
        this.containers.forEach(function(id) {
            var container = document.getElementById(id);
            if (container) NewsUI.renderLoading(container);
        });

        try {
            var result = await NewsAPI.getTopNews(NEWS_CONFIG.NEWS_COUNT);

            result.news.forEach(function(article, index) {
                var containerId = self.containers[index];
                if (containerId) {
                    NewsUI.renderSingleNews(containerId, article, index, result.source);
                }
            });
        } catch (error) {
            console.error('Ошибка загрузки новостей:', error);
            this.containers.forEach(function(id) {
                var container = document.getElementById(id);
                if (container) NewsUI.renderError(container, error);
            });
        } finally {
            this.isUpdating = false;
        }
    }

    startAutoUpdate() {
        var self = this;
        setInterval(function() {
            self.update();
        }, NEWS_CONFIG.UPDATE_INTERVAL);
    }
}

(function initNewsWidget() {
    var init = function() {
        var widget = new NewsWidget();
        widget.init();
        window.newsWidget = widget;
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();