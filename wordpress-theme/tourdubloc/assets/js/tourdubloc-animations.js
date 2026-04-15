/**
 * Tourdubloc – Custom Animations & UI Interactions
 * Requires: GSAP, ScrollTrigger, SplitText (GSAP Club), MorphSVGPlugin, split-type (unpkg), jQuery
 */

window.addEventListener('DOMContentLoaded', function () {

  // ── 1. SplitType text splitting ─────────────────────────────────────────
  var typeSplit;

  function runSplitType() {
    typeSplit = new SplitType('[text-split]', {
      types: 'lines, words, chars',
      tagName: 'span'
    });
  }

  if (typeof SplitType !== 'undefined') {
    runSplitType();

    var windowWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      if (windowWidth !== window.innerWidth) {
        windowWidth = window.innerWidth;
        typeSplit.revert();
        runSplitType();
      }
    });
  }

  // ── 2. ScrollTrigger helpers ─────────────────────────────────────────────
  function createScrollTrigger(triggerElement, timeline) {
    ScrollTrigger.create({
      trigger: triggerElement,
      start: 'top bottom',
      onLeaveBack: function () {
        timeline.progress(0);
        timeline.pause();
      }
    });
    ScrollTrigger.create({
      trigger: triggerElement,
      start: 'top 60%',
      onEnter: function () { timeline.play(); }
    });
  }

  // ── 3. GSAP text animations ──────────────────────────────────────────────
  jQuery('[words-slide-up]').each(function () {
    var tl = gsap.timeline({ paused: true });
    tl.from(jQuery(this).find('.word'), { opacity: 0, yPercent: 100, duration: 0.5, ease: 'back.out(2)', stagger: { amount: 0.5 } });
    createScrollTrigger(this, tl);
  });

  jQuery('[words-slide-from-right]').each(function () {
    var tl = gsap.timeline({ paused: true });
    tl.from(jQuery(this).find('.word'), { opacity: 0, x: '1em', duration: 0.6, ease: 'power2.out', stagger: { amount: 0.2 } });
    createScrollTrigger(this, tl);
  });

  jQuery('[letters-slide-up]').each(function () {
    var tl = gsap.timeline({ paused: true });
    tl.from(jQuery(this).find('.char'), { yPercent: 100, duration: 0.4, ease: 'power1.out', stagger: { amount: 0.5 } });
    createScrollTrigger(this, tl);
  });

  jQuery('[letters-slide-down]').each(function () {
    var tl = gsap.timeline({ paused: true });
    tl.from(jQuery(this).find('.char'), { yPercent: -120, duration: 0.3, ease: 'power1.out', stagger: { amount: 0.7 } });
    createScrollTrigger(this, tl);
  });

  jQuery('[letters-fade-in]').each(function () {
    var tl = gsap.timeline({ paused: true });
    tl.from(jQuery(this).find('.char'), { opacity: 0, duration: 0.2, ease: 'power1.out', stagger: { amount: 0.8 } });
    createScrollTrigger(this, tl);
  });

  jQuery('[scrub-each-word]').each(function () {
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: this,
        start: 'top 80%',
        end: 'bottom 40%',
        scrub: true
      }
    });
    tl.from(jQuery(this).find('.char'), { opacity: 0.2, duration: 0.2, ease: 'power1.out', stagger: { each: 0.1 } });
  });

  gsap.set('[text-split]', { opacity: 1 });

  // ── 4. Hero header entrance animation ───────────────────────────────────
  function triggerHeroHeaderAnimation() {
    gsap.from('.hero_heading .char', {
      opacity: 0,
      yPercent: 100,
      duration: 0.8,
      stagger: { amount: 0.5 },
      ease: 'power3.out'
    });
  }

  // ── 5. Page loader + MorphSVG ────────────────────────────────────────────
  if (typeof MorphSVGPlugin !== 'undefined') {
    gsap.registerPlugin(MorphSVGPlugin);

    gsap.to('#startShape', {
      duration: 4,
      morphSVG: '#newLogoSVG path',
      ease: 'power1.inOut'
    });
  }

  var homeLoadTl = gsap.timeline();
  homeLoadTl.to('.loader_colums', {
    delay: 0.5,
    yPercent: -100,
    duration: 1.6,
    stagger: { each: 0.1 },
    ease: 'power4.inOut',
    onStart: triggerHeroHeaderAnimation,
    onComplete: function () {
      jQuery('.loader_component').css('display', 'none');
    }
  });

  // ── 6. Callouts slideshow ────────────────────────────────────────────────
  var callouts = document.querySelectorAll('.callouts-wrapper');
  if (callouts.length) {
    var current = 0;
    callouts[current].classList.add('callout-active');
    setInterval(function () {
      callouts[current].classList.remove('callout-active');
      current = (current + 1) % callouts.length;
      callouts[current].classList.add('callout-active');
    }, 3000);
  }

  // ── 7. Navbar background on scroll ──────────────────────────────────────
  var navbar = document.querySelector('.navbar2_component');
  if (navbar) {
    function onScroll() {
      if (window.scrollY > 10) {
        navbar.classList.add('is-scrolled');
      } else {
        navbar.classList.remove('is-scrolled');
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
});
