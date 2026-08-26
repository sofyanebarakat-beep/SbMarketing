(function () {
  "use strict";
  if (document.querySelector(".sb-project-navigation")) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var prefix = english ? "/en" : "";
  var projects = [
    ["outreachrecruitment", "Outreach Recruitment", ["leads", "websites", "branding", "seo"], "outreach-project-cover.svg", 1440, 810],
    ["outreachrecruitmentapp", "Outreach Recruitment App", ["webapps"], "outreachrecruitmentapp-project-cover.svg"],
    ["edmondgarage", "Edmond Garage", ["websites", "branding", "seo"], "edmondgarage-project-cover.svg", 1440, 810],
    ["handsonsystems", "HandsOn Systems", ["websites", "branding"], "handsonsystems-project-cover.svg"],
    ["handsonrfid", "Hands On RFID", ["websites", "branding"], "handsonrfid-project-cover.svg"],
    ["handsontaskmaster", "Hands On Taskmaster", ["webapps", "branding"], "handsontaskmaster-project-cover.svg"],
    ["boucheriewalima", "Boucherie Walima", ["websites", "branding", "seo"], "boucheriewalima-project-cover.svg", 1440, 810],
    ["cimatti", "Cimatti", ["websites", "branding", "seo"], "cimatti-project-cover.svg"],
    ["findforsa", "Find Forsa", ["websites", "branding"], "findforsa-project-cover.svg"],
    ["outreachstudy", "Outreach Study", ["websites", "branding"], "outreachstudy-project-cover.svg"],
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

  var current = projects[index];
  var previous = projects[(index - 1 + projects.length) % projects.length];
  var next = projects[(index + 1) % projects.length];
  var related = projects.filter(function (project, projectIndex) {
    return projectIndex !== index && project[2].some(function (category) { return current[2].indexOf(category) !== -1; });
  }).sort(function (a, b) {
    var scoreA = a[2].filter(function (category) { return current[2].indexOf(category) !== -1; }).length;
    var scoreB = b[2].filter(function (category) { return current[2].indexOf(category) !== -1; }).length;
    return scoreB - scoreA;
  }).slice(0, 3);

  var labels = english ? {
    back: "Back to filtered results", previous: "Previous project", next: "Next project", related: "Related projects", position: "Project"
  } : {
    back: "Retour aux résultats filtrés", previous: "Projet précédent", next: "Projet suivant", related: "Projets similaires", position: "Projet"
  };
  var returnUrl = prefix + "/projets/";
  try {
    var saved = sessionStorage.getItem("sb-portfolio-return");
    if (saved && saved.indexOf(prefix + "/projets/") === 0 && saved.indexOf(".html") === -1) returnUrl = saved;
  } catch (error) {}
  function url(project) { return prefix + "/projets/" + project[0] + ".html"; }
  function relatedCard(project) {
    return '<a class="sb-related-project" href="' + url(project) + '"><img src="/images/' + project[3] + '" width="' + (project[4] || 1600) + '" height="' + (project[5] || 1000) + '" loading="lazy" decoding="async" alt=""><span>' + project[1] + '<b aria-hidden="true">↗</b></span></a>';
  }
  var section = document.createElement("section");
  section.className = "sb-project-navigation";
  section.setAttribute("aria-label", english ? "Project navigation" : "Navigation entre les projets");
  section.innerHTML = '<div class="sb-project-navigation__inner"><div class="sb-project-navigation__top"><a class="sb-project-navigation__back" href="' + returnUrl + '">← ' + labels.back + '</a><span class="sb-project-navigation__position">' + labels.position + ' ' + (index + 1) + ' / ' + projects.length + '</span></div><nav class="sb-project-navigation__pager"><a href="' + url(previous) + '"><span aria-hidden="true">←</span><span><small>' + labels.previous + '</small><strong>' + previous[1] + '</strong></span></a><a href="' + url(next) + '"><span><small>' + labels.next + '</small><strong>' + next[1] + '</strong></span><span aria-hidden="true">→</span></a></nav><h2>' + labels.related + '</h2><div class="sb-project-navigation__related">' + related.map(relatedCard).join("") + '</div></div>';
  var main = document.querySelector("main") || document.querySelector(".main-wrapper");
  if (main) main.appendChild(section);
})();
