(function () {
  "use strict";

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var copy = english ? {
    label: "Digital platform", title: "One platform. The entire student journey.",
    intro: "A custom application that centralises applications, documents, communication and every important step of the study journey.",
    badge: "Designed & developed by SB Marketing", future: "Your future starts here.",
    side: "Explore the application journey designed to guide every student clearly, from their first enquiry to admission.",
    steps: ["Student profile", "Study plan", "Documents"], demo: "Interactive demonstration", create: "Create an application",
    hint: "Complete this demonstration form to discover the management workspace.", name: "Full name", email: "Email", destination: "Destination", program: "Programme", level: "Study level",
    submit: "Submit and view dashboard", privacy: "Demonstration only — no data is sent or stored.", dashboard: "Dashboard", overview: "Application overview", back: "Back to form",
    added: "Application added to the dashboard.", nav: ["Dashboard", "Applications", "Documents", "Interviews", "Messages", "Analytics"],
    stats: ["New", "Contacted", "Interviews", "Admissions"], all: "All applications", search: "Search students…", columns: ["Student", "Programme", "Status", "Progress"],
    statuses: ["New", "Contacted", "Interview", "Admission"], journeyLabel: "Connected journey", journeyTitle: "From enquiry to arrival.", journey: ["Lead", "Interview", "Application", "Documents", "Admission", "Visa", "Arrival"]
  } : {
    label: "Plateforme digitale", title: "Une plateforme. Tout le parcours étudiant.",
    intro: "Une application sur mesure qui centralise les candidatures, les documents, les échanges et chaque étape importante du projet d’études.",
    badge: "Conçue & développée par SB Marketing", future: "Votre avenir commence ici.",
    side: "Découvrez le parcours de candidature imaginé pour guider chaque étudiant avec clarté, de la première demande à l’admission.",
    steps: ["Profil étudiant", "Projet d’études", "Documents"], demo: "Démonstration interactive", create: "Créer une candidature",
    hint: "Remplissez ce formulaire de démonstration pour découvrir l’espace de suivi.", name: "Nom complet", email: "E-mail", destination: "Destination", program: "Programme", level: "Niveau d’études",
    submit: "Envoyer et voir le tableau de bord", privacy: "Démonstration uniquement — aucune donnée n’est envoyée ou enregistrée.", dashboard: "Tableau de bord", overview: "Vue d’ensemble des candidatures", back: "Revoir le formulaire",
    added: "Candidature ajoutée au tableau de bord.", nav: ["Tableau de bord", "Candidatures", "Documents", "Entretiens", "Messages", "Analyses"],
    stats: ["Nouvelles", "Contactées", "Entretiens", "Admissions"], all: "Toutes les candidatures", search: "Rechercher un étudiant…", columns: ["Étudiant", "Programme", "Statut", "Progression"],
    statuses: ["Nouvelle", "Contacté", "Entretien", "Admission"], journeyLabel: "Parcours connecté", journeyTitle: "De la demande à l’arrivée.", journey: ["Prospect", "Entretien", "Candidature", "Documents", "Admission", "Visa", "Arrivée"]
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[character];
    });
  }

  document.querySelectorAll("[data-os-app-showcase]").forEach(function (section) {
    section.className = "os-app-showcase";
    section.setAttribute("aria-labelledby", "os-app-title");
    section.innerHTML = '<div class="os-app-showcase__inner">' +
      '<div class="os-app-showcase__intro"><div class="os-app-showcase__label">' + copy.label + '</div><h2 id="os-app-title">' + copy.title + '</h2><p>' + copy.intro + '</p><div class="os-app-showcase__badge">' + copy.badge + '</div></div>' +
      '<div class="os-demo" data-os-app-demo><div class="os-demo__chrome" aria-hidden="true"><span class="os-demo__dot"></span><span class="os-demo__dot"></span><span class="os-demo__dot"></span><span class="os-demo__address"></span></div><div class="os-demo__stage">' +
      '<div class="os-demo__panel is-active" data-os-panel="form" aria-hidden="false"><div class="os-form-view"><aside class="os-form-view__aside"><div class="os-form-view__brand">Outreach Study</div><div><h3>' + copy.future + '</h3><p>' + copy.side + '</p><div class="os-form-view__steps">' + copy.steps.map(function (step, index) { return '<div class="os-form-view__step' + (index === 0 ? ' is-active' : '') + '"><span>' + (index + 1) + '</span>' + step + '</div>'; }).join("") + '</div></div></aside>' +
      '<div class="os-form-view__content"><form class="os-form" data-os-form><div class="os-form__eyebrow">' + copy.demo + '</div><h3>' + copy.create + '</h3><p class="os-form__hint">' + copy.hint + '</p><div class="os-form__grid">' +
      '<div class="os-form__field"><label for="os-name">' + copy.name + '</label><input id="os-name" name="student-name" value="Camille Martin" required></div><div class="os-form__field"><label for="os-email">' + copy.email + '</label><input id="os-email" type="email" value="camille@example.com" required></div>' +
      '<div class="os-form__field"><label for="os-country">' + copy.destination + '</label><select id="os-country"><option>' + (english ? 'United Kingdom' : 'Royaume-Uni') + '</option><option>Canada</option><option>Malta</option></select></div><div class="os-form__field"><label for="os-program">' + copy.program + '</label><select id="os-program"><option>Business &amp; Management</option><option>Information Technology</option><option>Health &amp; Social Care</option></select></div>' +
      '<div class="os-form__field os-form__field--wide"><label for="os-level">' + copy.level + '</label><select id="os-level"><option>Master</option><option>Bachelor</option><option>English programme</option></select></div></div><button class="os-form__submit" type="submit">' + copy.submit + ' <span aria-hidden="true">→</span></button><div class="os-form__privacy">' + copy.privacy + '</div></form></div></div></div>' +
      '<div class="os-demo__panel" data-os-panel="dashboard" aria-hidden="true"><div class="os-dashboard"><aside class="os-dashboard__sidebar"><div class="os-dashboard__logo">Outreach Study</div><nav class="os-dashboard__nav" aria-label="' + copy.dashboard + '">' + copy.nav.map(function (item, index) { return '<div class="os-dashboard__nav-item' + (index === 0 ? ' is-active' : '') + '">' + item + '</div>'; }).join("") + '</nav></aside>' +
      '<div class="os-dashboard__main"><div class="os-dashboard__top"><div><h3>' + copy.dashboard + '</h3><p>' + copy.overview + '</p></div><button class="os-dashboard__reset" type="button" data-os-reset>← ' + copy.back + '</button></div><div class="os-dashboard__notice">✓ <strong data-os-applicant-name>Camille Martin</strong> — ' + copy.added + '</div>' +
      '<div class="os-dashboard__stats">' + copy.stats.map(function (stat, index) { return '<div class="os-dashboard__stat"><span>' + stat + '</span><strong>' + [12,48,9,6][index] + '</strong></div>'; }).join("") + '</div><div class="os-dashboard__card"><div class="os-dashboard__card-head"><strong>' + copy.all + '</strong><span class="os-dashboard__search">' + copy.search + '</span></div><div class="os-dashboard__table"><div class="os-dashboard__row os-dashboard__row--head">' + copy.columns.map(function (column) { return '<span>' + column + '</span>'; }).join("") + '</div>' +
      [["Camille Martin","camille@example.com","Business",0,"20%"],["Alex Morgan","alex@example.com","English",1,"45%"],["Samira Benali","samira@example.com","Technology",2,"70%"],["Jamie Lee","jamie@example.com","Healthcare",3,"90%"]].map(function (row, index) { return '<div class="os-dashboard__row"><div class="os-dashboard__person"><strong' + (index === 0 ? ' data-os-applicant-name' : '') + '>' + escapeHtml(row[0]) + '</strong><span>' + escapeHtml(row[1]) + '</span></div><span class="os-dashboard__cell">' + row[2] + '</span><span><span class="os-dashboard__status' + (index === 0 ? ' os-dashboard__status--purple' : '') + '">' + copy.statuses[row[3]] + '</span></span><span class="os-dashboard__cell">' + row[4] + '</span></div>'; }).join("") + '</div></div></div></div></div></div></div></div>' +
      '<div class="os-journey"><div class="os-app-showcase__label">' + copy.journeyLabel + '</div><h3>' + copy.journeyTitle + '</h3><div class="os-journey__steps">' + copy.journey.map(function (step, index) { return '<div class="os-journey__step' + (index === 0 ? ' is-active' : '') + '">' + step + '</div>'; }).join("") + '</div></div></div>';
  });

  document.querySelectorAll("[data-os-app-demo]").forEach(function (demo) {
    var form = demo.querySelector("[data-os-form]");
    var formPanel = demo.querySelector("[data-os-panel='form']");
    var dashboardPanel = demo.querySelector("[data-os-panel='dashboard']");
    var resetButton = demo.querySelector("[data-os-reset]");
    var applicantNames = demo.querySelectorAll("[data-os-applicant-name]");

    if (!form || !formPanel || !dashboardPanel) return;

    function show(panel, focusTarget) {
      formPanel.classList.toggle("is-active", panel === formPanel);
      dashboardPanel.classList.toggle("is-active", panel === dashboardPanel);
      formPanel.setAttribute("aria-hidden", panel === formPanel ? "false" : "true");
      dashboardPanel.setAttribute("aria-hidden", panel === dashboardPanel ? "false" : "true");
      if (focusTarget) window.setTimeout(function () { focusTarget.focus(); }, 480);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var nameField = form.querySelector("[name='student-name']");
      if (nameField && nameField.value.trim()) applicantNames.forEach(function (node) { node.textContent = nameField.value.trim(); });
      show(dashboardPanel, resetButton);
    });

    if (resetButton) resetButton.addEventListener("click", function () {
      show(formPanel, form.querySelector("[name='student-name']"));
    });
  });
})();
