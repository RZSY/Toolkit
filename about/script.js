// Theme toggle — mirrors index.html so the choice is shared via localStorage.
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

// Small slide/carousel cycling through the site icon and each tool's icon.
(function () {
    var slides = [
        { src: '../ico/tkico.jpg', caption: 'Toolkit' },
        { src: '../ico/csico.jpg', caption: 'Chartsmith' },
        { src: '../ico/efico.jpg', caption: 'Entity Family' },
        { src: '../ico/fsico.jpg', caption: 'Flowchart Studio' },
        { src: '../ico/tbico.jpg', caption: 'Timeline Builder' },
        { src: '../ico/jun.jpg', caption: 'Jun Sang Binatang Pintar' },
        { src: '../ico/nimbus.jpg', caption: 'Nimbus Si Awan Hitam' },
    ];
    var index = 0;
    var img = document.getElementById('slide-img');
    var caption = document.getElementById('slide-caption');

    function show(i) {
        index = (i + slides.length) % slides.length;
        img.src = slides[index].src;
        caption.textContent = slides[index].caption;
    }

    document.getElementById('prev').addEventListener('click', function () { show(index - 1); });
    document.getElementById('next').addEventListener('click', function () { show(index + 1); });
})();
