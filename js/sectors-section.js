(function () {
  "use strict";

  var section = document.querySelector(".section_case-studies");
  if (!section) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var content = english ? {
    eyebrow: "Sectors",
    title: "Experience across the sectors that drive your growth.",
    intro: "A focused view of the industries we understand and support with tailored digital strategies.",
    previous: "Previous sectors",
    next: "Next sectors",
    page: "Sector group",
    sectors: [
      ["Recruitment", "3 projects"],
      ["Local commerce", "5 projects"],
      ["Fintech", "2 projects"],
      ["B2B technology", "3 projects"],
      ["Beauty & lifestyle", "2 projects"],
      ["Energy & home services", "2 projects"],
      ["Automotive", "1 project"],
      ["Real estate", "Tailored strategies"],
      ["Hospitality & tourism", "Tailored strategies"],
      ["Restaurants & food", "Tailored strategies"],
      ["Health & wellness", "Tailored strategies"],
      ["E-commerce", "Tailored strategies"],
      ["Professional services", "Tailored strategies"],
      ["Education & training", "Tailored strategies"]
    ]
  } : {
    eyebrow: "Secteurs",
    title: "Une expérience dans les secteurs qui font grandir votre activité.",
    intro: "Un aperçu ciblé des secteurs que nous comprenons et accompagnons avec des stratégies digitales adaptées.",
    previous: "Secteurs précédents",
    next: "Secteurs suivants",
    page: "Groupe de secteurs",
    sectors: [
      ["Recrutement", "3 projets"],
      ["Commerce local", "5 projets"],
      ["Fintech", "2 projets"],
      ["Technologie B2B", "3 projets"],
      ["Beauté & lifestyle", "2 projets"],
      ["Énergie & services habitat", "2 projets"],
      ["Automobile", "1 projet"],
      ["Immobilier", "Stratégies adaptées"],
      ["Hôtellerie & tourisme", "Stratégies adaptées"],
      ["Restauration & alimentation", "Stratégies adaptées"],
      ["Santé & bien-être", "Stratégies adaptées"],
      ["E-commerce", "Stratégies adaptées"],
      ["Services professionnels", "Stratégies adaptées"],
      ["Éducation & formation", "Stratégies adaptées"]
    ]
  };

  function sectorCard(item, index) {
    return '<article class="sectors-grid__item">' +
      '<span class="sectors-grid__index" aria-hidden="true">' + String(index + 1).padStart(2, "0") + '</span>' +
      '<h3>' + item[0] + '</h3>' +
      '<p>' + item[1] + '</p>' +
    '</article>';
  }

  var groups = [content.sectors.slice(0, 7), content.sectors.slice(7, 14)];

  function groupMarkup(group, groupIndex) {
    return '<div class="sectors-slider__slide' + (groupIndex === 0 ? ' is-active' : '') + '" data-sector-slide="' + groupIndex + '" aria-hidden="' + (groupIndex === 0 ? 'false' : 'true') + '">' +
      '<div class="sectors-grid">' + group.map(function (item, itemIndex) { return sectorCard(item, groupIndex * 7 + itemIndex); }).join("") + '</div>' +
    '</div>';
  }

  section.classList.add("sectors-section");
  section.innerHTML = '<div class="padding-global"><div class="container-large">' +
    '<div class="sectors-section__inner">' +
      '<div class="sectors-section__heading">' +
        '<div class="tagline-wrapper"><div class="tagline-cube is-blue"></div><div class="text-style-tagline">' + content.eyebrow + '</div></div>' +
        '<h2>' + content.title + '</h2>' +
        '<p>' + content.intro + '</p>' +
      '</div>' +
      '<div class="sectors-slider">' +
        '<div class="sectors-slider__viewport" aria-live="polite">' + groups.map(groupMarkup).join("") + '</div>' +
        '<div class="sectors-slider__controls">' +
          '<span class="sectors-slider__page">01 / 02</span>' +
          '<div><button type="button" class="sectors-slider__button" data-sector-previous aria-label="' + content.previous + '"><span aria-hidden="true">←</span></button>' +
          '<button type="button" class="sectors-slider__button" data-sector-next aria-label="' + content.next + '"><span aria-hidden="true">→</span></button></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div></div>';

  var slides = Array.prototype.slice.call(section.querySelectorAll("[data-sector-slide]"));
  var page = section.querySelector(".sectors-slider__page");
  var current = 0;

  function showSlide(index, direction) {
    current = (index + slides.length) % slides.length;
    slides.forEach(function (slide, slideIndex) {
      var active = slideIndex === current;
      slide.classList.toggle("is-active", active);
      slide.classList.toggle("from-next", active && direction === "next");
      slide.classList.toggle("from-previous", active && direction === "previous");
      slide.setAttribute("aria-hidden", active ? "false" : "true");
    });
    page.textContent = "0" + (current + 1) + " / 0" + slides.length;
    page.setAttribute("aria-label", content.page + " " + (current + 1) + " / " + slides.length);
  }

  section.querySelector("[data-sector-previous]").addEventListener("click", function () { showSlide(current - 1, "previous"); });
  section.querySelector("[data-sector-next]").addEventListener("click", function () { showSlide(current + 1, "next"); });
})();
