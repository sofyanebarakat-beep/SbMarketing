<?php
/**
 * Single post template (blog articles).
 *
 * @package Tourdubloc
 */

get_header();

// ── Elementor Theme Builder override ─────────────────────────────────────────
if ( tdb_elementor_location( 'single' ) ) :
    // Theme Builder handled everything.

// ── Elementor Page Builder ────────────────────────────────────────────────────
elseif ( tdb_is_elementor_page() ) :
    while ( have_posts() ) : the_post(); ?>
    <main class="main-wrapper elementor-page">
        <?php the_content(); ?>
    </main>
    <?php endwhile;

// ── Original HTML fallback ────────────────────────────────────────────────────
else :
    while ( have_posts() ) : the_post(); ?>
    <main class="main-wrapper">
        <div class="padding-global">
            <div class="container-large">
                <div class="padding-section-large">
                    <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>

                        <?php if ( has_post_thumbnail() ) : ?>
                        <div class="blog-post_image-wrapper">
                            <?php the_post_thumbnail( 'full', [ 'class' => 'blog-post_image' ] ); ?>
                        </div>
                        <div class="spacer-medium"></div>
                        <?php endif; ?>

                        <div class="text-style-tagline">
                            <?php the_category( ', ' ); ?>
                            <span class="text-color-secondary"> &mdash; <?php the_date(); ?></span>
                        </div>
                        <div class="spacer-small"></div>

                        <h1 class="heading-style-h1"><?php the_title(); ?></h1>
                        <div class="spacer-medium"></div>

                        <div class="w-richtext">
                            <?php the_content(); ?>
                        </div>

                        <div class="spacer-large"></div>
                        <div class="button-group">
                            <a href="<?php echo esc_url( home_url( '/blog' ) ); ?>"
                               class="special-button is-icon w-inline-block">
                                &larr; Retour au blog
                            </a>
                        </div>

                    </article>
                </div>
            </div>
        </div>
    </main>
    <?php endwhile;
endif;

get_footer();
