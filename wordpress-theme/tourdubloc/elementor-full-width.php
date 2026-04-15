<?php
/**
 * Elementor Full Width Template
 *
 * Includes the site header and footer, but stretches the content area
 * to full width — no container max-width constraints. Ideal for landing
 * pages built entirely in Elementor.
 *
 * Template Name: Elementor Full Width
 * Template Post Type: page
 *
 * @package SbMarketing
 */

get_header();
?>

<div class="elementor-full-width-page" style="width:100%;">
    <?php
    while ( have_posts() ) : the_post();
        the_content();
    endwhile;
    ?>
</div>

<?php get_footer(); ?>
