// Theme toggle
(function () {
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) {}
    var initial = saved || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var btn = document.getElementById('theme-toggle');

    function updateLabel() {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        btn.textContent = isDark ? 'Light mode' : 'Dark mode';
    }

    if (initial === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    updateLabel();

    btn.addEventListener('click', function () {
        var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        try { localStorage.setItem('theme', isDark ? 'light' : 'dark'); } catch (e) {}
        updateLabel();
    });
})();

// Icon fallback if a favicon file is missing.
document.querySelectorAll('.tile:not(.tile-brand)').forEach(function (tile) {
    var img = tile.querySelector('.tile-icon img');
    var fallback = tile.querySelector('.tile-fallback');
    if (!img || !fallback) return;

    function triggerFallback() {
        img.style.display = 'none';
        fallback.style.display = 'flex';
    }

    img.addEventListener('error', triggerFallback);
    if (img.complete && img.naturalWidth === 0) {
        triggerFallback();
    }
});

// Live search — filters the tool tiles, leaves the brand tile alone.
var search = document.getElementById('search');
var tiles = document.querySelectorAll('.tile-grid .tile:not(.tile-brand)');

search.addEventListener('input', function () {
    var query = this.value.toLowerCase();
    tiles.forEach(function (tile) {
        var match = tile.innerText.toLowerCase().includes(query);
        tile.style.display = match ? 'flex' : 'none';
    });
});
