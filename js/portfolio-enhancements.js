(function () {
  "use strict";

  var list = document.querySelector(".portfolio8_list");
  if (!list || document.querySelector(".sb-portfolio-toolbar")) return;

  var english = document.documentElement.lang.toLowerCase().indexOf("en") === 0;
  var copy = english ? {
    all: "All", websites: "Websites", branding: "Branding", webapps: "Web apps", seo: "SEO", leads: "Lead generation",
    count: "projects shown", featured: "Featured case study", filterTitle: "Explore by expertise", filterHint: "Choose a service to view relevant work",
    view: "View case study",
    quote: "We tried four agencies before Sb Marketing, and this is the only one that helped the company take off. Their call center was the game changer!",
    quoteBy: "Samuel — President, Fenestria · Google review"
  } : {
    all: "Tous", websites: "Sites web", branding: "Image de marque", webapps: "Applications web", seo: "SEO", leads: "Génération de leads",
    count: "projets affichés", featured: "Étude de cas à la une", filterTitle: "Explorer par expertise", filterHint: "Choisissez un service pour voir les projets associés",
    view: "Voir l’étude de cas",
    quote: "On a essayé 4 agences avant Sb Marketing et c’est la seule qui a réussi à lever la compagnie. Le game changer, c'est leur centre d'appel !",
    quoteBy: "Samuel — Président, Fenestria · Avis Google"
  };

  var projects = {
    "Outreach Recruitment": { c: ["websites", "branding", "seo", "leads"], industry: ["Recrutement", "Recruitment"], d: ["Cabinet de recrutement spécialisé", "Specialist recruitment agency"], result: ["800+", "leads mensuels", "monthly leads"] },
    "Outreach Recruitment App": { c: ["webapps"], industry: ["HR Tech", "HR Tech"], d: ["Application de recrutement et plateforme RH", "Recruitment app and HR platform"] },
    "Edmond Garage": { c: ["websites", "branding", "seo"], industry: ["Automobile", "Automotive"], d: ["Transport privé à Malte et Gozo", "Private transport in Malta and Gozo"], result: ["UX", "pensée pour les réservations", "built for bookings"] },
    "HandsOn Systems": { c: ["websites", "branding"], industry: ["Technologie", "Technology"], d: ["Solutions technologiques B2B", "B2B technology solutions"] },
    "Hands On RFID": { c: ["websites", "branding"], industry: ["SaaS", "SaaS"], d: ["Solutions RFID pour les entreprises", "RFID solutions for businesses"] },
    "Hands On Taskmaster": { c: ["webapps", "branding"], industry: ["SaaS", "SaaS"], d: ["Plateforme de gestion des tâches", "Task management platform"] },
    "Boucherie Walima": { c: ["websites", "branding", "seo"], industry: ["Commerce local", "Local business"], d: ["Boucherie et commerce alimentaire local", "Local butcher and food retailer"] },
    "Cimatti": { c: ["websites", "branding", "seo"], industry: ["Industrie", "Industrial"], d: ["Solutions techniques pour professionnels", "Technical solutions for businesses"] },
    "Find Forsa": { c: ["websites", "branding"], industry: ["Recrutement", "Recruitment"], d: ["Plateforme d’opportunités professionnelles", "Career opportunities platform"] },
    "Outreach Study": { c: ["websites", "branding"], industry: ["Éducation", "Education"], d: ["Accompagnement des études à l’international", "International study support"] },
    "Angy Makeup Artist": { c: ["websites", "branding", "seo"], industry: ["Beauté", "Beauty"], d: ["Maquillage professionnel et beauté", "Professional makeup and beauty"] },
    "Odds & More": { c: ["websites", "branding"], industry: ["Média", "Media"], d: ["Plateforme de contenu sportif", "Sports content platform"] },
    "247Pay Shop": { c: ["websites", "webapps"], industry: ["Fintech", "Fintech"], d: ["Expérience e-commerce et paiement", "E-commerce and payment experience"] },
    "247Pay": { c: ["websites", "webapps", "branding"], industry: ["Fintech", "Fintech"], d: ["Marque fintech et expérience digitale", "Fintech brand and digital experience"], result: ["UX", "parcours orienté conversion", "conversion-ready journey"] },
    "Climanova Energie": { c: ["websites", "seo", "leads"], industry: ["Énergie", "Energy"], d: ["Solutions énergétiques et climatisation", "Energy and climate solutions"] },
    "MK Multiservices": { c: ["websites", "seo"], industry: ["Commerce local", "Local business"], d: ["Services administratifs et automobiles à Nice", "Administrative and automotive services in Nice"] }
  };
  var featured = ["Outreach Recruitment", "247Pay", "Edmond Garage"];
  var categoryOrder = ["all", "websites", "branding", "webapps", "seo", "leads"];
  var categoryCounts = { all: 16, websites: 14, branding: 12, webapps: 4, seo: 7, leads: 2 };
  var items = Array.prototype.slice.call(list.querySelectorAll(":scope > .w-dyn-item"));

  function saveReturnLocation() {
    try { sessionStorage.setItem("sb-portfolio-return", window.location.pathname + window.location.search); } catch (error) {}
  }

  items.forEach(function (item) {
    var titleNode = item.querySelector("h3");
    var title = titleNode ? titleNode.textContent.trim() : "";
    var meta = projects[title] || { c: ["websites"], industry: ["Digital", "Digital"], d: ["Projet digital", "Digital project"] };
    item.dataset.categories = meta.c.join(" ");
    if (featured.indexOf(title) !== -1) item.classList.add("sb-project-featured");

    var description = item.querySelector(".portfolio8_item-content-top > .text-size-regular");
    if (description) description.textContent = meta.d[english ? 1 : 0];
    var imageWrap = item.querySelector(".portfolio8_image-wrapper");
    if (imageWrap) {
      var industry = document.createElement("span");
      industry.className = "sb-project-industry";
      industry.textContent = meta.industry[english ? 1 : 0];
      imageWrap.appendChild(industry);
      if (meta.result) {
        var result = document.createElement("span");
        result.className = "sb-project-result";
        result.innerHTML = "<strong>" + meta.result[0] + "</strong><span>" + meta.result[english ? 2 : 1] + "</span>";
        imageWrap.appendChild(result);
      }
      var action = document.createElement("span");
      action.className = "sb-project-action";
      action.innerHTML = copy.view + " <span aria-hidden=\"true\">↗</span>";
      imageWrap.appendChild(action);
    }
    var contentTop = item.querySelector(".portfolio8_item-content-top");
    if (contentTop && featured.indexOf(title) !== -1) {
      var featureLabel = document.createElement("div");
      featureLabel.className = "sb-featured-label";
      featureLabel.textContent = copy.featured;
      contentTop.insertBefore(featureLabel, contentTop.firstChild);
    }
    var tagList = item.querySelector(".portfolio-header11_tag-list");
    if (tagList) {
      tagList.innerHTML = meta.c.map(function (category) {
        return '<button class="portfolio-header11_tag-item" type="button" data-project-filter="' + category + '">' + copy[category] + '</button>';
      }).join("");
    }
    var primaryLink = item.querySelector("a[href]");
    var card = item.querySelector(".portfolio8_item");
    if (card && primaryLink) {
      card.setAttribute("tabindex", "0");
      card.setAttribute("role", "link");
      card.setAttribute("aria-label", title + " — " + copy.view);
      card.addEventListener("click", function (event) {
        if (event.target.closest("a, button")) return;
        saveReturnLocation();
        window.location.href = primaryLink.href;
      });
      card.addEventListener("keydown", function (event) {
        if ((event.key === "Enter" || event.key === " ") && !event.target.closest("a, button")) {
          event.preventDefault();
          saveReturnLocation();
          window.location.href = primaryLink.href;
        }
      });
    }
  });

  featured.slice().reverse().forEach(function (name) {
    var item = items.find(function (candidate) { var h = candidate.querySelector("h3"); return h && h.textContent.trim() === name; });
    if (item) list.insertBefore(item, list.firstChild);
  });
  items = Array.prototype.slice.call(list.querySelectorAll(":scope > .w-dyn-item"));

  var toolbar = document.createElement("div");
  toolbar.className = "sb-portfolio-toolbar";
  toolbar.setAttribute("aria-label", english ? "Filter projects" : "Filtrer les projets");
  toolbar.innerHTML = '<div class="sb-portfolio-toolbar__intro"><strong>' + copy.filterTitle + '</strong><span>' + copy.filterHint + '</span></div><div class="sb-portfolio-filters">' + categoryOrder.map(function (category, index) {
    return '<button class="sb-portfolio-filter" type="button" data-filter="' + category + '" aria-pressed="' + (index === 0) + '"><span>' + copy[category] + '</span><b>' + categoryCounts[category] + '</b></button>';
  }).join("") + '<i class="sb-portfolio-filter-indicator" aria-hidden="true"></i></div>';
  var component = document.querySelector(".portfolio8_component");
  component.parentNode.insertBefore(toolbar, component);
  var count = document.createElement("p");
  count.className = "sb-portfolio-count";
  toolbar.parentNode.insertBefore(count, component);
  var initialParams = new URLSearchParams(window.location.search);
  var requestedFilter = initialParams.get("service");
  var activeFilter = categoryOrder.indexOf(requestedFilter) !== -1 ? requestedFilter : "all";
  toolbar.querySelectorAll("[data-filter]").forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter)); });
  function updateIndicator() {
    var selected = toolbar.querySelector('[data-filter="' + activeFilter + '"]');
    var indicator = toolbar.querySelector(".sb-portfolio-filter-indicator");
    if (!selected || !indicator) return;
    indicator.style.width = selected.offsetWidth + "px";
    indicator.style.height = selected.offsetHeight + "px";
    indicator.style.transform = "translate(" + selected.offsetLeft + "px, " + selected.offsetTop + "px)";
  }
  function syncUrl(addHistory) {
    var params = new URLSearchParams();
    if (activeFilter !== "all") params.set("service", activeFilter);
    var target = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history[addHistory ? "pushState" : "replaceState"]({ service: activeFilter }, "", target);
  }
  function insertEditorialBlocks(visible) {
    list.querySelectorAll(".sb-portfolio-testimonial").forEach(function (node) { node.remove(); });
    if (visible.length >= 3) {
      var testimonial = document.createElement("aside");
      testimonial.className = "sb-portfolio-testimonial";
      testimonial.innerHTML = "<blockquote>“" + copy.quote + "”</blockquote><cite>" + copy.quoteBy + "</cite>";
      visible[2].insertAdjacentElement("afterend", testimonial);
    }
  }
  function render() {
    var visible = [];
    items.forEach(function (item) {
      var categoryMatch = activeFilter === "all" || item.dataset.categories.split(" ").indexOf(activeFilter) !== -1;
      var show = categoryMatch;
      item.classList.toggle("sb-project-hidden", !show);
      if (show) visible.push(item);
    });
    count.textContent = visible.length + " " + copy.count;
    insertEditorialBlocks(visible);
  }
  toolbar.addEventListener("click", function (event) {
    var filter = event.target.closest("[data-filter], [data-project-filter]");
    if (!filter) return;
    activeFilter = filter.getAttribute("data-filter") || filter.getAttribute("data-project-filter");
    toolbar.querySelectorAll("[data-filter]").forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter)); });
    updateIndicator();
    syncUrl(true);
    render();
    toolbar.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  document.addEventListener("click", function (event) {
    var tag = event.target.closest("[data-project-filter]");
    if (!tag) return;
    activeFilter = tag.dataset.projectFilter;
    toolbar.querySelectorAll("[data-filter]").forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter)); });
    updateIndicator();
    syncUrl(true);
    render();
  });
  list.addEventListener("click", function (event) {
    var projectLink = event.target.closest('a[href*="/projets/"]');
    if (!projectLink) return;
    saveReturnLocation();
  });
  window.addEventListener("popstate", function () {
    var params = new URLSearchParams(window.location.search);
    activeFilter = categoryOrder.indexOf(params.get("service")) !== -1 ? params.get("service") : "all";
    toolbar.querySelectorAll("[data-filter]").forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.filter === activeFilter)); });
    updateIndicator();
    render();
  });
  document.body.classList.add("sb-portfolio-page");
  render();
  window.requestAnimationFrame(updateIndicator);
  window.addEventListener("resize", updateIndicator, { passive: true });
})();
