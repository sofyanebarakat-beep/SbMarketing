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
  var loaded = false;
  var failureTimer;
  function showFallback() {
    if (loaded) return;
    loading.classList.remove('active');
    fallback.classList.add('active');
    track('showcase_iframe_failed');
  }
  launch.addEventListener('click', function () {
    if (viewport.querySelector('iframe')) return;
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
    track('showcase_iframe_activated');
  });
  section.querySelectorAll('.ors-viewport').forEach(function (button) {
    button.addEventListener('click', function () {
      var selected = button.getAttribute('data-viewport');
      viewport.setAttribute('data-viewport', selected);
      section.querySelectorAll('.ors-viewport').forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
      track('showcase_viewport_changed', { viewport: selected });
    });
  });
  section.querySelector('[data-ors-fullscreen]').addEventListener('click', function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (stage.requestFullscreen) { stage.requestFullscreen(); track('showcase_fullscreen_opened'); }
  });
  var mobile = section.querySelector('[data-ors-mobile]');
  var mobileImage = section.querySelector('[data-ors-mobile-image]');
  var toggle = section.querySelector('[data-ors-toggle]');
  var progress = section.querySelector('[data-ors-progress]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var preferenceKey = 'sb-outreach-mobile-preview-paused';
  var userPaused = reduceMotion;
  try { userPaused = reduceMotion || window.sessionStorage.getItem(preferenceKey) === 'true'; } catch (error) {}
  function updateToggle() {
    mobile.classList.toggle('paused', userPaused);
    toggle.textContent = userPaused ? 'Play' : 'Pause';
    toggle.setAttribute('aria-pressed', String(userPaused));
  }
  function savePreference() { try { window.sessionStorage.setItem(preferenceKey, String(userPaused)); } catch (error) {} }
  toggle.addEventListener('click', function () {
    userPaused = !userPaused;
    if (!userPaused) { mobileImage.style.animation = ''; mobileImage.style.transform = ''; }
    updateToggle(); savePreference();
    track(userPaused ? 'showcase_mobile_paused' : 'showcase_mobile_played');
  });
  updateToggle();
  var startY = 0;
  var startOffset = 0;
  var dragOffset = 0;
  function maxOffset() { return Math.max(0, mobileImage.scrollHeight - mobile.clientHeight); }
  function currentOffset() {
    var matrix = window.getComputedStyle(mobileImage).transform;
    if (!matrix || matrix === 'none') return 0;
    var values = matrix.match(/matrix.*\((.+)\)/);
    return values ? Math.abs(Number(values[1].split(',')[5]) || 0) : 0;
  }
  mobile.addEventListener('pointerdown', function (event) {
    if (event.target.closest('button')) return;
    startY = event.clientY; startOffset = currentOffset(); dragOffset = startOffset; userPaused = true;
    mobile.classList.add('dragging', 'paused'); mobileImage.style.animation = 'none'; mobile.setPointerCapture(event.pointerId); updateToggle(); savePreference();
  });
  mobile.addEventListener('pointermove', function (event) {
    if (!mobile.classList.contains('dragging')) return;
    dragOffset = Math.min(maxOffset(), Math.max(0, startOffset + startY - event.clientY));
    mobileImage.style.transform = 'translateY(-' + dragOffset + 'px)';
  });
  function endDrag(event) {
    if (!mobile.classList.contains('dragging')) return;
    mobile.classList.remove('dragging');
    if (mobile.hasPointerCapture(event.pointerId)) mobile.releasePointerCapture(event.pointerId);
    track('showcase_mobile_dragged', { progress: Math.round((dragOffset / Math.max(1, maxOffset())) * 100) });
  }
  mobile.addEventListener('pointerup', endDrag);
  mobile.addEventListener('pointercancel', endDrag);
  mobile.addEventListener('keydown', function (event) {
    var maximum = maxOffset();
    var next = currentOffset();
    if (event.key === 'ArrowDown' || event.key === 'PageDown') next += mobile.clientHeight * .6;
    else if (event.key === 'ArrowUp' || event.key === 'PageUp') next -= mobile.clientHeight * .6;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = maximum;
    else return;
    event.preventDefault(); userPaused = true; mobileImage.style.animation = 'none';
    mobileImage.style.transform = 'translateY(-' + Math.min(maximum, Math.max(0, next)) + 'px)'; updateToggle(); savePreference();
  });
  function updateProgress() {
    progress.style.height = Math.min(100, (currentOffset() / Math.max(1, maxOffset())) * 100) + '%';
    window.requestAnimationFrame(updateProgress);
  }
  window.requestAnimationFrame(updateProgress);
  if ('IntersectionObserver' in window) {
    if (!reduceMotion) section.classList.add('has-reveal');
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: .16 });
    section.querySelectorAll('[data-ors-device]').forEach(function (device) { reveal.observe(device); });
    var visibility = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        mobile.classList.toggle('outside', !entry.isIntersecting);
        if (entry.isIntersecting && !userPaused && !reduceMotion) {
          mobileImage.style.animation = 'none'; void mobileImage.offsetWidth; mobileImage.style.animation = '';
        }
      });
    }, { threshold: .15 });
    visibility.observe(mobile);
  } else section.querySelectorAll('[data-ors-device]').forEach(function (device) { device.classList.add('visible'); });
})();
