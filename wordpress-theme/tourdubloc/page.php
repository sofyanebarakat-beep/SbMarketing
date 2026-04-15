<?php
/**
 * Generic page template.
 * Used for any WordPress Page with no more specific template assigned.
 *
 * @package SbMarketing
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
                        <h1 class="heading-style-h1"><?php the_title(); ?></h1>
                        <div class="spacer-medium"></div>
                        <div class="w-richtext">
                            <?php the_content(); ?>
                        </div>
                    </article>
                </div>
            </div>
        </div>
    </main>
    <?php endwhile;
endif;

get_footer();
