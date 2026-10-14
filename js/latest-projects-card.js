(function () {
  "use strict";

  var card = document.getElementById("w-node-c7205946-1fc5-f34e-333d-506597463021-f88eecce");
  if (!card) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var projects = english ? [
    {
      title: "Boucherie Dounia",
      type: "Website · Brand identity",
      description: "A modern local website designed to build trust and drive store visits.",
      image: "/images/boucheriedounia-project-cover.svg",
      href: "/en/projets/boucheriedounia.html"
    },
    {
      title: "Outreach Recruitment",
      type: "Website · Recruitment platform",
      description: "A complete digital experience built to attract candidates and employers.",
      image: "/images/outreach-project-cover.svg",
      href: "/en/projets/outreachrecruitment.html"
    },
    {
      title: "Outreach Recruitment App",
      type: "Web application · Product design",
      description: "A streamlined recruitment app for managing talent and opportunities.",
      image: "/images/outreachrecruitmentapp-project-cover.svg",
      href: "/en/projets/outreachrecruitmentapp.html"
    }
  ] : [
    {
      title: "Boucherie Dounia",
      type: "Site web · Identité visuelle",
      description: "Un site local moderne conçu pour inspirer confiance et générer des visites.",
      image: "/images/boucheriedounia-project-cover.svg",
      href: "/projets/boucheriedounia.html"
    },
    {
      title: "Outreach Recruitment",
      type: "Site web · Plateforme de recrutement",
      description: "Une expérience digitale complète pour attirer candidats et entreprises.",
      image: "/images/outreach-project-cover.svg",
      href: "/projets/outreachrecruitment.html"
    },
    {
      title: "Outreach Recruitment App",
      type: "Application web · Design produit",
      description: "Une application de recrutement fluide pour gérer talents et opportunités.",
      image: "/images/outreachrecruitmentapp-project-cover.svg",
      href: "/projets/outreachrecruitmentapp.html"
    }
  ];
  var labels = english ? {
    eyebrow: "Latest projects",
    action: "View project",
    region: "Latest projects carousel"
  } : {
    eyebrow: "Derniers projets",
    action: "Voir le projet",
    region: "Carrousel des derniers projets"
  };

  function projectMarkup(project, index) {
    return '<article class="latest-project-card__slide' + (index === 0 ? ' is-active' : '') + '" data-project-slide="' + index + '" aria-hidden="' + (index === 0 ? 'false' : 'true') + '">' +
      '<div class="latest-project-card__visual"><img src="' + project.image + '" alt="' + project.title + ' — ' + project.type + '" loading="lazy"></div>' +
      '<div class="latest-project-card__content">' +
        '<p class="latest-project-card__type">' + project.type + '</p>' +
        '<h3>' + project.title + '</h3>' +
        '<p class="latest-project-card__description">' + project.description + '</p>' +
        '<a href="' + project.href + '">' + labels.action + '<span aria-hidden="true">↗</span></a>' +
      '</div>' +
    '</article>';
  }

  card.classList.add("latest-project-card");
  card.innerHTML = '<div class="latest-project-card__header"><span>' + labels.eyebrow + '</span><span class="latest-project-card__counter" aria-live="polite">01 / 0' + projects.length + '</span></div>' +
    '<div class="latest-project-card__stack" role="region" aria-label="' + labels.region + '">' + projects.map(projectMarkup).join("") + '</div>' +
    '<div class="latest-project-card__progress" aria-hidden="true"><span></span></div>';

  var slides = Array.prototype.slice.call(card.querySelectorAll("[data-project-slide]"));
  var counter = card.querySelector(".latest-project-card__counter");
  var progress = card.querySelector(".latest-project-card__progress span");
  var current = 0;
  var timer;

  function show(index) {
    current = index;
    slides.forEach(function (slide, slideIndex) {
      var active = slideIndex === current;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", active ? "false" : "true");
      var link = slide.querySelector("a");
      if (link) link.tabIndex = active ? 0 : -1;
    });
    counter.textContent = "0" + (current + 1) + " / 0" + slides.length;
    progress.classList.remove("is-running");
    void progress.offsetWidth;
    progress.classList.add("is-running");
  }

  function start() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.clearInterval(timer);
    timer = window.setInterval(function () { show((current + 1) % slides.length); }, 4500);
    progress.classList.add("is-running");
  }

  function stop() {
    window.clearInterval(timer);
    progress.classList.remove("is-running");
  }

  card.addEventListener("mouseenter", stop);
  card.addEventListener("mouseleave", start);
  card.addEventListener("focusin", stop);
  card.addEventListener("focusout", start);
  show(0);
  start();
})();
