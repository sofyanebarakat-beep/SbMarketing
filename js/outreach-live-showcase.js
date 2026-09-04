(function () {
  var section = document.querySelector('[data-ors-showcase]');
  if (!section) return;
  function track(name, details) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: name, project: 'outreach_recruitment' }, details || {}));
  }
  section.querySelectorAll('[data-event]').forEach(function (link) {
    link.addEventListener('click', function () { track(link.getAttribute('data-event')); });
  });
  var stage = section.querySelector('[data-ors-iframe-stage]');
  var viewport = section.querySelector('[data-ors-iframe-viewport]');
  var poster = section.querySelector('[data-ors-poster]');
  var loading = section.querySelector('[data-ors-loading]');
  var fallback = section.querySelector('[data-ors-fallback]');
  var launch = section.querySelector('[data-ors-launch]');
  var hint = section.querySelector('[data-ors-hint]');
  var dims = section.querySelector('[data-ors-dims]');
  var loaded = false;
  var activated = false;
  var failureTimer;
  function showFallback() {
    if (loaded) return;
    loading.classList.remove('active');
    fallback.classList.add('active');
    track('showcase_iframe_failed');
  }
  function loadFrame(trigger) {
    if (activated || viewport.querySelector('iframe')) return;
    activated = true;
    poster.hidden = true;
    loading.classList.add('active');
    var frame = document.createElement('iframe');
    frame.src = 'https://outreachrecruitment.net/';
    frame.title = 'Interactive Outreach Recruitment website';
    frame.loading = 'lazy';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('load', function () {
      loaded = true;
      window.clearTimeout(failureTimer);
      loading.classList.remove('active');
      fallback.classList.remove('active');
      hint.classList.add('visible');
      window.setTimeout(function () { hint.classList.remove('visible'); }, 4200);
      track('showcase_iframe_loaded');
    });
    frame.addEventListener('error', showFallback);
    viewport.appendChild(frame);
    failureTimer = window.setTimeout(showFallback, 12000);
    track('showcase_iframe_activated', { trigger: trigger || 'click' });
  }
  launch.addEventListener('click', function () { loadFrame('click'); });

  var VIEWPORT_DIMS = { desktop: '1280 × 800', tablet: '768 × 1024', mobile: '390 × 844' };
  function setDims(name) {
    if (!dims || !VIEWPORT_DIMS[name]) return;
    dims.textContent = VIEWPORT_DIMS[name];
    dims.classList.remove('is-changing');
    void dims.offsetWidth;
    dims.classList.add('is-changing');
  }
  section.querySelectorAll('.ors-viewport').forEach(function (button) {
    button.addEventListener('click', function () {
      var selected = button.getAttribute('data-viewport');
      viewport.setAttribute('data-viewport', selected);
      section.querySelectorAll('.ors-viewport').forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
      setDims(selected);
      track('showcase_viewport_changed', { viewport: selected });
    });
  });

  section.querySelector('[data-ors-fullscreen]').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) { stage.requestFullscreen(); track('showcase_fullscreen_opened'); }
  });

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var conn = navigator.connection || {};
  var frugalNet = conn.saveData === true || /^(slow-2g|2g)$/.test(conn.effectiveType || '');
  var autoOk = !reduceMotion && !frugalNet;

  if ('IntersectionObserver' in window) {
    if (!reduceMotion) section.classList.add('has-reveal');
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: .16 });
    section.querySelectorAll('[data-ors-device]').forEach(function (device) { reveal.observe(device); });

    if (autoOk) {
      var autoLoad = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { autoLoad.disconnect(); loadFrame('scroll'); }
        });
      }, { threshold: .35 });
      autoLoad.observe(stage);
    }
  } else section.querySelectorAll('[data-ors-device]').forEach(function (device) { device.classList.add('visible'); });
})();
