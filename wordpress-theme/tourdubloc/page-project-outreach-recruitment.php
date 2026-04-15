<?php
/**
 * Template Name: Projet – Outreach Recrutement
 *
 * @package Tourdubloc
 */
get_header();

// ── Elementor Theme Builder override ────────────────────────────────────────
// If Elementor Theme Builder has a template for this location, it renders
// here and we skip the hardcoded HTML entirely.
if ( tdb_elementor_location( 'single' ) ) :
    // Elementor Theme Builder handled everything – nothing else to output.

// ── Elementor Page Builder (per-page content) ────────────────────────────────
// Page was built with Elementor but has no Theme Builder template.
// Render Elementor content inside the site shell.
elseif ( tdb_is_elementor_page() ) :
    while ( have_posts() ) : the_post(); ?>
    <main class="main-wrapper elementor-page">
        <?php the_content(); ?>
    </main>
    <?php endwhile;

// ── Original HTML fallback ───────────────────────────────────────────────────
// Used when Elementor has not been used on this page at all.
else :
?>
<main class="main-wrapper">

    <!-- ── Hero Header ── -->
    <section class="section_portfolio2-header background-color-black">
      <div class="portfolio2-header_100vh hero-placeholder-bg">
        <!-- Background overlay -->
        <div class="portfolio-header4_background-image-wrapper">
          <div class="portfolio-header4_overlay"></div>
        </div>
        <div class="padding-global" style="width:100%; position:relative; z-index:2;">
          <div class="container-large">
            <div class="padding-section-large">
              <div class="text-align-center">
                <div class="max-width-large align-center">
                  <div class="margin-bottom margin-small">
                    <h1 class="heading-style-h1">Outreach Recruitment</h1>
                  </div>
                  <div class="margin-bottom margin-medium">
                    <p class="text-size-large text-style-muted">Spécialistes en recrutement de haut calibre</p>
                  </div>
                  <div class="portfolio2-header_tag-list">
                    <a href="#" class="portfolio2-header_tag-item w-inline-block">Image de marque</a>
                    <a href="#" class="portfolio2-header_tag-item w-inline-block">Conception de site web</a>
                    <a href="#" class="portfolio2-header_tag-item w-inline-block">Marketing numérique</a>
                    <a href="#" class="portfolio2-header_tag-item w-inline-block">Création de contenu</a>
                    <a href="#" class="portfolio2-header_tag-item w-inline-block">Publicité ciblée</a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Project Meta Info ── -->
    <section class="section_layout21">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-medium">
            <div class="portfolio2-content1_metatag-list">
              <div>
                <div class="text-weight-semibold text-style-muted margin-bottom margin-xxsmall">Client</div>
                <div class="text-size-medium text-weight-bold">Outreach Recruitment</div>
              </div>
              <div>
                <div class="text-weight-semibold text-style-muted margin-bottom margin-xxsmall">Objectif</div>
                <div class="text-size-medium">Bâtir une image de marque forte et générer un flux constant de candidats qualifiés</div>
              </div>
              <div>
                <div class="text-weight-semibold text-style-muted margin-bottom margin-xxsmall">Industrie</div>
                <div class="text-size-medium">Ressources humaines & Recrutement</div>
              </div>
              <div>
                <div class="text-weight-semibold text-style-muted margin-bottom margin-xxsmall">Services</div>
                <div class="portfolio-header11_tag-list">
                  <div class="portfolio-header11_tag-item">Image de marque</div>
                  <div class="portfolio-header11_tag-item">Site web</div>
                  <div class="portfolio-header11_tag-item">Marketing numérique</div>
                  <div class="portfolio-header11_tag-item">Publicité</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Main Image ── -->
    <section class="section_layout21 background-color-secondary">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-vertical padding-large">
            <div class="portfolio2-content1_image-wrapper">
              <div class="gallery-placeholder" style="width:100%; aspect-ratio:16/7; border-radius:0.5rem;">
                Image principale — Outreach Recruitment
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Introduction Text ── -->
    <section class="section_layout3">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-medium">
            <div class="layout3_component">
              <div id="w-node-intro-text" class="layout3_content">
                <div class="margin-bottom margin-small">
                  <div class="text-weight-semibold text-style-muted">↳ Le contexte</div>
                </div>
                <div class="margin-bottom margin-small">
                  <h2 class="heading-style-h3">Une agence de recrutement qui voulait recruter ses propres clients.</h2>
                </div>
                <div class="w-richtext">
                  <p>Outreach Recruitment est une agence spécialisée dans le placement de professionnels pour des entreprises en forte croissance. Malgré une expertise reconnue sur le terrain, leur présence en ligne ne reflétait pas la qualité de leur travail — et les leads entrants stagnaient.</p>
                  <p>On a pris en main l'ensemble de leur image : refonte complète de la marque, création d'un site web orienté conversion, stratégie de contenu LinkedIn et campagnes publicitaires ciblées. Le résultat : un pipeline de candidats qualifiés rempli chaque semaine, et une marque employeur que leurs clients sont fiers de présenter.</p>
                </div>
              </div>
              <div id="w-node-intro-image" class="portfolio2-content1_image-wrapper">
                <div class="gallery-placeholder" style="width:100%; aspect-ratio:4/3; border-radius:0.5rem;">
                  Photo — Bureau / Équipe
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Gallery 1 ── -->
    <section class="section_layout21 background-color-secondary">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-medium">
            <div class="w-layout-grid portfolio2-gallery1_component">
              <div class="w-layout-grid portfolio2-gallery1_row">
                <div class="portfolio2-gallery1_image-wrapper gallery-placeholder">
                  Branding — Logo & identité visuelle
                </div>
                <div class="portfolio2-gallery1_image-wrapper gallery-placeholder">
                  Maquette — Site web (page d'accueil)
                </div>
              </div>
              <div class="w-layout-grid portfolio2-gallery1_row">
                <div class="portfolio2-gallery1_image-wrapper gallery-placeholder">
                  Créatif — LinkedIn Ads
                </div>
                <div class="portfolio2-gallery1_image-wrapper gallery-placeholder">
                  Créatif — Meta Ads
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Site Web Section ── -->
    <section class="section_layout3">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-medium">
            <div class="layout3_component">
              <div id="w-node-web-image" class="portfolio2-content1_image-wrapper">
                <div class="gallery-placeholder" style="width:100%; aspect-ratio:4/3; border-radius:0.5rem;">
                  Mockup — Site web Outreach Recruitment
                </div>
              </div>
              <div id="w-node-web-text" class="layout3_content">
                <div class="margin-bottom margin-small">
                  <div class="text-weight-semibold text-style-muted">↳ Site Web</div>
                </div>
                <div class="margin-bottom margin-small">
                  <h2 class="heading-style-h3">Un site conçu pour convertir, pas juste pour impressionner.</h2>
                </div>
                <div class="w-richtext">
                  <p>Le nouveau site d'Outreach Recruitment n'est pas une vitrine — c'est un outil de vente. Chaque section est pensée pour guider le visiteur : entreprise à la recherche d'un partenaire recrutement, ou candidat en quête de sa prochaine opportunité.</p>
                  <p>Pages carrières optimisées, formulaires intégrés, suivi analytique complet. Le site génère maintenant des leads qualifiés 24h/24, 7j/7.</p>
                </div>
                <div class="margin-top margin-medium">
                  <a href="#" class="button is-link is-icon w-inline-block">
                    <div>Voir le site web</div>
                    <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Publicités Section ── -->
    <section class="section_layout3 background-color-secondary">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-medium">
            <div class="layout3_component">
              <div id="w-node-ads-text" class="layout3_content">
                <div class="margin-bottom margin-small">
                  <div class="text-weight-semibold text-style-muted">↳ Publicités</div>
                </div>
                <div class="margin-bottom margin-small">
                  <h2 class="heading-style-h3">Trouver les bons candidats avant même qu'ils cherchent.</h2>
                </div>
                <div class="w-richtext">
                  <p>On a mis en place une stratégie publicitaire multi-plateforme — LinkedIn Ads, Meta et Google — pour atteindre des profils actifs et passifs. Chaque campagne est optimisée pour le coût par candidature qualifiée, pas pour les simples impressions.</p>
                  <p>En 90 jours, le volume de candidatures entrantes a triplé, avec un taux de qualification supérieur à 65 %.</p>
                </div>
              </div>
              <div id="w-node-ads-image" class="portfolio2-content1_image-wrapper">
                <div class="gallery-placeholder" style="width:100%; aspect-ratio:4/3; border-radius:0.5rem;">
                  Dashboard — Résultats campagnes publicitaires
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Gallery 2 ── -->
    <section class="section_layout21 background-color-secondary">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-medium">
            <div class="w-layout-grid portfolio2-gallery1_component">
              <div class="w-layout-grid portfolio2-gallery1_row">
                <div class="portfolio2-gallery1_image-wrapper gallery-placeholder">
                  Rapport — Analytics mensuel
                </div>
                <div class="portfolio2-gallery1_image-wrapper gallery-placeholder">
                  Stratégie — Plan de contenu LinkedIn
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Faisons le tour du bloc ── -->
    <section class="section_layout207">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-large">
            <div class="max-width-large">
              <div class="margin-bottom margin-small">
                <div class="text-weight-semibold text-style-muted">↳ Notre approche</div>
              </div>
              <div class="margin-bottom margin-small">
                <h2 class="heading-style-h2">On s'occupe de remplir leur pipeline. Eux s'occupent de placer les candidats.</h2>
              </div>
              <div class="w-richtext">
                <p>Notre rôle n'est pas de faire de belles publicités. C'est de livrer des candidats qualifiés, pré-filtrés, prêts à être présentés. On prend en charge la visibilité, l'attraction de talent et la qualification initiale — Outreach Recruitment n'a plus qu'à faire ce qu'ils font le mieux.</p>
              </div>
              <div class="margin-top margin-medium">
                <a href="index.html#contact" class="button is-primary w-inline-block">
                  <div>travaillons ensemble</div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Marquee Banner ── -->
    <div class="section_banner15">
      <div class="banner15_component">
        <div class="banner15_marquee" style="animation: marquee 25s linear infinite; display:flex; gap:0; white-space:nowrap;">
          <!-- First set -->
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Créer des entrepreneurs à succès</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Battre des records</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Livrer des résultats concrets</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Générer de la visibilité</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Transformer les prospects en clients</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Bâtir des marques mémorables</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Générer des milliers de leads</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Doubler les revenus</div></div>
          <!-- Duplicate for seamless loop -->
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Créer des entrepreneurs à succès</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Battre des records</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Livrer des résultats concrets</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Générer de la visibilité</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Transformer les prospects en clients</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Bâtir des marques mémorables</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Générer des milliers de leads</div></div>
          <div class="banner15_heading-wrapper"><div class="banner15_image-wrapper"></div><div class="text-weight-semibold">Doubler les revenus</div></div>
        </div>
      </div>
    </div>

    <!-- ── Related Projects ── -->
    <section class="section_layout21">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-large">
            <div class="portfolio2-related_component">
              <div class="margin-bottom margin-xlarge" style="width:100%;">
                <div class="margin-bottom margin-xxsmall">
                  <div class="text-weight-semibold">↳ Projets similaires</div>
                </div>
                <h2 class="heading-style-h3">Projets similaires</h2>
              </div>
              <div class="w-layout-grid portfolio2-related_list" style="grid-template-columns: 1fr 1fr;">
                <!-- Outreach Recruitment -->
                <div>
                  <a href="#" class="portfolio2-related_image-link w-inline-block">
                    <div class="portfolio2-related_image-wrapper">
                      <img src="<?php echo tdb_asset('images/65e9f7e260165d1cc86ac833_64cbc5c84d2f9623c5f175d4_ERCO_IMAGE_MAIN%20%281%29-p-800.webp'); ?>" loading="lazy" alt="Outreach Recruitment" class="portfolio2-related_image">
                    </div>
                  </a>
                  <a href="#" class="portfolio2-related_title-link w-inline-block">
                    <h3 class="heading-style-h5">Outreach Recruitment</h3>
                  </a>
                  <p class="text-style-muted">Maîtres Électriciens spécialisés</p>
                  <div class="portfolio2-related_tag-list">
                    <a href="#" class="portfolio2-related_tag-item w-inline-block">Conception de site web</a>
                    <a href="#" class="portfolio2-related_tag-item w-inline-block">Image de marque</a>
                    <a href="#" class="portfolio2-related_tag-item w-inline-block">Marketing numérique</a>
                  </div>
                  <div class="portfolio2-related_button-wrapper">
                    <a href="#" class="button is-link is-icon w-inline-block">
                      <div>Voir le projet</div>
                      <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                    </a>
                  </div>
                </div>
                <!-- FENESTRIA -->
                <div>
                  <a href="#" class="portfolio2-related_image-link w-inline-block">
                    <div class="portfolio2-related_image-wrapper">
                      <img src="<?php echo tdb_asset('images/65e9c3bb1345ac8d5b100d0b_65d61f89e9961819318deaf6_fenestria.webp'); ?>" loading="lazy" alt="Fenestria" class="portfolio2-related_image">
                    </div>
                  </a>
                  <a href="#" class="portfolio2-related_title-link w-inline-block">
                    <h3 class="heading-style-h5">FENESTRIA</h3>
                  </a>
                  <p class="text-style-muted">Vente et installation de portes et fenêtres</p>
                  <div class="portfolio2-related_tag-list">
                    <a href="#" class="portfolio2-related_tag-item w-inline-block">Conception de site web</a>
                    <a href="#" class="portfolio2-related_tag-item w-inline-block">Image de marque</a>
                    <a href="#" class="portfolio2-related_tag-item w-inline-block">Marketing numérique</a>
                  </div>
                  <div class="portfolio2-related_button-wrapper">
                    <a href="#" class="button is-link is-icon w-inline-block">
                      <div>Voir le projet</div>
                      <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                    </a>
                  </div>
                </div>
              </div>

              <div class="margin-top margin-xxlarge">
                <a href="projets.html" class="button is-secondary w-inline-block">
                  <div>Voir tous nos projets</div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

  </main>

<?php endif;

get_footer();
