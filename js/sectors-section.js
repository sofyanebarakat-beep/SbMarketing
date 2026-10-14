(function () {
  "use strict";

  var section = document.querySelector(".section_case-studies");
  if (!section) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var content = english ? {
    eyebrow: "Sectors",
    title: "Experience across the sectors that drive your growth.",
    intro: "A focused view of the industries where we already deliver digital projects.",
    metric: "projects",
    sectors: [
      ["Recruitment", 3],
      ["Local commerce", 5],
      ["Fintech", 2],
      ["B2B technology", 3],
      ["Beauty & lifestyle", 2],
      ["Energy & home services", 2]
    ]
  } : {
    eyebrow: "Secteurs",
    title: "Une expérience dans les secteurs qui font grandir votre activité.",
    intro: "Un aperçu ciblé des secteurs dans lesquels nous avons déjà livré des projets digitaux.",
    metric: "projets",
    sectors: [
      ["Recrutement", 3],
      ["Commerce local", 5],
      ["Fintech", 2],
      ["Technologie B2B", 3],
      ["Beauté & lifestyle", 2],
      ["Énergie & services habitat", 2]
    ]
  };

  function sectorCard(item, index) {
    var count = item[1];
    var metric = count + " " + content.metric;
    return '<article class="sectors-grid__item">' +
      '<span class="sectors-grid__index" aria-hidden="true">0' + (index + 1) + '</span>' +
      '<h3>' + item[0] + '</h3>' +
      '<p>' + metric + '</p>' +
    '</article>';
  }

  section.classList.add("sectors-section");
  section.innerHTML = '<div class="padding-global"><div class="container-large">' +
    '<div class="sectors-section__inner">' +
      '<div class="sectors-section__heading">' +
        '<div class="tagline-wrapper"><div class="tagline-cube is-blue"></div><div class="text-style-tagline">' + content.eyebrow + '</div></div>' +
        '<h2>' + content.title + '</h2>' +
        '<p>' + content.intro + '</p>' +
      '</div>' +
      '<div class="sectors-grid">' + content.sectors.map(sectorCard).join("") + '</div>' +
    '</div>' +
  '</div></div>';
})();
