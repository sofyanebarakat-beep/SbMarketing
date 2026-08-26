(function () {
  "use strict";

  if (document.querySelector(".language-switcher")) return;

  var translations = {
    "Nos projets": "Our work",
    "Offre": "Services",
    "Contact": "Contact",
    "Pack présence digitale à Nice": "Digital presence package in Nice",
    "Confidentialité": "Privacy",
    "Politique de confidentialité": "Privacy policy",
    "Accès aux données": "Data access",
    "Consentement aux cookies": "Cookie consent",
    "Voir nos projets": "View our work",
    "Voir tous nos projets": "View all our work",
    "Discuter avec nous": "Talk to us",
    "Parler à SB Marketing": "Talk to SB Marketing",
    "En savoir plus": "Learn more",
    "Voir le projet": "View project",
    "Voir le site web": "View website",
    "Projets similaires": "Related projects"
  };
  var textNodes = [];
  var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function (node) {
      return translations[node.nodeValue.trim()]
        ? NodeFilter.FILTER_ACCEPT
        : NodeFilter.FILTER_REJECT;
    }
  });

  while (walker.nextNode()) {
    textNodes.push({
      node: walker.currentNode,
      original: walker.currentNode.nodeValue,
      key: walker.currentNode.nodeValue.trim()
    });
  }

  function createSwitcher(extraClass) {
    var group = document.createElement("div");
    group.className = "language-switcher" + (extraClass ? " " + extraClass : "");
    group.setAttribute("role", "group");
    group.innerHTML = '<button class="language-switcher__button" type="button" data-language="fr" aria-label="Français">FR</button><button class="language-switcher__button" type="button" data-language="en" aria-label="English">EN</button>';
    group.addEventListener("click", function (event) {
      var button = event.target.closest("[data-language]");
      if (button) setLanguage(button.dataset.language, true);
    });
    return group;
  }

  var navActions = document.querySelector(".navbar2_button-wrapper");
  if (navActions) {
    navActions.insertBefore(createSwitcher("header-language-switcher"), navActions.firstChild);
  }

  var footerLinks = document.querySelector(".footer7_link-list");
  if (footerLinks) {
    footerLinks.parentNode.insertBefore(createSwitcher("footer-language-switcher"), footerLinks.nextSibling);
  }

  function setLanguage(language, save) {
    var lang = language === "en" ? "en" : "fr";
    document.documentElement.lang = lang;
    textNodes.forEach(function (item) {
      var start = item.original.match(/^\s*/)[0];
      var end = item.original.match(/\s*$/)[0];
      item.node.nodeValue = start + (lang === "en" ? translations[item.key] : item.key) + end;
    });
    document.querySelectorAll("[data-language]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(button.dataset.language === lang));
    });
    document.querySelectorAll(".language-switcher").forEach(function (group) {
      group.setAttribute("aria-label", lang === "en" ? "Choose language" : "Choisir la langue");
    });
    if (save) {
      try { localStorage.setItem("sb-language", lang); } catch (error) {}
    }
  }

  var preferred = "fr";
  try { preferred = localStorage.getItem("sb-language") || "fr"; } catch (error) {}
  setLanguage(preferred, false);
})();
