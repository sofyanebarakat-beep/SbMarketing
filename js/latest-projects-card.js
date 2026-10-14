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
      href: "/en/projets/boucheriedounia.html"
    },
    {
      title: "Outreach Recruitment",
      type: "Website · Recruitment platform",
      description: "A complete digital experience built to attract candidates and employers.",
      href: "/en/projets/outreachrecruitment.html"
    },
    {
      title: "Outreach Recruitment App",
      type: "Web application · Product design",
      description: "A streamlined recruitment app for managing talent and opportunities.",
      href: "/en/projets/outreachrecruitmentapp.html"
    },
    {
      title: "Edmond Garage",
      type: "Website · Local visibility",
      description: "A clear digital presence that makes local vehicle services easy to discover.",
      href: "/en/projets/edmondgarage.html"
    },
    {
      title: "Find Forsa",
      type: "Web platform · Education",
      description: "An accessible learning platform designed to guide users toward new opportunities.",
      href: "/en/projets/findforsa.html"
    },
    {
      title: "247Pay",
      type: "Fintech · Digital experience",
      description: "A clear digital presentation for a modern B2B payment solution.",
      href: "/en/projets/247pay.html"
    },
    {
      title: "Climanova Energie",
      type: "Website · Lead generation",
      description: "A conversion-focused website for an energy and home-services specialist.",
      href: "/en/projets/climanovaenergie.html"
    }
  ] : [
    {
      title: "Boucherie Dounia",
      type: "Site web · Identité visuelle",
      description: "Un site local moderne conçu pour inspirer confiance et générer des visites.",
      href: "/projets/boucheriedounia.html"
    },
    {
      title: "Outreach Recruitment",
      type: "Site web · Plateforme de recrutement",
      description: "Une expérience digitale complète pour attirer candidats et entreprises.",
      href: "/projets/outreachrecruitment.html"
    },
    {
      title: "Outreach Recruitment App",
      type: "Application web · Design produit",
      description: "Une application de recrutement fluide pour gérer talents et opportunités.",
      href: "/projets/outreachrecruitmentapp.html"
    },
    {
      title: "Edmond Garage",
      type: "Site web · Visibilité locale",
      description: "Une présence digitale claire pour rendre les services automobiles faciles à trouver.",
      href: "/projets/edmondgarage.html"
    },
    {
      title: "Find Forsa",
      type: "Plateforme web · Éducation",
      description: "Une plateforme d’apprentissage accessible conçue pour guider vers de nouvelles opportunités.",
      href: "/projets/findforsa.html"
    },
    {
      title: "247Pay",
      type: "Fintech · Expérience digitale",
      description: "Une présentation digitale claire pour une solution de paiement B2B moderne.",
      href: "/projets/247pay.html"
    },
    {
      title: "Climanova Energie",
      type: "Site web · Génération de leads",
      description: "Un site orienté conversion pour un spécialiste de l’énergie et des services habitat.",
      href: "/projets/climanovaenergie.html"
    }
  ];
  var labels = english ? {
    eyebrow: "Latest projects",
    action: "View project",
    count: "7 projects",
    region: "Latest projects"
  } : {
    eyebrow: "Derniers projets",
    action: "Voir le projet",
    count: "7 projets",
    region: "Derniers projets"
  };

  function projectMarkup(project, index, clone) {
    return '<article class="latest-project-card__item" data-project-item="' + index + '"' + (clone ? ' aria-hidden="true"' : '') + '>' +
      '<div class="latest-project-card__content"><p class="latest-project-card__type">' + project.type + '</p><h3>' + project.title + '</h3><p class="latest-project-card__description">' + project.description + '</p></div>' +
      '<a class="latest-project-card__link" href="' + project.href + '" aria-label="' + labels.action + ' — ' + project.title + '"' + (clone ? ' tabindex="-1"' : '') + '><span>' + labels.action + '</span></a>' +
    '</article>';
  }

  card.classList.add("latest-project-card");
  card.innerHTML = '<div class="latest-project-card__header"><span>' + labels.eyebrow + '</span><span>' + labels.count + '</span></div>' +
    '<div class="latest-project-card__viewport" role="region" aria-label="' + labels.region + '"><div class="latest-project-card__track">' +
      projects.map(function (project, index) { return projectMarkup(project, index, false); }).join("") +
      projects.slice(0, 3).map(function (project, index) { return projectMarkup(project, index, true); }).join("") +
    '</div></div>';

  var track = card.querySelector(".latest-project-card__track");
  var firstItem = card.querySelector(".latest-project-card__item");
  var current = 0;
  var timer;
  var resetTimer;

  function setPosition(animate) {
    var rowHeight = firstItem.getBoundingClientRect().height;
    track.style.transition = animate ? "transform 0.65s cubic-bezier(0.22, 1, 0.36, 1)" : "none";
    track.style.transform = "translate3d(0," + (-current * rowHeight) + "px,0)";
  }

  function advance() {
    current += 1;
    setPosition(true);
    if (current === projects.length) {
      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(function () {
        current = 0;
        setPosition(false);
      }, 680);
    }
  }

  function start() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    window.clearInterval(timer);
    timer = window.setInterval(advance, 3200);
  }

  function stop() {
    window.clearInterval(timer);
  }

  card.addEventListener("mouseenter", stop);
  card.addEventListener("mouseleave", start);
  card.addEventListener("focusin", stop);
  card.addEventListener("focusout", start);
  window.addEventListener("resize", function () { setPosition(false); }, { passive: true });
  setPosition(false);
  start();
})();
