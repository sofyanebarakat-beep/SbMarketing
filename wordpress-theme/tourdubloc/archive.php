<?php
/**
 * Blog archive (archive.php)
 * @package SbMarketing
 */
get_header();

// ── Elementor Theme Builder override ────────────────────────────────────────
// If Elementor Theme Builder has a template for this location, it renders
// here and we skip the hardcoded HTML entirely.
if ( tdb_elementor_location( 'archive' ) ) :
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

    <!-- Hero -->
    <header class="section_header30 text-color-white">
      <div class="padding-global">
        <div class="container-large">
          <div class="header30_content">
            <div class="padding-section-large">
              <div class="text-align-center">
                <div class="max-width-hero">
                  <div class="hero-tagline">
                    <div class="tagline-cube is-green"></div>
                    <div class="text-style-tagline">Insights · Marketing · Croissance</div>
                  </div>
                  <div class="spacer-small"></div>
                  <h1 class="heading-style-hero">Le blog des marques<br>qui veulent performer.</h1>
                  <div class="spacer-medium"></div>
                  <div class="button-group is-center">
                    <a href="#blog" class="special-button is-icon w-variant-dcf8a2db-149b-093c-ad09-76811261ba97 w-inline-block">
                      <div class="div-block-7 w-variant-dcf8a2db-149b-093c-ad09-76811261ba97">
                        <div class="special-button-image-wrapper">
                          <img loading="lazy" src="<?php echo tdb_asset('images/soufiane-profile.jpg'); ?>" alt="" class="image-3">
                          <div class="status-indicator"></div>
                        </div>
                      </div>
                      <div>Explorer les articles</div>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Decorative background -->
      <div class="header30_background-image-wrapper">
        <img src="<?php echo tdb_asset('images/68f12d4049766a95c38482b3_left-3d-squares%201.png'); ?>" loading="eager"
          sizes="(max-width: 971px) 100vw, 971px"
          srcset="<?php echo tdb_asset('images/68f12d4049766a95c38482b3_left-3d-squares%201-p-500.png'); ?> 500w, <?php echo tdb_asset('images/68f12d4049766a95c38482b3_left-3d-squares%201-p-800.png'); ?> 800w, <?php echo tdb_asset('images/68f12d4049766a95c38482b3_left-3d-squares%201.png'); ?> 971w"
          alt="" class="bg-bloc-element left">
        <img src="<?php echo tdb_asset('images/68f12d409cb5821e2b9d3bbe_left-3d-squares%202.png'); ?>" loading="eager"
          sizes="(max-width: 971px) 100vw, 971px"
          srcset="<?php echo tdb_asset('images/68f12d409cb5821e2b9d3bbe_left-3d-squares%202-p-500.png'); ?> 500w, <?php echo tdb_asset('images/68f12d409cb5821e2b9d3bbe_left-3d-squares%202-p-800.png'); ?> 800w, <?php echo tdb_asset('images/68f12d409cb5821e2b9d3bbe_left-3d-squares%202.png'); ?> 971w"
          alt="" class="bg-bloc-element right">
        <img loading="eager" alt="" src="<?php echo tdb_asset('images/68f12ddb6bfb958dff8fe2c4_BG%20LINE%20PATTERN.svg'); ?>" class="header30_background-image">
      </div>
    </header>

    <!-- Blog posts -->
    <section class="blog-section" id="blog">
      <div class="padding-global">
        <div class="container-large">

          <!-- Toolbar -->
          <div class="blog-toolbar">
            <div>
              <h2 class="blog-toolbar_heading">Tous les articles</h2>
              <p class="blog-toolbar_text">Parcourez par catégorie et découvrez ce qui est nouveau.</p>
            </div>
            <div class="blog-filters" role="tablist" aria-label="Catégories du blog">
              <button class="blog-filter is-active" type="button" data-filter="all">Tous</button>
              <button class="blog-filter" type="button" data-filter="Marketing">Marketing</button>
              <button class="blog-filter" type="button" data-filter="Contenu">Contenu</button>
              <button class="blog-filter" type="button" data-filter="Leads">Génération de leads</button>
              <button class="blog-filter" type="button" data-filter="Image de marque">Image de marque</button>
              <button class="blog-filter" type="button" data-filter="Croissance">Croissance</button>
            </div>
          </div>

          <!-- Grid -->
          <div class="blog-grid" id="blog-grid">

            <!-- Article 1 -->
            <article class="blog-card" data-category="Marketing">
              <a href="#" class="blog-card_media">
                <img loading="lazy" src="<?php echo tdb_asset('images/68f84eae40bb20a3c83a5d91_TDB-Accueil-02-Prospects.jpg'); ?>" alt="Stratégies de contenu qui convertissent vraiment">
              </a>
              <div class="blog-card_body">
                <div class="blog-card_tag">Marketing</div>
                <h3 class="blog-card_title"><a href="#">Stratégies de contenu qui convertissent vraiment</a></h3>
                <p class="blog-card_description">Construisez un moteur de contenu qui attire des leads qualifiés, soutient votre équipe de vente et transforme l'attention en résultats mesurables.</p>
                <div class="blog-card_footer">
                  <div class="blog-card_date">8 mars 2026</div>
                  <a href="#" class="blog-card_button">Lire l'article →</a>
                </div>
              </div>
            </article>

            <!-- Article 2 -->
            <article class="blog-card" data-category="Leads">
              <a href="#" class="blog-card_media">
                <img loading="lazy" src="<?php echo tdb_asset('images/65e9f7e260165d1cc86ac833_64cbc5c84d2f9623c5f175d4_ERCO_IMAGE_MAIN%20%281%29.webp'); ?>" alt="Comment générer 800 leads par mois en continu">
              </a>
              <div class="blog-card_body">
                <div class="blog-card_tag">Génération de leads</div>
                <h3 class="blog-card_title"><a href="#">Comment générer 800+ leads qualifiés par mois</a></h3>
                <p class="blog-card_description">Découvrez le système de génération de leads qu'on a mis en place pour Groupe VVS — et les 3 leviers qui font passer la machine à plein régime.</p>
                <div class="blog-card_footer">
                  <div class="blog-card_date">22 février 2026</div>
                  <a href="#" class="blog-card_button">Lire l'article →</a>
                </div>
              </div>
            </article>

            <!-- Article 3 -->
            <article class="blog-card" data-category="Image de marque">
              <a href="#" class="blog-card_media">
                <img loading="lazy" src="<?php echo tdb_asset('images/65f60de9f5d896dedb2d41cb_MONSPRAYBRANDINGBOOK_V2%20%281%29_page-0002.webp'); ?>" alt="Bâtir une identité visuelle qui inspire confiance">
              </a>
              <div class="blog-card_body">
                <div class="blog-card_tag">Image de marque</div>
                <h3 class="blog-card_title"><a href="#">Bâtir une identité visuelle qui inspire confiance</a></h3>
                <p class="blog-card_description">Découvrez comment une charte graphique solide, une typographie cohérente et un système visuel fort créent de la crédibilité dès le premier coup d'œil.</p>
                <div class="blog-card_footer">
                  <div class="blog-card_date">14 février 2026</div>
                  <a href="#" class="blog-card_button">Lire l'article →</a>
                </div>
              </div>
            </article>

            <!-- Article 4 -->
            <article class="blog-card" data-category="Croissance">
              <a href="#" class="blog-card_media">
                <img loading="lazy" src="<?php echo tdb_asset('images/68f12d4049766a95c38482b3_left-3d-squares%201.png'); ?>" alt="Boucles de croissance pour une acquisition scalable">
              </a>
              <div class="blog-card_body">
                <div class="blog-card_tag">Croissance</div>
                <h3 class="blog-card_title"><a href="#">Boucles de croissance pour une acquisition scalable</a></h3>
                <p class="blog-card_description">Sortez des coups one-shot et construisez des systèmes répétables qui amènent de meilleurs leads au fur et à mesure que votre entreprise grandit.</p>
                <div class="blog-card_footer">
                  <div class="blog-card_date">5 février 2026</div>
                  <a href="#" class="blog-card_button">Lire l'article →</a>
                </div>
              </div>
            </article>

            <!-- Article 5 -->
            <article class="blog-card" data-category="Contenu">
              <a href="#" class="blog-card_media">
                <img loading="lazy" src="<?php echo tdb_asset('images/68f84c1e7b41f47ef74b7480_tourdublocbrunette.png'); ?>" alt="Capsules vidéo : le format qui performe le plus en 2026">
              </a>
              <div class="blog-card_body">
                <div class="blog-card_tag">Contenu</div>
                <h3 class="blog-card_title"><a href="#">Capsules vidéo : le format qui performe le plus en 2026</a></h3>
                <p class="blog-card_description">Courtes, percutantes, authentiques — les capsules vidéo sont devenues le levier numéro un pour capter l'attention et générer de l'engagement organique.</p>
                <div class="blog-card_footer">
                  <div class="blog-card_date">28 janvier 2026</div>
                  <a href="#" class="blog-card_button">Lire l'article →</a>
                </div>
              </div>
            </article>

            <!-- Article 6 -->
            <article class="blog-card" data-category="Marketing">
              <a href="#" class="blog-card_media">
                <img loading="lazy" src="<?php echo tdb_asset('images/68f7ba5e5ab7ad672f0622eb_5D206031%20%281%29.jpg'); ?>" alt="Comment les marques bâtissent leur autorité en ligne">
              </a>
              <div class="blog-card_body">
                <div class="blog-card_tag">Marketing</div>
                <h3 class="blog-card_title"><a href="#">Comment les marques bâtissent leur autorité en ligne</a></h3>
                <p class="blog-card_description">Du positionnement à la cohérence des campagnes, découvrez les mouvements qui rendent une marque crédible, premium et impossible à ignorer.</p>
                <div class="blog-card_footer">
                  <div class="blog-card_date">20 janvier 2026</div>
                  <a href="#" class="blog-card_button">Lire l'article →</a>
                </div>
              </div>
            </article>

            <!-- Article 7 -->
            <article class="blog-card" data-category="Leads">
              <a href="#" class="blog-card_media">
                <img loading="lazy" src="<?php echo tdb_asset('images/65fafc9c4e3f4d0c011d7b2a_Solution%20ISO%20Main%20Image.webp'); ?>" alt="+500 % de rendez-vous : le cas Solution Isolation">
              </a>
              <div class="blog-card_body">
                <div class="blog-card_tag">Génération de leads</div>
                <h3 class="blog-card_title"><a href="#">+500 % de rendez-vous : le cas Solution Isolation</a></h3>
                <p class="blog-card_description">Comment on a multiplié par 6 les rendez-vous hebdomadaires d'une entreprise d'isolation grâce à un mix pub sponsorisée + qualification par centre d'appel.</p>
                <div class="blog-card_footer">
                  <div class="blog-card_date">12 janvier 2026</div>
                  <a href="#" class="blog-card_button">Lire l'article →</a>
                </div>
              </div>
            </article>

            <!-- Article 8 -->
            <article class="blog-card" data-category="Contenu">
              <a href="#" class="blog-card_media">
                <img loading="lazy" src="<?php echo tdb_asset('images/65f619a4102b1cbeb6f5196a_RD%20MAIN%20IMAGE.webp'); ?>" alt="Pourquoi votre contenu ne génère pas de ventes">
              </a>
              <div class="blog-card_body">
                <div class="blog-card_tag">Contenu</div>
                <h3 class="blog-card_title"><a href="#">Pourquoi votre contenu ne génère pas de ventes</a></h3>
                <p class="blog-card_description">Beaucoup d'entreprises produisent du contenu, peu en tirent des revenus. On décortique les erreurs les plus courantes et comment les corriger rapidement.</p>
                <div class="blog-card_footer">
                  <div class="blog-card_date">4 janvier 2026</div>
                  <a href="#" class="blog-card_button">Lire l'article →</a>
                </div>
              </div>
            </article>

            <!-- Article 9 -->
            <article class="blog-card" data-category="Croissance">
              <a href="#" class="blog-card_media">
                <img loading="lazy" src="<?php echo tdb_asset('images/65f6159cdcbc7d17db7e5ae4_HOT%20N%20COLD%20MAIN%20IMAGE.webp'); ?>" alt="Les 5 KPIs à suivre pour une croissance prévisible">
              </a>
              <div class="blog-card_body">
                <div class="blog-card_tag">Croissance</div>
                <h3 class="blog-card_title"><a href="#">Les 5 KPIs à suivre pour une croissance prévisible</a></h3>
                <p class="blog-card_description">Arrêtez de mesurer les mauvaises choses. Voici les indicateurs qui permettent vraiment de piloter votre croissance et d'anticiper vos résultats mois après mois.</p>
                <div class="blog-card_footer">
                  <div class="blog-card_date">18 décembre 2025</div>
                  <a href="#" class="blog-card_button">Lire l'article →</a>
                </div>
              </div>
            </article>

            <!-- No results message -->
            <div class="blog-no-results" id="blog-no-results">
              Aucun article trouvé dans cette catégorie pour l'instant.
            </div>

          </div><!-- /.blog-grid -->
        </div>
      </div>
    </section>

  </main>

<?php endif;

get_footer();
