(function () {
  "use strict";

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var copy = english ? {
    eyebrow: "Outreach Study web application",
    title: "Built Around the Entire Student Journey",
    intro: "A complete workspace for managing enquiries, applications, documents, communication and every operational step—from first contact to school and visa processing.",
    features: [
      ["Dashboard", "A clear overview of applications, priorities and daily activity."],
      ["Lead management", "Capture, organise and convert new student enquiries."],
      ["Application management", "Manage every candidate and application in one place."],
      ["Student profiles", "Keep essential student information structured and accessible."],
      ["Programme documents", "Centralise programme information and required files."],
      ["Document management", "Upload, review, approve and request replacement documents."],
      ["Workflow stages", "Move students through a clear, step-by-step process."],
      ["Status tracking", "Track new, contacted, booked, interviewed and active applications."],
      ["School & visa process", "Follow progress after applications are sent to institutions."],
      ["Appointments", "Coordinate bookings and important student sessions."],
      ["Interview management", "Plan and monitor interviews within the same workspace."],
      ["Message templates", "Create consistent communications for recurring situations."],
      ["Automated notifications", "Keep students and teams informed about important updates."],
      ["Internal notes", "Share application context and next actions with the team."],
      ["Comments & updates", "Record decisions and maintain a visible activity history."],
      ["Agents", "Assign applications and coordinate counsellor workloads."],
      ["Role permissions", "Give each user the appropriate level of access."],
      ["Priority marking", "Highlight important applications for faster follow-up."],
      ["Not-interested management", "Organise unresponsive, inactive and older enquiries."],
      ["Search & filters", "Find students quickly by name, email, stage or status."],
      ["Quick actions", "Update records and move applications without unnecessary steps."],
      ["Data analytics", "Understand volumes, progress and operational performance."],
      ["CSV export", "Export structured application data for reporting and operations."],
      ["Application history", "Keep a traceable timeline of progress and changes."]
    ]
  } : {
    eyebrow: "Application web Outreach Study",
    title: "Conçue autour de tout le parcours étudiant",
    intro: "Un espace complet pour gérer les demandes, les candidatures, les documents, la communication et chaque étape opérationnelle — du premier contact jusqu’au traitement école et visa.",
    features: [
      ["Tableau de bord", "Une vue claire des candidatures, priorités et activités quotidiennes."],
      ["Gestion des prospects", "Capturer, organiser et convertir les nouvelles demandes étudiantes."],
      ["Gestion des candidatures", "Piloter chaque candidat et chaque dossier au même endroit."],
      ["Profils étudiants", "Centraliser les informations essentielles de chaque étudiant."],
      ["Documents programmes", "Regrouper les informations et fichiers requis par programme."],
      ["Gestion documentaire", "Importer, vérifier, approuver ou demander un remplacement."],
      ["Étapes du parcours", "Faire avancer les étudiants dans un processus clair et structuré."],
      ["Suivi des statuts", "Suivre les nouveaux contacts, réservations, entretiens et dossiers actifs."],
      ["Processus école & visa", "Suivre les dossiers envoyés aux établissements et leur avancement."],
      ["Rendez-vous", "Coordonner les réservations et sessions importantes des étudiants."],
      ["Gestion des entretiens", "Planifier et suivre les entretiens depuis le même espace."],
      ["Modèles de messages", "Créer des communications cohérentes pour les situations récurrentes."],
      ["Notifications automatiques", "Informer les étudiants et l’équipe des mises à jour importantes."],
      ["Notes internes", "Partager le contexte du dossier et les prochaines actions avec l’équipe."],
      ["Commentaires & mises à jour", "Conserver les décisions et un historique visible de l’activité."],
      ["Gestion des agents", "Attribuer les dossiers et coordonner la charge des conseillers."],
      ["Permissions par rôle", "Donner à chaque utilisateur le niveau d’accès approprié."],
      ["Marquage prioritaire", "Mettre en avant les candidatures qui exigent un suivi rapide."],
      ["Gestion des non-intéressés", "Classer les demandes sans réponse, inactives ou anciennes."],
      ["Recherche & filtres", "Retrouver rapidement un étudiant par nom, e-mail, étape ou statut."],
      ["Actions rapides", "Mettre à jour et déplacer les dossiers sans étapes inutiles."],
      ["Analyse des données", "Comprendre les volumes, la progression et les performances."],
      ["Export CSV", "Exporter les candidatures structurées pour le reporting et les opérations."],
      ["Historique des candidatures", "Conserver une chronologie traçable des progrès et changements."]
    ]
  };

  document.querySelectorAll("[data-os-app-showcase]").forEach(function (section) {
    var midpoint = Math.ceil(copy.features.length / 2);
    var columns = [copy.features.slice(0, midpoint), copy.features.slice(midpoint)];
    section.className = "os-app-features";
    section.setAttribute("aria-labelledby", "os-app-features-title");
    section.innerHTML = '<div class="os-app-features__panel"><header class="os-app-features__header"><div class="os-app-features__eyebrow">' + copy.eyebrow + '</div><h2 id="os-app-features-title">' + copy.title + '</h2><p class="os-app-features__intro">' + copy.intro + '</p></header><div class="os-app-features__grid">' + columns.map(function (column) {
      return '<div class="os-app-features__column">' + column.map(function (feature) {
        return '<article class="os-app-feature"><span class="os-app-feature__icon" aria-hidden="true">✓</span><div><h3>' + feature[0] + '</h3><p>' + feature[1] + '</p></div></article>';
      }).join("") + '</div>';
    }).join("") + '</div></div>';
  });
})();
