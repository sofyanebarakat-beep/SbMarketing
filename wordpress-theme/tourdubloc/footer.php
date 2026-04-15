  <!-- Footer -->
  <footer class="footer7_component">
    <div class="padding-global">
      <div class="container-large">
        <div class="padding-vertical padding-xxlarge">
          <div class="padding-bottom padding-xxlarge">
            <div class="footer7_top-wrapper">

              <a href="<?php echo esc_url( home_url( '/' ) ); ?>"
                 id="w-node-_31e37457-72c4-aaab-ac63-2cadd2ed1b7d-d2ed1b77"
                 class="footer7_logo-link w-nav-brand <?php echo is_front_page() ? 'w--current' : ''; ?>">
                <img src="<?php echo tdb_asset( 'images/logo-climanova.svg' ); ?>"
                     loading="lazy" alt="<?php bloginfo( 'name' ); ?>"
                     class="footer7_logo-img">
              </a>

              <div class="w-layout-grid footer7_link-list">
                <a href="<?php echo esc_url( home_url( '/' ) ); ?>"
                   class="footer7_link <?php echo is_front_page() ? 'w--current' : ''; ?>">Accueil</a>
                <a href="<?php echo esc_url( home_url( '/marketing' ) ); ?>"
                   class="footer7_link <?php echo is_page( 'marketing' ) ? 'w--current' : ''; ?>">Marketing</a>
                <a href="<?php echo esc_url( home_url( '/lp-centre-dappel' ) ); ?>"
                   class="footer7_link">Centre d'appels</a>
                <a href="<?php echo esc_url( home_url( '/projets' ) ); ?>"
                   class="footer7_link <?php echo ( is_page( 'projets' ) || is_post_type_archive( 'projet' ) ) ? 'w--current' : ''; ?>">Nos projets</a>
                <a href="<?php echo esc_url( home_url( '/contact' ) ); ?>"
                   class="footer7_link <?php echo is_page( 'contact' ) ? 'w--current' : ''; ?>">Contact</a>
              </div>

            </div>
          </div>

          <div class="line-divider"></div>

          <div class="padding-top padding-medium">
            <div class="footer7_bottom-wrapper">
              <div class="footer7_credit-text"><?php echo date( 'Y' ); ?> &copy; Sb Marketing</div>
              <div class="w-layout-grid footer7_legal-list">
                <a href="<?php echo esc_url( home_url( '/politique-de-confidentialite' ) ); ?>"
                   class="footer7_legal-link">Confidentialité</a>
                <a href="<?php echo esc_url( home_url( '/politique-de-confidentialite/#dsar' ) ); ?>"
                   class="footer7_legal-link">Accès aux données</a>
                <a href="#manage_cookies"
                   class="footer7_legal-link">Consentement aux cookies</a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  </footer>
  <!-- /Footer -->

</div><!-- /.page-wrapper -->

<!-- Lenis smooth scroll (must load with its data-* attributes intact) -->
<script
  data-id-scroll=""
  data-autoinit="true"
  data-duration="1"
  data-orientation="vertical"
  data-smoothwheel="true"
  data-smoothtouch="false"
  data-touchmultiplier="1.5"
  data-easing="(t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))"
  data-useoverscroll="true"
  data-usecontrols="true"
  data-useanchor="true"
  data-useraf="true"
  data-infinite="false"
  defer
  src="https://assets-global.website-files.com/645e0e1ff7fdb6dc8c85f3a2/64a5544a813c7253b90f2f50_lenis-offbrand.txt">
</script>

<?php wp_footer(); ?>
</body>
</html>
