<?php
/**
 * Template Name: Nos projets
 *
 * @package SbMarketing
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

    <!-- Hero -->
    <section class="section_layout408 background-color-black">
      <div class="padding-global">
        <div class="spacer-xhuge"></div>
        <div class="container-large">
          <div class="padding-section-medium">
            <div class="text-align-center">
              <div class="fx-up">
                <div class="max-width-large align-center">
                  <div class="margin-bottom margin-small">
                    <h1>Nos projets</h1>
                  </div>
                  <p class="text-size-large text-style-muted">Voyez concrètement ce qu'on fait pour nos clients</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Case Studies Slider -->
    <section class="section_case-studies">
      <div class="case-studies_component">
        <div class="padding-global">
          <div class="container-large">
            <div class="padding-top padding-xhuge">
              <div class="fx-up">
                <div class="case-studies_-top">
                  <div class="max-width-large">
                    <div class="margin-bottom margin-xsmall">
                      <div class="text-weight-semibold">↳ Études de cas</div>
                    </div>
                    <div class="margin-bottom margin-small">
                      <h2><strong>Les likes c'est beau. Les ventes c'est mieux.</strong></h2>
                    </div>
                    <p class="text-size-large text-style-muted">Fini le marketing qui impressionne sans performer.</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="spacer-xlarge"></div>
            <div class="padding-bottom padding-huge">
              <div class="case-studies_slider">
                <div class="case-studies_main-wrapper">
                  <div class="case-studies_list-wrapper swiper w-dyn-list">
                    <div role="list" class="case-studies_list swiper-wrapper w-dyn-items">

                      <!-- Slide 1 -->
                      <div role="listitem" class="case-studies_item swiper-slide w-dyn-item">
                        <a href="#" class="case-studies_item-link w-inline-block">
                          <h3 class="case-studies_item-heading">Groupe VVS</h3>
                          <div class="spacer-small"></div>
                          <div class="case-studies_item-image-wrapper">
                            <img src="<?php echo tdb_asset('images/placeholder.60f9b1840c.svg'); ?>" loading="lazy" width="420" height="300" alt="" class="case-studies_item-image w-dyn-bind-empty">
                          </div>
                          <div class="spacer-small"></div>
                          <div class="case-studies_item-number">800+</div>
                          <div class="spacer-xsmall"></div>
                          <div class="case_studies_item-divider"></div>
                          <div class="spacer-xsmall"></div>
                          <div>Nombre de leads mensuels</div>
                          <div class="spacer-xsmall"></div>
                          <div class="spacer-small"></div>
                          <div class="case-studies_item-button">
                            <div>En savoir plus</div>
                            <img src="<?php echo tdb_asset('images/67251d461925355107ba4649_chevron-right.svg'); ?>" loading="lazy" width="24" height="24" alt="" class="case-studies_item-icon">
                          </div>
                        </a>
                      </div>

                      <!-- Slide 2 -->
                      <div role="listitem" class="case-studies_item swiper-slide w-dyn-item">
                        <a href="#" class="case-studies_item-link w-inline-block">
                          <h3 class="case-studies_item-heading">Solution Isolation</h3>
                          <div class="spacer-small"></div>
                          <div class="case-studies_item-image-wrapper">
                            <img src="<?php echo tdb_asset('images/placeholder.60f9b1840c.svg'); ?>" loading="lazy" width="420" height="300" alt="" class="case-studies_item-image w-dyn-bind-empty">
                          </div>
                          <div class="spacer-small"></div>
                          <div class="case-studies_item-number">+500%</div>
                          <div class="spacer-xsmall"></div>
                          <div class="case_studies_item-divider"></div>
                          <div class="spacer-xsmall"></div>
                          <div>Rendez-vous hebdomadaires</div>
                          <div class="spacer-xsmall"></div>
                          <div class="spacer-small"></div>
                          <div class="case-studies_item-button">
                            <div>En savoir plus</div>
                            <img src="<?php echo tdb_asset('images/67251d461925355107ba4649_chevron-right.svg'); ?>" loading="lazy" width="24" height="24" alt="" class="case-studies_item-icon">
                          </div>
                        </a>
                      </div>

                      <!-- Slide 3 -->
                      <div role="listitem" class="case-studies_item swiper-slide w-dyn-item">
                        <a href="#" class="case-studies_item-link w-inline-block">
                          <h3 class="case-studies_item-heading">Fenestria</h3>
                          <div class="spacer-small"></div>
                          <div class="case-studies_item-image-wrapper">
                            <img src="<?php echo tdb_asset('images/placeholder.60f9b1840c.svg'); ?>" loading="lazy" width="420" height="300" alt="" class="case-studies_item-image w-dyn-bind-empty">
                          </div>
                          <div class="spacer-small"></div>
                          <div class="case-studies_item-number">15x</div>
                          <div class="spacer-xsmall"></div>
                          <div class="case_studies_item-divider"></div>
                          <div class="spacer-xsmall"></div>
                          <div>Retour sur investissement</div>
                          <div class="spacer-xsmall"></div>
                          <div class="spacer-small"></div>
                          <div class="case-studies_item-button">
                            <div>En savoir plus</div>
                            <img src="<?php echo tdb_asset('images/67251d461925355107ba4649_chevron-right.svg'); ?>" loading="lazy" width="24" height="24" alt="" class="case-studies_item-icon">
                          </div>
                        </a>
                      </div>

                    </div><!-- /.swiper-wrapper -->
                  </div><!-- /.swiper -->
                </div>

                <div class="spacer-large"></div>

                <div class="case-studies_slider-controls">
                  <div class="swiper-pagination">
                    <div class="swiper-pagination-bullet is-home"></div>
                  </div>
                  <div class="case-studies_slider-buttons">
                    <button class="swiper-prev is-home">
                      <img src="<?php echo tdb_asset('images/672400dde937918330957593_left-arrow-alt.svg'); ?>" loading="lazy" alt="">
                    </button>
                    <button class="swiper-next is-home">
                      <img src="<?php echo tdb_asset('images/67240048bcb4128a64b654bd_right-arrow-alt.svg'); ?>" loading="lazy" alt="">
                    </button>
                  </div>
                </div>

                <!-- Swiper init script -->
                <div class="case-studies_slider-script w-embed w-script">
                  <script src="js/swiper-bundle.min.js"></script>
                  <script>
                  const swiper = new Swiper('.swiper', {
                    speed: 1200,
                    loop: true,
                    autoHeight: false,
                    centeredSlides: false,
                    followFinger: true,
                    freeMode: false,
                    slideToClickedSlide: true,
                    slidesPerView: 1,
                    spaceBetween: 0,
                    rewind: false,
                    a11y: false,
                    keyboard: { enabled: true, onlyInViewport: true },
                    breakpoints: {
                      200: { slidesPerView: 1 },
                      768: { slidesPerView: 2 },
                      992: { slidesPerView: 3 }
                    },
                    navigation: {
                      nextEl: '.swiper-next',
                      prevEl: '.swiper-prev'
                    },
                    pagination: {
                      el: ".swiper-pagination",
                      bulletActiveClass: "is-active",
                      bulletClass: "swiper-pagination-bullet",
                      bulletElement: "button",
                      clickable: true
                    }
                  });
                  </script>
                </div>

              </div><!-- /.case-studies_slider -->
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Portfolio Grid -->
    <section class="section_portfolio8 background-color-secondary">
      <div class="padding-global">
        <div class="container-large">
          <div class="padding-section-large">
            <div class="portfolio8_component">
              <div class="fx-up">
                <div class="portfolio8_list-wrapper w-dyn-list">
                  <div role="list" class="portfolio8_list w-dyn-items">

                    <!-- Outreach Recruitment -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65e9f7e260165d1cc86ac833_64cbc5c84d2f9623c5f175d4_ERCO_IMAGE_MAIN%20%281%29.webp'); ?>" loading="lazy" alt=""
                              sizes="100vw"
                              srcset="<?php echo tdb_asset('images/65e9f7e260165d1cc86ac833_64cbc5c84d2f9623c5f175d4_ERCO_IMAGE_MAIN%20%281%29-p-500.webp'); ?> 500w, <?php echo tdb_asset('images/65e9f7e260165d1cc86ac833_64cbc5c84d2f9623c5f175d4_ERCO_IMAGE_MAIN%20%281%29-p-800.webp'); ?> 800w, <?php echo tdb_asset('images/65e9f7e260165d1cc86ac833_64cbc5c84d2f9623c5f175d4_ERCO_IMAGE_MAIN%20%281%29-p-1080.webp'); ?> 1080w, <?php echo tdb_asset('images/65e9f7e260165d1cc86ac833_64cbc5c84d2f9623c5f175d4_ERCO_IMAGE_MAIN%20%281%29-p-1600.webp'); ?> 1600w, <?php echo tdb_asset('images/65e9f7e260165d1cc86ac833_64cbc5c84d2f9623c5f175d4_ERCO_IMAGE_MAIN%20%281%29.webp'); ?> 3840w"
                              class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">Outreach Recruitment</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Maîtres Électriciens spécialisés</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Conception de site web</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Création de contenu</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Marketing numérique</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Capsules vidéos</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- MON SPRAY -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65f60de9f5d896dedb2d41cb_MONSPRAYBRANDINGBOOK_V2%20%281%29_page-0002.webp'); ?>" loading="lazy" alt=""
                              sizes="100vw"
                              srcset="<?php echo tdb_asset('images/65f60de9f5d896dedb2d41cb_MONSPRAYBRANDINGBOOK_V2%20%281%29_page-0002-p-500.webp'); ?> 500w, <?php echo tdb_asset('images/65f60de9f5d896dedb2d41cb_MONSPRAYBRANDINGBOOK_V2%20%281%29_page-0002-p-800.webp'); ?> 800w, <?php echo tdb_asset('images/65f60de9f5d896dedb2d41cb_MONSPRAYBRANDINGBOOK_V2%20%281%29_page-0002-p-1080.webp'); ?> 1080w, <?php echo tdb_asset('images/65f60de9f5d896dedb2d41cb_MONSPRAYBRANDINGBOOK_V2%20%281%29_page-0002-p-1600.webp'); ?> 1600w, <?php echo tdb_asset('images/65f60de9f5d896dedb2d41cb_MONSPRAYBRANDINGBOOK_V2%20%281%29_page-0002.webp'); ?> 4000w"
                              class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">MON SPRAY</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Peinture extérieure et intérieure</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Marketing numérique</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Création de contenu</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Capsules vidéos</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Conception de site web</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- SOLUTION ISOLATION -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65fafc9c4e3f4d0c011d7b2a_Solution%20ISO%20Main%20Image.webp'); ?>" loading="lazy" alt="" class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">SOLUTION ISOLATION</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Isolation et décontamination de grenier</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Marketing numérique</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Création de contenu</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Conception de site web</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Capsules vidéos</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- FENESTRIA -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65f611efdcbc7d17db7b1d8e_FENESTRIA_BRAND_MAIN%20IMAGE.webp'); ?>" loading="lazy" alt="" class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">FENESTRIA</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Vente et installation de portes et fenêtres</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Conception de site web</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Création de contenu</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Marketing numérique</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Capsules vidéos</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- PORTES ET FENÊTRES RD -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65f619a4102b1cbeb6f5196a_RD%20MAIN%20IMAGE.webp'); ?>" loading="lazy" alt=""
                              sizes="100vw"
                              srcset="<?php echo tdb_asset('images/65f619a4102b1cbeb6f5196a_RD%20MAIN%20IMAGE-p-500.webp'); ?> 500w, <?php echo tdb_asset('images/65f619a4102b1cbeb6f5196a_RD%20MAIN%20IMAGE-p-800.webp'); ?> 800w, <?php echo tdb_asset('images/65f619a4102b1cbeb6f5196a_RD%20MAIN%20IMAGE-p-1080.webp'); ?> 1080w, <?php echo tdb_asset('images/65f619a4102b1cbeb6f5196a_RD%20MAIN%20IMAGE-p-1600.webp'); ?> 1600w, <?php echo tdb_asset('images/65f619a4102b1cbeb6f5196a_RD%20MAIN%20IMAGE.webp'); ?> 1920w"
                              class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">PORTES ET FENÊTRES RD</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Vente et installation de portes et fenêtres</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Conception de site web</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- ST JAMES ÉLECTRIQUE -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65f612e9c27e3ef6bd7e4108_STJ_main%20image.webp'); ?>" loading="lazy" alt=""
                              sizes="100vw"
                              srcset="<?php echo tdb_asset('images/65f612e9c27e3ef6bd7e4108_STJ_main%20image-p-500.webp'); ?> 500w, <?php echo tdb_asset('images/65f612e9c27e3ef6bd7e4108_STJ_main%20image-p-800.webp'); ?> 800w, <?php echo tdb_asset('images/65f612e9c27e3ef6bd7e4108_STJ_main%20image-p-1080.webp'); ?> 1080w, <?php echo tdb_asset('images/65f612e9c27e3ef6bd7e4108_STJ_main%20image-p-1600.webp'); ?> 1600w, <?php echo tdb_asset('images/65f612e9c27e3ef6bd7e4108_STJ_main%20image.webp'); ?> 1920w"
                              class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">ST JAMES ÉLECTRIQUE</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Maîtres Électriciens spécialisés</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- BÉTON LC -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65f61c3fb55bafaaa9c32aad_BLC%20MAIN%20IMAGE.webp'); ?>" loading="lazy" alt=""
                              sizes="100vw"
                              srcset="<?php echo tdb_asset('images/65f61c3fb55bafaaa9c32aad_BLC%20MAIN%20IMAGE-p-500.webp'); ?> 500w, <?php echo tdb_asset('images/65f61c3fb55bafaaa9c32aad_BLC%20MAIN%20IMAGE-p-800.webp'); ?> 800w, <?php echo tdb_asset('images/65f61c3fb55bafaaa9c32aad_BLC%20MAIN%20IMAGE-p-1080.webp'); ?> 1080w, <?php echo tdb_asset('images/65f61c3fb55bafaaa9c32aad_BLC%20MAIN%20IMAGE-p-1600.webp'); ?> 1600w, <?php echo tdb_asset('images/65f61c3fb55bafaaa9c32aad_BLC%20MAIN%20IMAGE.webp'); ?> 1920w"
                              class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">BÉTON LC</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Experts des planchers de béton</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Conception de site web</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Marketing numérique</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- JARDINS GRANDE ALLÉE -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65f61ab12fada763e59201c0_JGA%20MAIN%20IMAGE.webp'); ?>" loading="lazy" alt=""
                              sizes="100vw"
                              srcset="<?php echo tdb_asset('images/65f61ab12fada763e59201c0_JGA%20MAIN%20IMAGE-p-500.webp'); ?> 500w, <?php echo tdb_asset('images/65f61ab12fada763e59201c0_JGA%20MAIN%20IMAGE-p-800.webp'); ?> 800w, <?php echo tdb_asset('images/65f61ab12fada763e59201c0_JGA%20MAIN%20IMAGE-p-1080.webp'); ?> 1080w, <?php echo tdb_asset('images/65f61ab12fada763e59201c0_JGA%20MAIN%20IMAGE-p-1600.webp'); ?> 1600w, <?php echo tdb_asset('images/65f61ab12fada763e59201c0_JGA%20MAIN%20IMAGE.webp'); ?> 1920w"
                              class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">JARDINS GRANDE ALLÉE</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Condominiums neufs</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Conception de site web</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- HOT N COLD -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65f6159cdcbc7d17db7e5ae4_HOT%20N%20COLD%20MAIN%20IMAGE.webp'); ?>" loading="lazy" alt=""
                              sizes="100vw"
                              srcset="<?php echo tdb_asset('images/65f6159cdcbc7d17db7e5ae4_HOT%20N%20COLD%20MAIN%20IMAGE-p-500.webp'); ?> 500w, <?php echo tdb_asset('images/65f6159cdcbc7d17db7e5ae4_HOT%20N%20COLD%20MAIN%20IMAGE-p-800.webp'); ?> 800w, <?php echo tdb_asset('images/65f6159cdcbc7d17db7e5ae4_HOT%20N%20COLD%20MAIN%20IMAGE-p-1080.webp'); ?> 1080w, <?php echo tdb_asset('images/65f6159cdcbc7d17db7e5ae4_HOT%20N%20COLD%20MAIN%20IMAGE-p-1600.webp'); ?> 1600w, <?php echo tdb_asset('images/65f6159cdcbc7d17db7e5ae4_HOT%20N%20COLD%20MAIN%20IMAGE.webp'); ?> 1920w"
                              class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">HOT N COLD</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Chauffage et climatisation</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Marketing numérique</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Création de contenu</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Conception de site web</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- CLIMANOVA -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65f616d9ced621de07ec2ada_CLIMANOVA%20MAIN%20IMAGE.webp'); ?>" loading="lazy" alt=""
                              sizes="100vw"
                              srcset="<?php echo tdb_asset('images/65f616d9ced621de07ec2ada_CLIMANOVA%20MAIN%20IMAGE-p-500.webp'); ?> 500w, <?php echo tdb_asset('images/65f616d9ced621de07ec2ada_CLIMANOVA%20MAIN%20IMAGE-p-800.webp'); ?> 800w, <?php echo tdb_asset('images/65f616d9ced621de07ec2ada_CLIMANOVA%20MAIN%20IMAGE-p-1080.webp'); ?> 1080w, <?php echo tdb_asset('images/65f616d9ced621de07ec2ada_CLIMANOVA%20MAIN%20IMAGE-p-1600.webp'); ?> 1600w, <?php echo tdb_asset('images/65f616d9ced621de07ec2ada_CLIMANOVA%20MAIN%20IMAGE.webp'); ?> 1920w"
                              class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">CLIMANOVA</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Chauffage et climatisation</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- PLOMBERIE GDM -->
                    <div role="listitem" class="w-dyn-item">
                      <div class="portfolio8_item">
                        <div class="portfolio8_item-link">
                          <a href="#" class="portfolio8_image-wrapper w-inline-block">
                            <img src="<?php echo tdb_asset('images/65f61b88ce39e674fc9873e4_GDM%20MAIN%20IMAGE.webp'); ?>" loading="lazy" alt=""
                              sizes="100vw"
                              srcset="<?php echo tdb_asset('images/65f61b88ce39e674fc9873e4_GDM%20MAIN%20IMAGE-p-500.webp'); ?> 500w, <?php echo tdb_asset('images/65f61b88ce39e674fc9873e4_GDM%20MAIN%20IMAGE-p-800.webp'); ?> 800w, <?php echo tdb_asset('images/65f61b88ce39e674fc9873e4_GDM%20MAIN%20IMAGE-p-1080.webp'); ?> 1080w, <?php echo tdb_asset('images/65f61b88ce39e674fc9873e4_GDM%20MAIN%20IMAGE-p-1600.webp'); ?> 1600w, <?php echo tdb_asset('images/65f61b88ce39e674fc9873e4_GDM%20MAIN%20IMAGE.webp'); ?> 1920w"
                              class="portfolio8_image">
                          </a>
                          <div class="portfolio8_title-wrapper">
                            <div class="portfolio8_item-content-top">
                              <div class="margin-bottom margin-xxsmall">
                                <h3 class="heading-style-h5">PLOMBERIE GDM</h3>
                              </div>
                              <div class="text-size-regular text-style-muted">Plomberie, inspection et débouchage</div>
                              <div class="w-dyn-list">
                                <div role="list" class="portfolio-header11_tag-list w-dyn-items">
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Image de marque</div></a></div>
                                  <div role="listitem" class="w-dyn-item"><a href="#" class="portfolio-header11_tag-item w-inline-block"><div>Marketing numérique</div></a></div>
                                </div>
                              </div>
                            </div>
                            <div class="portfolio8_button-wrapper">
                              <a href="#" class="button is-link is-icon w-inline-block">
                                <div>Voir le projet</div>
                                <div class="icon-embed-xxsmall w-embed"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 3L11 8L6 13" stroke="CurrentColor" stroke-width="1.5"></path></svg></div>
                              </a>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div><!-- /.portfolio8_list -->
                </div><!-- /.portfolio8_list-wrapper -->
              </div><!-- /.fx-up -->

              <div class="margin-top margin-xlarge">
                <div class="fx-up">
                  <div class="button-group is-center">
                    <a href="index.html#contact" data-wf--button--variant="no-icon" class="special-button is-icon w-variant-dcf8a2db-149b-093c-ad09-76811261ba97 w-inline-block">
                      <div class="div-block-7 w-variant-dcf8a2db-149b-093c-ad09-76811261ba97">
                        <div class="special-button-image-wrapper">
                          <img loading="lazy" src="<?php echo tdb_asset('images/soufiane-profile.jpg'); ?>" alt="" class="image-3">
                          <div class="status-indicator"></div>
                        </div>
                      </div>
                      <div>Discuter avec nous</div>
                    </a>
                  </div>
                </div>
              </div>

            </div><!-- /.portfolio8_component -->
          </div>
        </div>
      </div>
    </section>

  </main>

<?php endif;

get_footer();
