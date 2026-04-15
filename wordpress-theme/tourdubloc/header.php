<!DOCTYPE html>
<html <?php language_attributes(); ?> class="w-mod-js">
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1">

<!-- Favicon -->
<link href="<?php echo tdb_asset( 'images/65fb1793509dbf93775ee277_TDB%20FAV%20ICON%2032px.png' ); ?>" rel="shortcut icon" type="image/x-icon">
<link href="<?php echo tdb_asset( 'images/65fb17976bf5ce18b1582093_TDB%20FAV%20ICON%20256px.png' ); ?>" rel="apple-touch-icon">

<!-- Font quality -->
<style>
* {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -o-font-smoothing: antialiased;
}
</style>

<!-- Page UI Styles (loader, navbar scroll, callouts, text animations) -->
<style>
html:not(.w-editor) .loader_component {
  display: block;
}

body::-webkit-scrollbar {
  display: none;
}
body {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.hero_sub-text-wrap .line {
  overflow: hidden;
}

.word {
  overflow: hidden;
  padding-bottom: 0.1em;
  margin-bottom: -0.1em;
  transform-origin: bottom;
}

/* Callouts text slideshow */
.callouts-wrapper {
  opacity: 0;
  transform: translateY(16px);
  transition: opacity 0.5s ease, transform 0.5s ease;
  pointer-events: none;
  background-color: var(--base-color-neutral--white) !important;
}
.callouts-wrapper.callout-active {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* Sticky navbar with brand colour on scroll */
.navbar2_component {
  position: fixed !important;
  top: 0 !important;
  inset: 0 0 auto !important;
  z-index: 9999;
  background-color: transparent;
  transition: background-color 0.3s ease;
}
.navbar2_component.is-scrolled {
  background-color: #041020 !important;
}
</style>

<?php wp_head(); ?>
</head>

<body <?php body_class(); ?>>
<?php wp_body_open(); ?>

<div class="page-wrapper">

  <!-- Webflow global utility styles -->
  <div class="global-styles w-embed"><style>
    .inherit-color * { color: inherit; }

    *[tabindex]:focus-visible,
    input[type="file"]:focus-visible {
      outline: 0.125rem solid #4d65ff;
      outline-offset: 0.125rem;
    }

    .w-richtext > :not(div):first-child,
    .w-richtext > div:first-child > :first-child { margin-top: 0 !important; }
    .w-richtext > :last-child,
    .w-richtext ol li:last-child,
    .w-richtext ul li:last-child { margin-bottom: 0 !important; }

    .pointer-events-off { pointer-events: none; }
    .pointer-events-on  { pointer-events: auto; }
    .div-square::after  { content: ""; display: block; padding-bottom: 100%; }

    .container-medium, .container-small, .container-large {
      margin-right: auto !important;
      margin-left: auto !important;
    }

    .text-style-3lines {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
    .text-style-2lines {
      display: -webkit-box;
      overflow: hidden;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .display-inlineflex { display: inline-flex; }
    .hide { display: none !important; }

    @media screen and (max-width: 991px) { .hide, .hide-tablet { display: none !important; } }
    @media screen and (max-width: 767px) { .hide-mobile-landscape { display: none !important; } }
    @media screen and (max-width: 479px) { .hide-mobile { display: none !important; } }

    .margin-0  { margin: 0rem !important; }
    .padding-0 { padding: 0rem !important; }
    .spacing-clean { padding: 0rem !important; margin: 0rem !important; }

    .margin-top    { margin-right: 0rem !important; margin-bottom: 0rem !important; margin-left: 0rem !important; }
    .padding-top   { padding-right: 0rem !important; padding-bottom: 0rem !important; padding-left: 0rem !important; }
    .margin-right  { margin-top: 0rem !important; margin-bottom: 0rem !important; margin-left: 0rem !important; }
    .padding-right { padding-top: 0rem !important; padding-bottom: 0rem !important; padding-left: 0rem !important; }
    .margin-bottom { margin-top: 0rem !important; margin-right: 0rem !important; margin-left: 0rem !important; }
    .padding-bottom{ padding-top: 0rem !important; padding-right: 0rem !important; padding-left: 0rem !important; }
    .margin-left   { margin-top: 0rem !important; margin-right: 0rem !important; margin-bottom: 0rem !important; }
    .padding-left  { padding-top: 0rem !important; padding-right: 0rem !important; padding-bottom: 0rem !important; }
    .margin-horizontal  { margin-top: 0rem !important; margin-bottom: 0rem !important; }
    .padding-horizontal { padding-top: 0rem !important; padding-bottom: 0rem !important; }
    .margin-vertical    { margin-right: 0rem !important; margin-left: 0rem !important; }
    .padding-vertical   { padding-right: 0rem !important; padding-left: 0rem !important; }

    .truncate-width { width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .no-scrollbar { -ms-overflow-style: none; overflow: -moz-scrollbars-none; }
    .no-scrollbar::-webkit-scrollbar { display: none; }

    html { font-size: calc(0.625rem + 0.41666666666666663vw); }
    @media screen and (max-width: 1920px) { html { font-size: calc(0.625rem + 0.41666666666666674vw); } }
    @media screen and (max-width: 1440px) { html { font-size: calc(0.8126951092611863rem + 0.20811654526534862vw); } }
    @media screen and (max-width: 479px)  { html { font-size: calc(0.7494769874476988rem + 0.8368200836820083vw); } }
  </style></div>

  <!-- Navigation -->
  <div data-collapse="medium" data-animation="default" data-duration="400"
       fs-scrolldisable-element="smart-nav"
       data-easing="ease" data-easing2="ease"
       role="banner" class="navbar2_component w-nav">
    <div class="navbar2_container">

      <a href="<?php echo esc_url( home_url( '/' ) ); ?>"
         class="navbar2_logo-link w-nav-brand <?php echo is_front_page() ? 'w--current' : ''; ?>">
        <img loading="lazy"
             src="<?php echo tdb_asset( 'images/logo-climanova.svg' ); ?>"
             alt="<?php bloginfo( 'name' ); ?>"
             class="navbar2_logo">
      </a>

      <nav role="navigation" id="w-node-e2b655d2-e396-ce84-c19b-32499953e03c-9953e038" class="navbar2_menu w-nav-menu">
        <a href="<?php echo esc_url( home_url( '/marketing' ) ); ?>"
           class="navbar2_link w-nav-link <?php echo ( is_page( 'marketing' ) ? 'w--current' : '' ); ?>">Marketing</a>
        <a href="<?php echo esc_url( home_url( '/centre-dappel-et-qualification' ) ); ?>"
           class="navbar2_link w-nav-link <?php echo ( is_page( 'centre-dappel-et-qualification' ) ? 'w--current' : '' ); ?>">Centre d'appel</a>
        <a href="<?php echo esc_url( home_url( '/projets' ) ); ?>"
           class="navbar2_link w-nav-link <?php echo ( is_page( 'projets' ) || is_post_type_archive( 'projet' ) ? 'w--current' : '' ); ?>">Nos projets</a>
      </nav>

      <div id="w-node-e2b655d2-e396-ce84-c19b-32499953e043-9953e038" class="navbar2_button-wrapper">
        <a href="<?php echo esc_url( home_url( '/contact' ) ); ?>"
           data-wf--button--variant="no-icon"
           class="special-button is-icon w-variant-dcf8a2db-149b-093c-ad09-76811261ba97 w-inline-block">
          <div class="div-block-7 w-variant-dcf8a2db-149b-093c-ad09-76811261ba97">
            <div class="special-button-image-wrapper">
              <img loading="lazy" src="<?php echo tdb_asset( 'images/soufiane-profile.jpg' ); ?>" alt="" class="image-3">
              <div class="status-indicator"></div>
            </div>
          </div>
          <div>Contact</div>
        </a>

        <div class="navbar2_menu-button w-nav-button">
          <div class="menu-icon2">
            <div class="menu-icon2_line-top"></div>
            <div class="menu-icon2_line-middle">
              <div class="menu-icon2_line-middle-inner"></div>
            </div>
            <div class="menu-icon2_line-bottom"></div>
          </div>
        </div>
      </div>

    </div>
  </div>
  <!-- /Navigation -->
