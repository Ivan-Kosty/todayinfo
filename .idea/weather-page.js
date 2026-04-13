(function() {
    var LAYER_URLS = {
        radar: 'https://embed.windy.com/embed2.html?lat=53.9&lon=27.57&detailLat=53.9&detailLon=27.57&width=650&height=450&zoom=6&level=surface&overlay=radar&product=radar&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&metricWindDefault=kt&temp=none&detail=true',
        clouds: 'https://embed.windy.com/embed2.html?lat=53.9&lon=27.57&detailLat=53.9&detailLon=27.57&width=650&height=450&zoom=6&level=surface&overlay=clouds&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&metricWindDefault=kt&temp=none&detail=true',
        temp: 'https://embed.windy.com/embed2.html?lat=53.9&lon=27.57&detailLat=53.9&detailLon=27.57&width=650&height=450&zoom=6&level=surface&overlay=temp&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&metricWindDefault=kt&temp=none&detail=true',
        wind: 'https://embed.windy.com/embed2.html?lat=53.9&lon=27.57&detailLat=53.9&detailLon=27.57&width=650&height=450&zoom=6&level=surface&overlay=wind&product=ecmwf&menu=&message=true&marker=&calendar=now&pressure=&type=map&location=coordinates&metricWindDefault=kt&temp=none&detail=true'
    };

    function updateMapLayer(layer, lat, lon) {
        var iframe = document.getElementById('weather-map');
        if (!iframe) return;
        var url = LAYER_URLS[layer];
        if (lat && lon) {
            url = url.replace(/lat=53\.9/g, 'lat=' + lat.toFixed(2))
                     .replace(/lon=27\.57/g, 'lon=' + lon.toFixed(2))
                     .replace(/detailLat=53\.9/g, 'detailLat=' + lat.toFixed(2))
                     .replace(/detailLon=27\.57/g, 'detailLon=' + lon.toFixed(2));
        }
        iframe.src = url;
    }

    // Переключение слоёв
    var layerButtons = document.querySelectorAll('.layer-btn');
    layerButtons.forEach(function(btn) {
        btn.addEventListener('click', function() {
            layerButtons.forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            updateMapLayer(btn.getAttribute('data-layer'));
            // Обновляем и полноэкранный iframe если открыт
            var fullscreenIframe = document.getElementById('weather-map-fullscreen');
            if (fullscreenIframe && fullscreenIframe.src) {
                fullscreenIframe.src = LAYER_URLS[btn.getAttribute('data-layer')];
            }
        });
    });

    // Полноэкранный режим карты
    var expandBtn = document.getElementById('weather-map-expand-btn');
    var closeBtn = document.getElementById('weather-map-close-btn');
    var overlay = document.getElementById('weather-map-fullscreen-overlay');
    var fullscreenIframe = document.getElementById('weather-map-fullscreen');

    if (expandBtn) {
        expandBtn.addEventListener('click', function() {
            var currentSrc = document.getElementById('weather-map').src;
            fullscreenIframe.src = currentSrc;
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            fullscreenIframe.src = '';
        });
    }

    // Закрытие по Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && overlay.classList.contains('active')) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
            fullscreenIframe.src = '';
        }
    });

    // Инициализация
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            var lat = position.coords.latitude;
            var lon = position.coords.longitude;
            updateMapLayer('radar', lat, lon);
        }, function() {
            updateMapLayer('radar');
        }, { timeout: 15000, enableHighAccuracy: true, maximumAge: 0 });
    } else {
        updateMapLayer('radar');
    }
})();