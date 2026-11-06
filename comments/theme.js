// Theme toggle — mirrors index.html / about.html so the choice is shared via localStorage.
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
