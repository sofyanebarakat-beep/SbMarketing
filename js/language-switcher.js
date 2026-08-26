(function () {
  "use strict";

  if (document.querySelector(".language-switcher")) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;

  function localizedPath(language) {
    var path = window.location.pathname || "/";
    if (language === "en") {
      return path.indexOf("/en/") === 0 || path === "/en" ? path : "/en" + (path === "/" ? "/" : path);
    }
    if (path === "/en" || path === "/en/") return "/";
    return path.indexOf("/en/") === 0 ? path.slice(3) || "/" : path;
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
      try { localStorage.setItem("sb-language", button.dataset.language); } catch (error) {}
      document.documentElement.classList.add("is-language-changing");
      window.location.assign(localizedPath(button.dataset.language) + window.location.search + window.location.hash);
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
})();
