<?php
/**
 * Required WordPress fallback template.
 * WordPress routes to this when no more specific template is found.
 *
 * @package SbMarketing
 */

get_header();
?>

<main class="main-wrapper">
    <div class="padding-global">
        <div class="container-large">
            <div class="padding-section-large">
                <?php if ( have_posts() ) : ?>
                    <?php while ( have_posts() ) : the_post(); ?>
                        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
                            <h2><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2>
                            <?php the_excerpt(); ?>
                        </article>
                    <?php endwhile; ?>

                    <?php the_posts_pagination(); ?>
                <?php else : ?>
                    <p><?php esc_html_e( 'Aucun contenu trouvé.', 'sb-marketing' ); ?></p>
                <?php endif; ?>
            </div>
        </div>
    </div>
</main>

<?php get_footer(); ?>
