(function() {
    var NEWS_CONFIG = {
        API_URL: 'https://newsdata.io/api/1/latest',
        API_KEY: 'pub_b8b4e5f896f34647a54e0fa5ee5befb8',
        COUNTRY_BY: 'by',
        LANGUAGE: 'ru',
        NEWS_COUNT: 20,
        EXCLUDE_KEYWORDS: ['футбол', 'хоккей', 'баскетбол', 'теннис', 'football', 'hockey', 'olympic', 'чемпионат', 'матч', 'гол', 'лига чемпионов', 'премьер-лига']
    };

    function isExcluded(article) {
        var text = ((article.title || '') + ' ' + (article.description || '') + ' ' + (article.category || '')).toLowerCase();
        for (var i = 0; i < NEWS_CONFIG.EXCLUDE_KEYWORDS.length; i++) {
            if (text.indexOf(NEWS_CONFIG.EXCLUDE_KEYWORDS[i]) !== -1) return true;
        }
        return false;
    }

    function formatDate(dateStr) {
        var date = new Date(dateStr);
        var now = new Date();
        var diffMs = now - date;
        var diffMin = Math.floor(diffMs / 60000);

        if (diffMin < 5) return 'только что';
        if (diffMin < 60) return diffMin + ' мин. назад';

        var diffHours = Math.floor(diffMin / 60);
        if (diffHours < 24) return diffHours + ' ч. назад';

        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }

    async function fetchNews(country) {
        var params = new URLSearchParams({
            apikey: NEWS_CONFIG.API_KEY,
            language: NEWS_CONFIG.LANGUAGE
        });
        if (country) params.set('country', country);

        var url = NEWS_CONFIG.API_URL + '?' + params.toString();
        var response = await fetch(url);
        if (!response.ok) throw new Error('HTTP ' + response.status);

        var data = await response.json();
        if (data.status !== 'success') throw new Error(data.message || 'Ошибка API');
        return data.results || [];
    }

    async function loadNews() {
        try {
            var results = await fetchNews(NEWS_CONFIG.COUNTRY_BY);
            if (results.length === 0) {
                results = await fetchNews(null);
            }
        } catch (e) {
            results = await fetchNews(null);
        }

        var filtered = results.filter(function(article) {
            return !isExcluded(article);
        });

        var sorted = filtered.sort(function(a, b) {
            return (b.source_priority || 0) - (a.source_priority || 0);
        });

        var news = sorted.slice(0, NEWS_CONFIG.NEWS_COUNT);
        renderNews(news);
    }

    function renderNews(news) {
        var container = document.getElementById('news-feed-list');
        if (!container) return;

        if (!news || news.length === 0) {
            container.innerHTML = '<div class="news-feed-error"><small>Нет новостей</small></div>';
            return;
        }

        var html = '';
        for (var i = 0; i < news.length; i++) {
            var article = news[i];
            var link = article.link || '#';
            var title = article.title || 'Без заголовка';
            var desc = article.description || '';
            var source = article.source_id || 'Новости';
            var date = article.pubDate ? formatDate(article.pubDate) : '';

            html += '<a href="' + link + '" target="_blank" rel="noopener" class="news-feed-item-link">' +
                        '<div class="news-feed-item">' +
                            '<div class="news-feed-item-header">' +
                                '<span class="news-feed-badge">' + source + '</span>' +
                                '<span class="news-feed-date">' + date + '</span>' +
                            '</div>' +
                            '<h2 class="news-feed-item-title">' + title + '</h2>' +
                            (desc ? '<p class="news-feed-item-desc">' + desc + '</p>' : '') +
                        '</div>' +
                    '</a>';
        }

        container.innerHTML = html;
    }

    function showError(msg) {
        var container = document.getElementById('news-feed-list');
        if (container) {
            container.innerHTML = '<div class="news-feed-error"><small>' + msg + '</small></div>';
        }
    }

    loadNews().catch(function(err) {
        showError('Не удалось загрузить новости: ' + err.message);
    });
})();