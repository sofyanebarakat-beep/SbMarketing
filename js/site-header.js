(function () {
  "use strict";

  if (document.querySelector(".sb-site-header")) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var prefix = english ? "/en" : "";
  var phone = "+33745115391";
  var labels = english ? {
    home: "Home", work: "Our work", blog: "Blog", services: "Services", contact: "Book a free call",
    menu: "Open menu", close: "Close menu", available: "Available for new projects",
    call: "Call", email: "Email", skip: "Skip to content", serviceMenu: "Explore services",
    growth: "Growth", creative: "Creative & Technology", featured: "Featured case study",
    featuredTitle: "247Pay — Fintech brand & digital experience", featuredCta: "View case study",
    goalsTitle: "What do you want to achieve?", goalLeads: "Get more leads", goalBrand: "Build my brand", goalWebsite: "Launch a website",
    announcement: "Free growth audit", announcementCta: "Book yours", dismiss: "Dismiss announcement",
    studio: "Growth studio", servicesIntro: "One team to grow your entire digital presence", allServices: "Explore all services"
  } : {
    home: "Accueil", work: "Nos projets", blog: "Blog", services: "Services", contact: "Réserver un appel gratuit",
    menu: "Ouvrir le menu", close: "Fermer le menu", available: "Disponible pour de nouveaux projets",
    call: "Appeler", email: "E-mail", skip: "Aller au contenu", serviceMenu: "Découvrir les services",
    growth: "Croissance", creative: "Création & Technologie", featured: "Étude de cas à la une",
    featuredTitle: "247Pay — Marque fintech & expérience digitale", featuredCta: "Voir l’étude de cas",
    goalsTitle: "Quel est votre objectif ?", goalLeads: "Obtenir plus de leads", goalBrand: "Développer ma marque", goalWebsite: "Lancer un site web",
    announcement: "Audit croissance offert", announcementCta: "Réserver", dismiss: "Fermer l’annonce",
    studio: "Studio de croissance", servicesIntro: "Une seule équipe pour développer toute votre présence digitale", allServices: "Découvrir tous les services"
  };
  var services = english ? [
    ["Lead generation", "/en/outreach/", "target", "growth"],
    ["Meta & Google Ads", "/en/blog/quest-ce-que-la-publicite-meta/", "chart", "growth"],
    ["Call center", "/en/outreach/", "phone", "growth"],
    ["Content creation", "/en/blog/gestion-reseaux-sociaux-croissance-entreprise/", "spark", "creative"],
    ["Web design", "/en/projets/", "screen", "creative"],
    ["Digital presence package", "/en/pack-presence-digitale-nice/", "grid", "creative"]
  ] : [
    ["Génération de leads", "/outreach/", "target", "growth"],
    ["Meta & Google Ads", "/blog/quest-ce-que-la-publicite-meta/", "chart", "growth"],
    ["Centre d’appel", "/outreach/", "phone", "growth"],
    ["Création de contenu", "/blog/gestion-reseaux-sociaux-croissance-entreprise/", "spark", "creative"],
    ["Design web", "/projets/", "screen", "creative"],
    ["Pack présence digitale", "/pack-presence-digitale-nice/", "grid", "creative"]
  ];

  var icons = {
    target: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M22 12h-3"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V9m6 10V5m6 14v-7m4 7H2"/></svg>',
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-3l-5-1-1.5 2a15 15 0 0 1-8.5-8.5L8 8 7 3Z"/></svg>',
    spark: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.6 6.4L20 10l-6.4 1.6L12 18l-1.6-6.4L4 10l6.4-1.6L12 2Z"/></svg>',
    screen: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>'
  };

  function serviceLinks(group) {
    return services.filter(function (service) { return service[3] === group; }).map(function (service) {
      return '<a class="sb-mega-service" data-header-track="service:' + service[0] + '" href="' + service[1] + '"><span class="sb-mega-service__icon">' + icons[service[2]] + '</span><span>' + service[0] + '</span></a>';
    }).join("");
  }

  function track(eventName, detail) {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: eventName, header_action: detail || "" });
  }

  function isActive(href) {
    var current = window.location.pathname.replace(/index\.html$/, "");
    return current === href || (href.indexOf("/projets/") !== -1 && current.indexOf(prefix + "/projets/") === 0) || (href.indexOf("/blog/") !== -1 && current.indexOf(prefix + "/blog/") === 0);
  }

  function localizedPath(language) {
    var path = window.location.pathname || "/";
    if (language === "en") return path.indexOf("/en/") === 0 || path === "/en" ? path : "/en" + (path === "/" ? "/" : path);
    if (path === "/en" || path === "/en/") return "/";
    return path.indexOf("/en/") === 0 ? path.slice(3) || "/" : path;
  }

  var main = document.querySelector("main") || document.querySelector(".main-wrapper");
  if (main && !main.id) main.id = "main-content";

  var skip = document.createElement("a");
  skip.className = "sb-skip-link";
  skip.href = "#main-content";
  skip.textContent = labels.skip;

  var header = document.createElement("header");
  header.className = "sb-site-header";
  header.innerHTML = '<div class="sb-site-header__announcement"><span>' + labels.announcement + '</span><a data-header-track="announcement" href="' + prefix + '/contact/">' + labels.announcementCta + ' <span aria-hidden="true">→</span></a><button type="button" aria-label="' + labels.dismiss + '">×</button></div>' +
    '<div class="sb-site-header__inner">' +
    '<a class="sb-site-header__logo" data-header-track="logo" href="' + (english ? "/en/" : "/") + '" aria-label="Sb Marketing — ' + (english ? "Home" : "Accueil") + '"><img src="/images/logo-climanova.svg" alt="Sb Marketing"><span>' + labels.studio + '</span></a>' +
    '<nav class="sb-site-header__nav" id="sb-site-navigation" aria-label="' + (english ? "Main navigation" : "Navigation principale") + '">' +
      '<a class="sb-site-header__link" data-header-track="home" href="' + (english ? "/en/" : "/") + '"' + (isActive(english ? "/en/" : "/") ? ' aria-current="page"' : '') + '>' + labels.home + '</a>' +
      '<a class="sb-site-header__link" data-header-track="work" href="' + prefix + '/projets/"' + (isActive(prefix + "/projets/") ? ' aria-current="page"' : '') + '>' + labels.work + '</a>' +
      '<a class="sb-site-header__link" data-header-track="blog" href="' + prefix + '/blog/"' + (isActive(prefix + "/blog/") ? ' aria-current="page"' : '') + '>' + labels.blog + '</a>' +
      '<div class="sb-site-header__services">' +
        '<button class="sb-site-header__link sb-site-header__services-button" type="button" aria-expanded="false" aria-controls="sb-services-menu">' + labels.services + '<span aria-hidden="true">⌄</span></button>' +
        '<div class="sb-site-header__services-menu" id="sb-services-menu" aria-label="' + labels.serviceMenu + '">' +
          '<div class="sb-mega-services__heading"><span><small>SB Marketing</small><strong>' + labels.servicesIntro + '</strong></span><a href="' + prefix + '/pack-presence-digitale-nice/">' + labels.allServices + ' →</a></div>' +
          '<div class="sb-mega-services__columns"><section><h2>' + labels.growth + '</h2>' + serviceLinks("growth") + '</section><section><h2>' + labels.creative + '</h2>' + serviceLinks("creative") + '</section></div>' +
          '<a class="sb-mega-services__case" data-header-track="featured-case" href="' + prefix + '/projets/247pay.html"><span><small>' + labels.featured + '</small><strong>' + labels.featuredTitle + '</strong></span><b>' + labels.featuredCta + ' →</b></a>' +
          '<div class="sb-mega-services__goals"><strong>' + labels.goalsTitle + '</strong><a href="' + prefix + '/outreach/">' + labels.goalLeads + '</a><a href="' + prefix + '/contact/">' + labels.goalBrand + '</a><a href="' + prefix + '/projets/">' + labels.goalWebsite + '</a></div>' +
        '</div>' +
      '</div>' +
      '<div class="sb-site-header__mobile-languages" aria-label="' + (english ? "Choose language" : "Choisir la langue") + '"><a data-mobile-language="fr" href="' + localizedPath("fr") + '"' + (!english ? ' aria-current="page"' : '') + '>Français</a><a data-mobile-language="en" href="' + localizedPath("en") + '"' + (english ? ' aria-current="page"' : '') + '>English</a></div>' +
      '<div class="sb-site-header__mobile-meta"><a data-header-track="phone" href="tel:' + phone + '">' + labels.call + '</a><a data-header-track="email" href="mailto:contact@sbmarketing.fr">' + labels.email + '</a></div>' +
      '<a class="sb-site-header__mobile-cta" data-header-track="mobile-cta" href="' + prefix + '/contact/">' + labels.contact + '</a>' +
    '</nav>' +
    '<div class="navbar2_button-wrapper sb-site-header__actions">' +
      '<a class="sb-site-header__cta" data-header-track="desktop-cta" href="' + prefix + '/contact/"><span class="sb-site-header__cta-avatar"><img src="/images/soufiane-profile.jpg" alt="" aria-hidden="true"><i aria-hidden="true"></i></span><span>' + labels.contact + '</span><b aria-hidden="true">↗</b></a>' +
      '<span class="sb-site-header__availability"><i aria-hidden="true"></i>' + labels.available + '</span>' +
      '<button class="sb-site-header__menu-button" type="button" aria-controls="sb-site-navigation" aria-expanded="false" aria-label="' + labels.menu + '"><span class="sb-site-header__menu-icon" aria-hidden="true"></span></button>' +
    '</div>' +
  '</div>';

  var existingHeaders = Array.prototype.slice.call(document.querySelectorAll(".navbar2_component"));
  var anchor = existingHeaders[0];
  if (anchor) {
    anchor.parentNode.insertBefore(skip, anchor);
    anchor.parentNode.insertBefore(header, anchor);
  } else {
    document.body.insertBefore(header, document.body.firstChild);
    document.body.insertBefore(skip, header);
  }
  existingHeaders.forEach(function (item) { item.remove(); });
  document.documentElement.classList.add("sb-header-ready");

  var menuButton = header.querySelector(".sb-site-header__menu-button");
  var servicesButton = header.querySelector(".sb-site-header__services-button");
  var servicesWrap = header.querySelector(".sb-site-header__services");
  var announcement = header.querySelector(".sb-site-header__announcement");
  var announcementClose = announcement.querySelector("button");
  var lastScroll = window.scrollY;
  var announcementKey = "sb-header-announcement-2026-08";

  try { if (localStorage.getItem(announcementKey) === "dismissed") header.classList.add("is-announcement-hidden"); } catch (error) {}
  announcementClose.addEventListener("click", function () {
    header.classList.add("is-announcement-hidden");
    try { localStorage.setItem(announcementKey, "dismissed"); } catch (error) {}
    track("header_announcement_dismiss", currentLanguage());
  });

  function closeServices() {
    servicesWrap.classList.remove("is-open");
    servicesButton.setAttribute("aria-expanded", "false");
  }
  function openServices() {
    servicesWrap.classList.add("is-open");
    servicesButton.setAttribute("aria-expanded", "true");
  }
  function closeMenu(returnFocus) {
    var wasOpen = header.classList.contains("is-menu-open");
    header.classList.remove("is-menu-open");
    document.body.classList.remove("sb-menu-locked");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", labels.menu);
    closeServices();
    if (wasOpen && returnFocus) menuButton.focus();
  }
  function openMenu() {
    header.classList.add("is-menu-open");
    document.body.classList.add("sb-menu-locked");
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", labels.close);
    track("header_menu_open", currentLanguage());
    var first = header.querySelector(".sb-site-header__nav a");
    if (first) first.focus();
  }
  function currentLanguage() { return english ? "en" : "fr"; }

  menuButton.addEventListener("click", function () {
    header.classList.contains("is-menu-open") ? closeMenu(false) : openMenu();
  });
  servicesButton.addEventListener("click", function () {
    var open = !servicesWrap.classList.contains("is-open");
    open ? openServices() : closeServices();
    if (open) track("header_services_open", currentLanguage());
  });
  servicesButton.addEventListener("keydown", function (event) {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    openServices();
    var firstService = servicesWrap.querySelector(".sb-site-header__services-menu a");
    if (firstService) firstService.focus();
  });
  servicesWrap.addEventListener("mouseenter", function () {
    if (window.matchMedia("(min-width: 992px) and (hover: hover)").matches) openServices();
  });
  servicesWrap.addEventListener("mouseleave", function () {
    if (window.matchMedia("(min-width: 992px) and (hover: hover)").matches) closeServices();
  });
  header.addEventListener("click", function (event) {
    var languageLink = event.target.closest("[data-mobile-language]");
    if (languageLink) {
      try { localStorage.setItem("sb-language", languageLink.getAttribute("data-mobile-language")); } catch (error) {}
      track("header_language_switch", languageLink.getAttribute("data-mobile-language"));
    }
    var tracked = event.target.closest("[data-header-track]");
    if (tracked) track("header_navigation_click", tracked.getAttribute("data-header-track"));
    if (event.target.closest(".sb-site-header__nav a")) closeMenu(false);
  });
  document.addEventListener("click", function (event) {
    if (!header.contains(event.target)) { closeServices(); closeMenu(false); }
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") { closeServices(); closeMenu(true); return; }
    if (event.key !== "Tab" || !header.classList.contains("is-menu-open")) return;
    var focusable = Array.prototype.slice.call(header.querySelectorAll('a[href], button:not([disabled])')).filter(function (item) { return item.offsetParent !== null; });
    if (!focusable.length) return;
    var first = focusable[0], last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener("resize", function () { if (window.innerWidth > 991) closeMenu(false); }, { passive: true });

  function detectPageContrast() {
    var sample = document.elementFromPoint(Math.round(window.innerWidth / 2), Math.min(header.offsetHeight + 2, window.innerHeight - 1));
    while (sample && sample !== document.body) {
      var color = window.getComputedStyle(sample).backgroundColor;
      var rgb = color && color.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
      if (rgb && color.indexOf("rgba(0, 0, 0, 0)") === -1) {
        var luminance = (Number(rgb[1]) * 299 + Number(rgb[2]) * 587 + Number(rgb[3]) * 114) / 1000;
        header.classList.toggle("is-over-light", luminance > 155);
        return;
      }
      sample = sample.parentElement;
    }
    header.classList.remove("is-over-light");
  }

  function updateHeader() {
    var current = window.scrollY;
    header.classList.toggle("is-announcement-scrolled", current > 24);
    header.classList.toggle("is-scrolled", current > 12);
    header.classList.toggle("is-compact", current > 90);
    header.classList.toggle("is-hidden", current > 180 && current > lastScroll + 5 && !header.classList.contains("is-menu-open") && !servicesWrap.classList.contains("is-open"));
    if (current < lastScroll - 3) header.classList.remove("is-hidden");
    if (header.classList.contains("is-menu-open") && Math.abs(current - lastScroll) > 18) closeMenu(false);
    lastScroll = current;
    detectPageContrast();
  }
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
})();
