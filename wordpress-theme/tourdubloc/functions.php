<?php
/**
 * Sb Marketing Theme Functions
 *
 * @package SbMarketing
 */

// ─────────────────────────────────────────────
// 0. INCLUDES
// ─────────────────────────────────────────────
require_once get_template_directory() . '/inc/setup-pages.php';


// ─────────────────────────────────────────────
// 1. THEME SETUP
// ─────────────────────────────────────────────
function sbm_setup() {
    load_theme_textdomain( 'sb-marketing', get_template_directory() . '/languages' );

    add_theme_support( 'title-tag' );
    add_theme_support( 'post-thumbnails' );
    add_theme_support( 'html5', [ 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script' ] );
    add_theme_support( 'custom-logo', [
        'height'      => 60,
        'width'       => 200,
        'flex-height' => true,
        'flex-width'  => true,
    ] );

    register_nav_menus( [
        'primary' => __( 'Menu principal', 'sb-marketing' ),
        'footer'  => __( 'Menu pied de page', 'sb-marketing' ),
    ] );
}
add_action( 'after_setup_theme', 'sbm_setup' );


// ─────────────────────────────────────────────
// 2. ENQUEUE STYLES & SCRIPTS
// ─────────────────────────────────────────────
function sbm_enqueue_assets() {
    $uri = get_template_directory_uri();
    $ver = '1.1.0';

    // ── Styles ────────────────────────────────
    wp_enqueue_style(
        'sb-marketing-main',
        $uri . '/assets/css/tourdubloc-3e0b2f.shared.9a219fb46.css',
        [],
        $ver
    );

    // ── Scripts (deferred where possible) ─────
    // jQuery (bundled with WordPress – use the registered handle)
    wp_enqueue_script( 'jquery' );

    // Webflow runtime chunks (order matters – load sequentially)
    $wf_chunks = [
        'tourdubloc-3e0b2f.schunk.36b8fb49256177c8.js',
        'tourdubloc-3e0b2f.schunk.7bc38d72505cd683.js',
        'tourdubloc-3e0b2f.schunk.479bf77bc9dfc952.js',
        'tourdubloc-3e0b2f.schunk.9dfb96661114d3db.js',
        'tourdubloc-3e0b2f.schunk.7adc1548f4236a66.js',
        'tourdubloc-3e0b2f.c2a30b54.35b17dfba2d07dca.js',
        'tourdubloc-3e0b2f.9922b450.e331e117c807c702.js',
    ];
    $prev_handle = 'jquery';
    foreach ( $wf_chunks as $chunk ) {
        $handle = 'sb-marketing-' . substr( md5( $chunk ), 0, 8 );
        wp_enqueue_script( $handle, $uri . '/assets/js/' . $chunk, [ $prev_handle ], $ver, true );
        $prev_handle = $handle;
    }

    // GSAP suite
    wp_enqueue_script( 'gsap', $uri . '/assets/js/gsap.min.js', [], $ver, true );
    wp_enqueue_script( 'gsap-scrolltrigger', $uri . '/assets/js/ScrollTrigger.min.js', [ 'gsap' ], $ver, true );
    wp_enqueue_script( 'gsap-splittext', $uri . '/assets/js/SplitText.min.js', [ 'gsap' ], $ver, true );
    wp_enqueue_script( 'gsap-morphsvg', $uri . '/assets/js/MorphSVGPlugin.min.js', [ 'gsap' ], $ver, true );

    // Swiper
    wp_enqueue_script( 'swiper', $uri . '/assets/js/swiper-bundle.min.js', [], $ver, true );

    // split-type (text splitting utility from unpkg CDN)
    wp_enqueue_script( 'split-type', 'https://unpkg.com/split-type', [], null, true );

    // Custom animations, callouts slideshow, navbar scroll behaviour
    wp_enqueue_script(
        'sb-marketing-animations',
        $uri . '/assets/js/tourdubloc-animations.js',
        [ 'jquery', 'gsap', 'gsap-scrolltrigger', 'gsap-splittext', 'gsap-morphsvg', 'swiper', 'split-type' ],
        $ver,
        true
    );
}
add_action( 'wp_enqueue_scripts', 'sbm_enqueue_assets' );


// ─────────────────────────────────────────────
// 3. ANALYTICS – injected via wp_head / wp_body_open
//    (keeps tracking code out of template files)
// ─────────────────────────────────────────────
function sbm_gtm_head() {
    ?>
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-T875CVB');</script>
<!-- End Google Tag Manager -->

<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','669415017219216');
fbq('track','PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=669415017219216&ev=PageView&noscript=1"/></noscript>
<!-- End Meta Pixel Code -->

<!-- Hotjar -->
<script>
(function(h,o,t,j,a,r){
    h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
    h._hjSettings={hjid:6421144,hjsv:6};
    a=o.getElementsByTagName('head')[0];
    r=o.createElement('script');r.async=1;
    r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
    a.appendChild(r);
})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
</script>
<!-- End Hotjar -->

<!-- Enzuzo Cookie Bar -->
<script src="https://app.enzuzo.com/scripts/cookiebar/82ae0f52-af32-11ee-97ce-e3989736d969"></script>
    <?php
}
add_action( 'wp_head', 'sbm_gtm_head', 1 );

function sbm_gtm_body() {
    ?>
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-T875CVB"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
    <?php
}
add_action( 'wp_body_open', 'sbm_gtm_body' );


// ─────────────────────────────────────────────
// 4. CUSTOM POST TYPE – Projets (Case Studies)
// ─────────────────────────────────────────────
function sbm_register_cpts() {
    register_post_type( 'projet', [
        'labels' => [
            'name'               => __( 'Projets', 'sb-marketing' ),
            'singular_name'      => __( 'Projet', 'sb-marketing' ),
            'add_new_item'       => __( 'Ajouter un projet', 'sb-marketing' ),
            'edit_item'          => __( 'Modifier le projet', 'sb-marketing' ),
            'new_item'           => __( 'Nouveau projet', 'sb-marketing' ),
            'view_item'          => __( 'Voir le projet', 'sb-marketing' ),
            'search_items'       => __( 'Rechercher des projets', 'sb-marketing' ),
            'not_found'          => __( 'Aucun projet trouvé', 'sb-marketing' ),
            'not_found_in_trash' => __( 'Aucun projet dans la corbeille', 'sb-marketing' ),
        ],
        'public'             => true,
        'has_archive'        => true,
        'show_in_rest'       => true,
        'rewrite'            => [ 'slug' => 'projets' ],
        'supports'           => [ 'title', 'editor', 'thumbnail', 'excerpt', 'custom-fields' ],
        'menu_icon'          => 'dashicons-portfolio',
    ] );
}
add_action( 'init', 'sbm_register_cpts' );


// ─────────────────────────────────────────────
// 5. ELEMENTOR INTEGRATION
// ─────────────────────────────────────────────

/**
 * Register theme locations for Elementor Theme Builder.
 * Enables header/footer/single/archive override from Elementor > Theme Builder.
 */
function sbm_register_elementor_locations( $elementor_theme_manager ) {
    $elementor_theme_manager->register_all_core_location();
}
add_action( 'elementor/theme/register_locations', 'sbm_register_elementor_locations' );

/**
 * Returns true if the current page/post was built with Elementor.
 * Used in templates to decide whether to render Elementor content
 * or fall back to the original hardcoded HTML.
 */
function tdb_is_elementor_page(): bool {
    $post_id = get_the_ID();
    if ( ! $post_id ) {
        return false;
    }
    return get_post_meta( $post_id, '_elementor_edit_mode', true ) === 'builder';
}

/**
 * Renders the Elementor content for a theme location (header/footer/single/archive).
 * Returns false if Elementor Theme Builder has no template for this location,
 * so the caller can fall back to the native template HTML.
 */
function tdb_elementor_location( string $location ): bool {
    if ( function_exists( 'elementor_theme_do_location' ) ) {
        return elementor_theme_do_location( $location );
    }
    return false;
}

/**
 * Add Elementor's body classes when active (prevents JS targeting failures).
 */
function sbm_elementor_body_classes( array $classes ): array {
    if ( did_action( 'elementor/loaded' ) ) {
        $classes[] = 'elementor-default';
        if ( tdb_is_elementor_page() ) {
            $classes[] = 'elementor-page';
        }
    }
    return $classes;
}
add_filter( 'body_class', 'sbm_elementor_body_classes' );


// ─────────────────────────────────────────────
// 6. HELPERS
// ─────────────────────────────────────────────
function tdb_asset( string $path ): string {
    return get_template_directory_uri() . '/assets/' . ltrim( $path, '/' );
}


// ─────────────────────────────────────────────
// 7. WEBFLOW BODY CLASS (keeps Webflow JS happy)
// ─────────────────────────────────────────────
function sbm_body_class( array $classes ): array {
    $classes[] = 'w-mod-js';
    return $classes;
}
add_filter( 'body_class', 'sbm_body_class' );


// ─────────────────────────────────────────────
// 8. CUSTOM EXCERPT LENGTH
// ─────────────────────────────────────────────
function sbm_excerpt_length(): int {
    return 30;
}
add_filter( 'excerpt_length', 'sbm_excerpt_length' );
