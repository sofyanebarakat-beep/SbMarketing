(function () {
  "use strict";
  if (document.querySelector(".sb-project-navigation")) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var prefix = english ? "/en" : "";
  var projects = [
    ["outreachrecruitment", "Outreach Recruitment", ["leads", "websites", "branding", "seo"], "outreach-project-cover.svg", 1440, 810],
    ["outreachrecruitmentportal", "Outreach Recruitment Portal", ["webapps"], "outreachrecruitmentportal-project-cover.png"],
    ["edmondgarage", "Edmond Garage", ["websites", "branding", "seo"], "edmondgarage-project-cover.svg", 1440, 810],
    ["handsonsystems", "HandsOn Systems", ["websites", "branding"], "handsonsystems-project-cover.svg"],
    ["handsonrfid", "Hands On RFID", ["websites", "branding"], "handsonrfid-project-cover.svg"],
    ["handsontaskmaster", "Hands On Taskmaster", ["webapps", "branding"], "handsontaskmaster-project-cover.svg"],
    ["boucheriewalima", "Boucherie Walima", ["websites", "branding", "seo"], "boucheriewalima-project-cover.svg", 1440, 810],
    ["findforsa", "Find Forsa", ["websites", "branding"], "findforsa-project-cover.svg"],
    ["outreachstudy", "Outreach Study", ["webapps", "branding"], "outreachstudy-project-cover.svg"],
    ["angymakeupartist", "Angy Makeup Artist", ["websites", "branding", "seo"], "angymakeupartist-project-cover.svg", 1440, 810],
    ["oddsandmore", "Odds & More", ["websites", "branding"], "oddsandmore-project-cover.svg"],
    ["247payshop", "247Pay Shop", ["websites", "webapps"], "247payshop-project-cover.svg"],
    ["247pay", "247Pay", ["websites", "webapps", "branding"], "247pay-project-cover.svg"],
    ["climanovaenergie", "Climanova Energie", ["websites", "seo", "leads"], "climanovaenergie-project-cover.svg"],
    ["mkmultiservices", "MK Multiservices", ["websites", "seo"], "mkmultiservices-project-cover.svg", 1440, 810]
  ];
  var slugMatch = window.location.pathname.match(/\/projets\/([^/]+?)(?:\.html)?\/?$/);
  var slug = slugMatch ? slugMatch[1] : "";
  var index = projects.findIndex(function (project) { return project[0] === slug; });
  if (index < 0) return;

  var previous = projects[(index - 1 + projects.length) % projects.length];
  var next = projects[(index + 1) % projects.length];
  var others = previous === next ? [next] : [previous, next];

  var labels = english ? {
    heading: "Other projects", previous: "Previous project", next: "Next project"
  } : {
    heading: "Autres projets", previous: "Projet précédent", next: "Projet suivant"
  };
  function url(project) { return prefix + "/projets/" + project[0] + ".html"; }
  function card(project, label) {
    return '<a class="sb-related-project" href="' + url(project) + '"><img src="/images/' + project[3] + '" width="' + (project[4] || 1600) + '" height="' + (project[5] || 1000) + '" loading="lazy" decoding="async" alt=""><span><span><small>' + label + '</small>' + project[1] + '</span><b aria-hidden="true">↗</b></span></a>';
  }
  var section = document.createElement("section");
  section.className = "sb-project-navigation";
  section.setAttribute("aria-label", labels.heading);
  section.innerHTML = '<div class="sb-project-navigation__inner"><h2>' + labels.heading + '</h2><div class="sb-project-navigation__related">' + others.map(function (project) {
    return card(project, project === previous ? labels.previous : labels.next);
  }).join("") + '</div></div>';
  var main = document.querySelector("main") || document.querySelector(".main-wrapper");
  if (main) main.appendChild(section);
})();
