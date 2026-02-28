/**
 * Navigation Component
 * Dynamically injects the navbar and mobile overlay into the page
 */

(function () {
    'use strict';

    // Get the current page to highlight the active link
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Create navbar HTML
    function createNavbar() {
        const nav = document.createElement('nav');
        nav.className = 'navbar';

        nav.innerHTML = `
            <div class="nav-container">
                <!-- Left: Logo -->
                <a href="./index.html" class="logo">
                    <svg class="logo-icon" width="32" height="32" viewBox="0 0 1050 1041" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="1050" height="1041" rx="115" fill="#1A1A1A"/>
                        <path d="M626.352 165H425V366.351L365 426.351V165H278C216.144 165 166 215.144 166 277V770C166 831.856 216.144 882 278 882H365V734.768L425 720.869V882H630V669.729L742.333 559H883V420.341L943 361.197V770C943 864.993 865.993 942 771 942H278C183.007 942 106 864.993 106 770V277C106 182.007 183.007 105 278 105H686.352L626.352 165ZM690 882H771C832.856 882 883 831.856 883 770V619H690V882Z" fill="white"/>
                        <path d="M574.726 553.115L916.048 211.793L826.079 121.824L484.757 463.146M574.726 553.115L484.757 463.146M574.726 553.115L562.452 565.388L425.992 631.113C412.69 637.52 400.352 625.182 406.758 611.88L472.483 475.419L484.757 463.146M918.386 209.455L947.024 180.817C975.106 152.734 977.732 109.829 952.887 84.9844C928.043 60.1402 885.138 62.7653 857.055 90.8476L828.417 119.486L918.386 209.455Z" stroke="white" stroke-width="50"/>
                    </svg>
                    <span>EasyScanlate</span>
                </a>

                <!-- Center: Main navigation links -->
                <div class="nav-links nav-center">
                    <a href="./releases.html" ${currentPage === 'releases.html' ? 'class="active"' : ''}>Releases</a>
                    <a href="./roadmap.html" ${currentPage === 'roadmap.html' ? 'class="active"' : ''}>Roadmap</a>
                    <a href="https://docs.easyscanlate.site/" target="_blank">Docs</a>
                    <a href="./about.html" ${currentPage === 'about.html' ? 'class="active"' : ''}>About</a>
                </div>

                <!-- Right: Controls and actions -->
                <div class="nav-controls">
                    <button id="theme-toggle" class="theme-toggle" title="Toggle dark/light mode">
                        <span class="icon-sun">☀️</span>
                        <span class="icon-moon">🌙</span>
                    </button>
                    <!-- CHANGED: Replaced Github URL with Cloudflare Worker Tracker URL -->
                    <a href="https://e.easyscanlate.site/download?url=https://github.com/Liiesl/EasyScanlate/releases/download/latest/EasyScanlate-Installer.exe"
                        class="btn btn-primary js-download-trigger">Download</a>
                    <button id="burger-menu-toggle" class="burger-toggle" title="Open menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </div>
        `;

        return nav;
    }

    // Create mobile menu overlay
    function createMobileMenuOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'mobile-menu-overlay';
        return overlay;
    }

    // Create mobile menu
    function createMobileMenu() {
        const menu = document.createElement('div');
        menu.className = 'mobile-menu';

        menu.innerHTML = `
            <div class="mobile-menu-header">
                <span class="logo">
                    <svg class="logo-icon" width="32" height="32" viewBox="0 0 1050 1041" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="1050" height="1041" rx="115" fill="#1A1A1A"/>
                        <path d="M626.352 165H425V366.351L365 426.351V165H278C216.144 165 166 215.144 166 277V770C166 831.856 216.144 882 278 882H365V734.768L425 720.869V882H630V669.729L742.333 559H883V420.341L943 361.197V770C943 864.993 865.993 942 771 942H278C183.007 942 106 864.993 106 770V277C106 182.007 183.007 105 278 105H686.352L626.352 165ZM690 882H771C832.856 882 883 831.856 883 770V619H690V882Z" fill="white"/>
                        <path d="M574.726 553.115L916.048 211.793L826.079 121.824L484.757 463.146M574.726 553.115L484.757 463.146M574.726 553.115L562.452 565.388L425.992 631.113C412.69 637.52 400.352 625.182 406.758 611.88L472.483 475.419L484.757 463.146M918.386 209.455L947.024 180.817C975.106 152.734 977.732 109.829 952.887 84.9844C928.043 60.1402 885.138 62.7653 857.055 90.8476L828.417 119.486L918.386 209.455Z" stroke="white" stroke-width="50"/>
                    </svg>
                    <span>EasyScanlate</span>
                </span>
                <button class="mobile-menu-close">&times;</button>
            </div>
            <div class="mobile-menu-links">
                <a href="./releases.html">Releases</a>
                <a href="./roadmap.html">Roadmap</a>
                <a href="https://docs.easyscanlate.site/" target="_blank">Docs</a>
                <a href="./about.html">About</a>
            </div>
            <div class="mobile-menu-footer">
                <!-- CHANGED: Replaced Github URL with Cloudflare Worker Tracker URL -->
                <a href="https://e.easyscanlate.site/download?url=https://github.com/Liiesl/EasyScanlate/releases/download/latest/EasyScanlate-Installer.exe"
                    class="btn btn-primary js-download-trigger">Download</a>
            </div>
        `;

        return menu;
    }

    // Inject components when DOM is ready
    function injectNavComponents() {
        const body = document.body;

        // Find the first child of body (should be vector-background or first element)
        const firstChild = body.firstElementChild;

        // Create all navigation components
        const navbar = createNavbar();
        const mobileMenuOverlay = createMobileMenuOverlay();
        const mobileMenu = createMobileMenu();

        // Insert navbar after the first element (vector-background)
        if (firstChild && firstChild.classList.contains('vector-background')) {
            firstChild.insertAdjacentElement('afterend', navbar);
        } else {
            body.insertBefore(navbar, firstChild);
        }

        // Insert mobile menu components after navbar
        navbar.insertAdjacentElement('afterend', mobileMenuOverlay);
        mobileMenuOverlay.insertAdjacentElement('afterend', mobileMenu);
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', injectNavComponents);
    } else {
        injectNavComponents();
    }
})();