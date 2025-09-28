/**
 * menu.js
 * A self-contained UI module for a slide-in navigation menu.
 */
export default class Menu {
    /**
     * @param {string} containerSelector The CSS selector for the element to append the menu to.
     */
    constructor(containerSelector) {
        this.container = document.querySelector(containerSelector);
        if (!this.container) {
            console.error(`Menu module could not find container element: ${containerSelector}`);
            return;
        }

        this.isOpen = false;
        this._render();
        this._bindEvents();
    }

    /**
     * Creates and injects the menu and overlay HTML into the container.
     * @private
     */
    _render() {
        // Create a wrapper for the menu elements
        const menuWrapper = document.createElement('div');
        menuWrapper.innerHTML = `
            <div class="menu-overlay"></div>
            <div id="slide-in-menu" class="slide-in-menu">
                <button class="close-menu-btn" title="Close menu">&times;</button>
                <nav class="menu-nav">
                    <a href="index.html#features">Features</a>
                    <a href="index.html#how-it-works">How It Works</a>
                    <a href="index.html#testimonials">Testimonials</a>
                    <a href="about.html">About</a>
                    <a href="releases.html">Releases</a>
                    <a href="https://docs.easyscanlate.site">Documentation</a>
                    <a href="https://github.com/Liiesl/EasyScanlate" target="_blank" rel="noopener noreferrer">GitHub</a>
                    <a href="#download" class="button js-download-trigger">Download Now</a>
                </nav>
            </div>
        `;
        this.container.appendChild(menuWrapper);

        // Store references to the created elements
        this.menuElement = this.container.querySelector('#slide-in-menu');
        this.overlayElement = this.container.querySelector('.menu-overlay');
        this.closeButton = this.container.querySelector('.close-menu-btn');
        this.navLinks = this.container.querySelectorAll('.menu-nav a');
    }

    /**
     * Binds all necessary event listeners for closing the menu.
     * @private
     */
    _bindEvents() {
        // Close events
        this.overlayElement.addEventListener('click', () => this.close());
        this.closeButton.addEventListener('click', () => this.close());

        // Close menu when a link is clicked
        this.navLinks.forEach(link => {
            link.addEventListener('click', () => {
                const href = link.getAttribute('href');
                const isExternal = link.target === '_blank';
                const isDownloadTrigger = link.classList.contains('js-download-trigger');

                // Don't interfere with external links or download triggers
                if (isExternal || isDownloadTrigger) {
                    return;
                }

                // Resolve the link's full URL to compare with the current page's URL
                const linkUrl = new URL(href, window.location.href);
                const currentUrl = new URL(window.location.href);

                // Check if it's a same-page anchor link
                const isSamePageAnchor = (
                    linkUrl.hostname === currentUrl.hostname &&
                    linkUrl.pathname === currentUrl.pathname &&
                    linkUrl.search === currentUrl.search &&
                    linkUrl.hash !== ''
                );
                
                if (isSamePageAnchor) {
                    this.close();
                }
                // For links to other pages, the menu will close implicitly on navigation.
            });
        });
    }

    /**
     * Opens the slide-in menu.
     */
    open() {
        if (this.isOpen) return;
        this.isOpen = true;
        document.body.classList.add('menu-open');
        this.menuElement.classList.add('is-open');
        this.overlayElement.classList.add('is-open');
    }

    /**
     * Closes the slide-in menu.
     */
    close() {
        if (!this.isOpen) return;
        this.isOpen = false;
        document.body.classList.remove('menu-open');
        this.menuElement.classList.remove('is-open');
        this.overlayElement.classList.remove('is-open');
    }
}