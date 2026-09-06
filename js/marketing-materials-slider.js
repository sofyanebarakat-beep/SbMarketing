(function () {
  document.querySelectorAll('[data-mms-slider]').forEach(function (slider) {
    var track = slider.querySelector('[data-mms-track]');
    var slides = Array.prototype.slice.call(slider.querySelectorAll('[data-mms-slide]'));
    var dots = Array.prototype.slice.call(slider.querySelectorAll('[data-mms-dot]'));
    var previous = slider.querySelector('[data-mms-prev]');
    var next = slider.querySelector('[data-mms-next]');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var current = 0;
    var timer;

    if (!track || slides.length < 2) return;

    function show(index, announce) {
      current = (index + slides.length) % slides.length;
      track.style.transform = 'translateX(-' + (current * 100) + '%)';
      slides.forEach(function (slide, i) {
        slide.setAttribute('aria-hidden', String(i !== current));
      });
      dots.forEach(function (dot, i) {
        dot.setAttribute('aria-current', String(i === current));
        dot.setAttribute('tabindex', i === current ? '0' : '-1');
      });
      if (announce) slider.setAttribute('aria-label', slider.getAttribute('data-label') + ' — ' + (current + 1) + '/' + slides.length);
    }

    function stop() { window.clearInterval(timer); }
    function start() {
      stop();
      if (!reduceMotion) timer = window.setInterval(function () { show(current + 1, false); }, 5200);
    }

    previous.addEventListener('click', function () { show(current - 1, true); start(); });
    next.addEventListener('click', function () { show(current + 1, true); start(); });
    dots.forEach(function (dot, index) {
      dot.addEventListener('click', function () { show(index, true); start(); });
    });
    slider.addEventListener('mouseenter', stop);
    slider.addEventListener('mouseleave', start);
    slider.addEventListener('focusin', stop);
    slider.addEventListener('focusout', start);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

    show(0, false);
    start();
  });
})();
