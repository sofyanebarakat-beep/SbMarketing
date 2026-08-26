(function () {
  "use strict";

  if (document.querySelector(".language-switcher")) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var currentLanguage = english ? "en" : "fr";

  function localizedPath(language) {
    var path = window.location.pathname || "/";
    if (language === "en") {
      return path.indexOf("/en/") === 0 || path === "/en" ? path : "/en" + (path === "/" ? "/" : path);
    }
    if (path === "/en" || path === "/en/") return "/";
    return path.indexOf("/en/") === 0 ? path.slice(3) || "/" : path;
  }

  function getSavedLanguage() {
    try {
      var saved = localStorage.getItem("sb-language");
      return saved === "fr" || saved === "en" ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function detectLanguage() {
    var locales = navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || ""];
    var primary = String(locales[0] || "").toLowerCase();

    if (primary.indexOf("fr") === 0) return "fr";
    if (primary.indexOf("en") === 0) return "en";

    var regionMatch = primary.match(/[-_]([a-z]{2})\b/i);
    var region = regionMatch ? regionMatch[1].toUpperCase() : "";
    if (["FR", "MC"].indexOf(region) !== -1) return "fr";
    if (["MT", "GB", "IE", "US", "AU", "NZ"].indexOf(region) !== -1) return "en";

    try {
      var timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (timezone === "Europe/Malta") return "en";
      if (timezone === "Europe/Paris" || timezone === "Europe/Monaco") return "fr";
    } catch (error) {}

    return "en";
  }

  var savedLanguage = getSavedLanguage();
  var preferredLanguage = savedLanguage || detectLanguage();
  if (preferredLanguage !== currentLanguage) {
    document.documentElement.classList.add("is-language-changing");
    window.location.replace(localizedPath(preferredLanguage) + window.location.search + window.location.hash);
    return;
  }

  function saveLanguage(language) {
    try { localStorage.setItem("sb-language", language); } catch (error) {}
  }

  function goToLanguage(language) {
    saveLanguage(language);
    document.documentElement.classList.add("is-language-changing");
    window.location.assign(localizedPath(language) + window.location.search + window.location.hash);
  }

  function createSwitcher(extraClass) {
    var group = document.createElement("div");
    group.className = "language-switcher" + (extraClass ? " " + extraClass : "");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", english ? "Choose language" : "Choisir la langue");
    group.innerHTML = '<button class="language-switcher__button" type="button" data-language="fr" aria-label="Français">FR</button><button class="language-switcher__button" type="button" data-language="en" aria-label="English">EN</button>';
    group.addEventListener("click", function (event) {
      var button = event.target.closest("[data-language]");
      if (!button || button.getAttribute("aria-pressed") === "true") return;
      goToLanguage(button.dataset.language);
    });
    return group;
  }

  var navActions = document.querySelector(".navbar2_button-wrapper");
  if (navActions) navActions.insertBefore(createSwitcher("header-language-switcher"), navActions.firstChild);

  var footerLinks = document.querySelector(".footer7_link-list");
  if (footerLinks) footerLinks.parentNode.insertBefore(createSwitcher("footer-language-switcher"), footerLinks.nextSibling);

  document.querySelectorAll("[data-language]").forEach(function (button) {
    button.setAttribute("aria-pressed", String((button.dataset.language === "en") === english));
  });

  function showAutomaticSelectionNotice() {
    if (savedLanguage) return;
    try {
      if (sessionStorage.getItem("sb-language-notice-dismissed")) return;
    } catch (error) {}

    var alternative = english ? "fr" : "en";
    var notice = document.createElement("div");
    notice.className = "language-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.innerHTML = english
      ? '<span>We selected English based on your browser settings.</span><button type="button" class="language-notice__switch">Français</button><button type="button" class="language-notice__close" aria-label="Dismiss">×</button>'
      : '<span>Nous avons sélectionné le français selon les réglages de votre navigateur.</span><button type="button" class="language-notice__switch">English</button><button type="button" class="language-notice__close" aria-label="Fermer">×</button>';
    notice.querySelector(".language-notice__switch").addEventListener("click", function () {
      goToLanguage(alternative);
    });
    notice.querySelector(".language-notice__close").addEventListener("click", function () {
      try { sessionStorage.setItem("sb-language-notice-dismissed", "true"); } catch (error) {}
      notice.remove();
    });
    document.body.appendChild(notice);
  }

  window.setTimeout(showAutomaticSelectionNotice, 650);
})();
