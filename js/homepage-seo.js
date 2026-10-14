(function () {
  "use strict";

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var hero = document.querySelector(".max-width-hero");
  var heading = hero && hero.querySelector("h1");

  if (hero && heading && !hero.querySelector(".hero-seo-intro")) {
    var intro = document.createElement("p");
    intro.className = "hero-seo-intro";
    intro.textContent = english
      ? "Digital marketing agency in Nice for websites, SEO & GEO, paid media, content and qualified lead generation."
      : "Agence marketing digital à Nice : sites web, SEO & GEO, publicité en ligne, contenu et génération de leads qualifiés.";
    heading.insertAdjacentElement("afterend", intro);
  }

  if (english) {
    Array.prototype.forEach.call(document.querySelectorAll("h2"), function (item) {
      if (item.textContent.indexOf("The seule Something") !== -1) {
        item.textContent = "The only thing you need to do? Focus on your business.";
      }
    });
  }
})();
