<?php
/**
 * Tourdubloc – Automatic Page Setup on Theme Activation
 *
 * Creates all site pages in the WordPress admin (Pages section) the first
 * time the theme is activated. Each page is assigned the correct slug and
 * page template so it renders the right converted HTML template file.
 *
 * Runs on:  after_switch_theme  (fires once on activation)
 * Safe to re-run: skips pages that already exist (matched by slug).
 *
 * @package Tourdubloc
 */

/**
 * Page definitions.
 *
 * 'template' matches the Template Name declared in the corresponding .php file.
 * Leave empty for pages that use generic page.php or have a WordPress-special role.
 */
function tourdubloc_get_page_definitions(): array {
    return [
        [
            'title'    => 'Accueil',
            'slug'     => 'accueil',
            'template' => '',               // front-page.php fires automatically for the static front page
            'status'   => 'publish',
            'role'     => 'front_page',     // will be set as the static front page
        ],
        [
            'title'    => 'Blog',
            'slug'     => 'blog',
            'template' => '',               // archive.php + WordPress "Posts page" setting handles this
            'status'   => 'publish',
            'role'     => 'posts_page',     // will be set as the posts/blog page
        ],
        [
            'title'    => 'Marketing',
            'slug'     => 'marketing',
            'template' => '',
            'status'   => 'publish',
            'role'     => '',
        ],
        [
            'title'    => 'Centre d\'appel et qualification',
            'slug'     => 'centre-dappel-et-qualification',
            'template' => '',
            'status'   => 'publish',
            'role'     => '',
        ],
        [
            'title'    => 'Nos projets',
            'slug'     => 'projets',
            'template' => 'page-projets.php',
            'status'   => 'publish',
            'role'     => '',
        ],
        [
            'title'    => 'Outreach Recrutement',
            'slug'     => 'outreach',
            'template' => 'page-outreach.php',
            'status'   => 'publish',
            'role'     => '',
        ],
        [
            'title'    => 'Projet – Outreach Recrutement',
            'slug'     => 'project-outreach-recruitment',
            'template' => 'page-project-outreach-recruitment.php',
            'status'   => 'publish',
            'role'     => '',
        ],
        [
            'title'    => 'Contact',
            'slug'     => 'contact',
            'template' => '',
            'status'   => 'publish',
            'role'     => '',
        ],
        [
            'title'    => 'LP – Centre d\'appels',
            'slug'     => 'lp-centre-dappel',
            'template' => '',
            'status'   => 'publish',
            'role'     => '',
        ],
        [
            'title'    => 'Politique de confidentialité',
            'slug'     => 'politique-de-confidentialite',
            'template' => '',
            'status'   => 'publish',
            'role'     => '',
        ],
    ];
}


/**
 * Create pages on theme activation (skips pages that already exist).
 */
function tourdubloc_create_pages(): void {
    // Guard: only run once per activation
    if ( get_option( 'tourdubloc_pages_created' ) ) {
        return;
    }

    $pages       = tourdubloc_get_page_definitions();
    $front_page_id = 0;
    $posts_page_id = 0;

    foreach ( $pages as $page_data ) {
        // Check if a page with this slug already exists
        $existing = get_page_by_path( $page_data['slug'], OBJECT, 'page' );

        if ( $existing ) {
            $page_id = $existing->ID;
        } else {
            $page_id = wp_insert_post( [
                'post_title'   => $page_data['title'],
                'post_name'    => $page_data['slug'],
                'post_status'  => $page_data['status'],
                'post_type'    => 'page',
                'post_content' => '',
                'post_author'  => 1,
            ] );
        }

        if ( is_wp_error( $page_id ) || ! $page_id ) {
            continue;
        }

        // Assign page template if specified
        if ( ! empty( $page_data['template'] ) ) {
            update_post_meta( $page_id, '_wp_page_template', $page_data['template'] );
        }

        // Track special roles
        if ( $page_data['role'] === 'front_page' ) {
            $front_page_id = $page_id;
        }
        if ( $page_data['role'] === 'posts_page' ) {
            $posts_page_id = $page_id;
        }
    }

    // Set static front page + posts page in Settings > Reading
    if ( $front_page_id ) {
        update_option( 'show_on_front', 'page' );
        update_option( 'page_on_front', $front_page_id );
    }
    if ( $posts_page_id ) {
        update_option( 'page_for_posts', $posts_page_id );
    }

    // Mark as done so this doesn't run again on subsequent activations
    update_option( 'tourdubloc_pages_created', true );
}
add_action( 'after_switch_theme', 'tourdubloc_create_pages' );


/**
 * Admin notice: confirm pages were created on activation.
 */
function tourdubloc_pages_created_notice(): void {
    if ( ! get_transient( 'tourdubloc_activation_notice' ) ) {
        return;
    }
    ?>
    <div class="notice notice-success is-dismissible">
        <p>
            <strong>Tourdubloc :</strong>
            <?php esc_html_e( 'Toutes les pages du site ont été créées automatiquement. Rendez-vous dans Pages pour les consulter.', 'tourdubloc' ); ?>
        </p>
    </div>
    <?php
    delete_transient( 'tourdubloc_activation_notice' );
}
add_action( 'admin_notices', 'tourdubloc_pages_created_notice' );
