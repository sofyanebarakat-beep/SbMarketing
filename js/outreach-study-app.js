(function () {
  "use strict";

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var copy = english ? {
    eyebrow: "Outreach Study platform",
    title: "The entire student journey, in one application.",
    intro: "A purpose-built workspace that helps the team move every student from first enquiry to enrolment with clarity.",
    imageAlt: "Privacy-safe mockup of the Outreach Study student application dashboard",
    features: [
      ["01", "Applications", "Capture new enquiries, create student profiles and manage every application from one structured workspace."],
      ["02", "Smart workflow", "Move candidates through contacted, booked, interviewed, school and visa stages with visible status controls."],
      ["03", "Documents", "Organise programme files and student documents, identify missing items and follow every review."],
      ["04", "Team coordination", "Assign agents, add internal notes, save comments and keep the complete application history visible."],
      ["05", "Communication", "Use message templates and notifications to send consistent updates at the right moment."],
      ["06", "Analytics & export", "Monitor application volumes and team progress, search records quickly and export structured CSV data."]
    ]
  } : {
    eyebrow: "Plateforme Outreach Study",
    title: "Tout le parcours étudiant, dans une seule application.",
    intro: "Un espace conçu sur mesure pour aider l’équipe à accompagner chaque étudiant, de la première demande jusqu’à l’inscription.",
    imageAlt: "Maquette anonymisée du tableau de bord de candidatures Outreach Study",
    features: [
      ["01", "Candidatures", "Capturer les demandes, créer les profils étudiants et gérer chaque candidature dans un espace structuré."],
      ["02", "Parcours intelligent", "Faire avancer les candidats entre contact, rendez-vous, entretien, école et visa avec des statuts visibles."],
      ["03", "Documents", "Organiser les fichiers programmes et étudiants, identifier les pièces manquantes et suivre chaque vérification."],
      ["04", "Coordination d’équipe", "Attribuer les agents, ajouter des notes internes, enregistrer les commentaires et conserver l’historique."],
      ["05", "Communication", "Utiliser des modèles de messages et des notifications pour informer au bon moment."],
      ["06", "Analyses & export", "Suivre les volumes et la progression, retrouver rapidement un dossier et exporter les données en CSV."]
    ]
  };

  document.querySelectorAll("[data-os-app-showcase]").forEach(function (section) {
    section.className = "os-app-features";
    section.setAttribute("aria-labelledby", "os-app-features-title");
    section.innerHTML = '<div class="os-app-features__panel"><div class="os-app-features__layout"><div class="os-app-features__content"><div class="os-app-features__eyebrow">' + copy.eyebrow + '</div><h2 id="os-app-features-title">' + copy.title + '</h2><p class="os-app-features__intro">' + copy.intro + '</p><div class="os-app-features__list">' + copy.features.map(function (feature) {
      return '<article class="os-app-feature"><span class="os-app-feature__number">' + feature[0] + '</span><div><h3>' + feature[1] + '</h3><p>' + feature[2] + '</p></div></article>';
    }).join("") + '</div></div><figure class="os-app-features__visual"><div class="os-app-features__browser"><div class="os-app-features__bar" aria-hidden="true"><span></span><span></span><span></span></div><img src="/images/outreach-study-app-dashboard.png" alt="' + copy.imageAlt + '" loading="lazy" width="1586" height="992"></div></figure></div></div>';
  });
})();
