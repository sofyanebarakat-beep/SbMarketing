(function () {
  "use strict";

  if (document.querySelector(".sb-site-header")) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var prefix = english ? "/en" : "";
  var phone = "+33745115391";
  var labels = english ? {
    work: "Our work", blog: "Blog", services: "Services", contact: "Book a free call",
    menu: "Open menu", close: "Close menu", available: "Available for new projects",
    call: "Call", email: "Email", skip: "Skip to content", serviceMenu: "Explore services"
  } : {
    work: "Nos projets", blog: "Blog", services: "Services", contact: "Réserver un appel gratuit",
    menu: "Ouvrir le menu", close: "Fermer le menu", available: "Disponible pour de nouveaux projets",
    call: "Appeler", email: "E-mail", skip: "Aller au contenu", serviceMenu: "Découvrir les services"
  };
  var services = english ? [
    ["Lead generation", "/en/outreach/"],
    ["Meta & Google Ads", "/en/blog/quest-ce-que-la-publicite-meta/"],
    ["Call center", "/en/outreach/"],
    ["Content creation", "/en/blog/gestion-reseaux-sociaux-croissance-entreprise/"],
    ["Web design", "/en/projets/"],
    ["Digital presence package", "/en/pack-presence-digitale-nice/"]
  ] : [
    ["Génération de leads", "/outreach/"],
    ["Meta & Google Ads", "/blog/quest-ce-que-la-publicite-meta/"],
    ["Centre d’appel", "/outreach/"],
    ["Création de contenu", "/blog/gestion-reseaux-sociaux-croissance-entreprise/"],
    ["Design web", "/projets/"],
    ["Pack présence digitale", "/pack-presence-digitale-nice/"]
  ];

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
  header.innerHTML = '<div class="sb-site-header__inner">' +
    '<a class="sb-site-header__logo" data-header-track="logo" href="' + (english ? "/en/" : "/") + '" aria-label="Sb Marketing — ' + (english ? "Home" : "Accueil") + '"><img src="/images/logo-climanova.svg" alt="Sb Marketing"></a>' +
    '<nav class="sb-site-header__nav" id="sb-site-navigation" aria-label="' + (english ? "Main navigation" : "Navigation principale") + '">' +
      '<a class="sb-site-header__link" data-header-track="work" href="' + prefix + '/projets/"' + (isActive(prefix + "/projets/") ? ' aria-current="page"' : '') + '>' + labels.work + '</a>' +
      '<a class="sb-site-header__link" data-header-track="blog" href="' + prefix + '/blog/"' + (isActive(prefix + "/blog/") ? ' aria-current="page"' : '') + '>' + labels.blog + '</a>' +
      '<div class="sb-site-header__services">' +
        '<button class="sb-site-header__link sb-site-header__services-button" type="button" aria-expanded="false" aria-controls="sb-services-menu">' + labels.services + '<span aria-hidden="true">⌄</span></button>' +
        '<div class="sb-site-header__services-menu" id="sb-services-menu" aria-label="' + labels.serviceMenu + '">' +
          services.map(function (service) { return '<a data-header-track="service:' + service[0] + '" href="' + service[1] + '">' + service[0] + '</a>'; }).join("") +
        '</div>' +
      '</div>' +
      '<div class="sb-site-header__mobile-languages" aria-label="' + (english ? "Choose language" : "Choisir la langue") + '"><a data-mobile-language="fr" href="' + localizedPath("fr") + '"' + (!english ? ' aria-current="page"' : '') + '>Français</a><a data-mobile-language="en" href="' + localizedPath("en") + '"' + (english ? ' aria-current="page"' : '') + '>English</a></div>' +
      '<div class="sb-site-header__mobile-meta"><a data-header-track="phone" href="tel:' + phone + '">' + labels.call + '</a><a data-header-track="email" href="mailto:contact@sbmarketing.fr">' + labels.email + '</a></div>' +
      '<a class="sb-site-header__mobile-cta" data-header-track="mobile-cta" href="' + prefix + '/contact/">' + labels.contact + '</a>' +
    '</nav>' +
    '<div class="navbar2_button-wrapper sb-site-header__actions">' +
      '<span class="sb-site-header__availability"><i aria-hidden="true"></i>' + labels.available + '</span>' +
      '<a class="sb-site-header__cta" data-header-track="desktop-cta" href="' + prefix + '/contact/">' + labels.contact + '</a>' +
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
  var lastScroll = window.scrollY;

  function closeServices() {
    servicesWrap.classList.remove("is-open");
    servicesButton.setAttribute("aria-expanded", "false");
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
    servicesWrap.classList.toggle("is-open", open);
    servicesButton.setAttribute("aria-expanded", String(open));
    if (open) track("header_services_open", currentLanguage());
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

  function updateHeader() {
    var current = window.scrollY;
    header.classList.toggle("is-scrolled", current > 12);
    header.classList.toggle("is-compact", current > 90);
    if (header.classList.contains("is-menu-open") && Math.abs(current - lastScroll) > 18) closeMenu(false);
    lastScroll = current;
  }
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
})();
