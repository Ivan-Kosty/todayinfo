(function() {
    var THEME_KEY = 'ti-theme';

    function getPreferredTheme() {
        return localStorage.getItem(THEME_KEY) || 'light';
    }

    function setTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        localStorage.setItem(THEME_KEY, theme);
    }

    function toggleTheme() {
        var current = getPreferredTheme();
        var next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
    }

    function initThemeButton() {
        var btn = document.getElementById('theme-toggle');
        if (!btn) return;
        btn.addEventListener('click', toggleTheme);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initThemeButton);
    } else {
        initThemeButton();
    }
})();