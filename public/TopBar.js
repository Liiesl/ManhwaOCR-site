/**
 * TopBar.js
 * A self-contained UI module to control the main navigation header.
 * It encapsulates the logic for creating, rendering, showing, and hiding the element.
 */
export default class TopBar {
    /**
     * @param {string} selector The CSS selector for the header element to render into.
     */
    constructor(selector) {
        this.element = document.querySelector(selector);
        if (!this.element) {
            console.error(`TopBar module could not find element with selector: ${selector}`);
            return;
        }
        this._render();
        this._bindEvents();
    }

    /**
     * Renders the navigation content into the header element.
     * This keeps the UI logic contained within the JS module and out of the initial HTML.
     * @private
     */
    _render() {
        this.element.innerHTML = `
            <nav>
                <!-- Left: Logo -->
                <div class="logo"><a href="/">EasyScanlate</a></div>

                <!-- Center: Main navigation links (hidden on mobile) -->
                <div class="desktop-nav-center">
                    <a href="releases.html" class="nav-link">Releases</a>
                    <a href="https://docs.easyscanlate.site/" class="nav-link">Docs</a>
                    <a href="about.html" class="nav-link">About</a>
                </div>

                <!-- Right: Controls and actions -->
                <div class="header-controls">
                    <button id="theme-toggle" class="theme-toggle" title="Toggle dark/light mode">
                        <span class="icon-sun">☀️</span>
                        <span class="icon-moon">🌙</span>
                    </button>
                    <a href="https://github.com/Liiesl/EasyScanlate/releases/download/latest/EasyScanlate-Installer.exe" class="nav-link js-download-trigger">Download</a>
                    <button id="burger-menu-toggle" class="burger-toggle" title="Open menu">
                        <span></span>
                        <span></span>
                        <span></span>
                    </button>
                </div>
            </nav>
        `;
    }
    
    /**
     * Finds the theme toggle button and attaches a click event listener.
     * @private
     */
    _bindEvents() {
        const toggleButton = this.element.querySelector('#theme-toggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', () => {
                // Check the current theme on the <html> element
                const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
                // Determine the new theme
                const newTheme = isDark ? 'light' : 'dark';
                // Apply the new theme
                document.documentElement.setAttribute('data-theme', newTheme);
                // Save the user's preference for next time
                localStorage.setItem('theme', newTheme);
            });
        }
    }

    /**
     * Makes the top bar visible with a CSS class.
     */
    show() {
        this.element?.classList.add('is-visible');
    }

    /**
     * Hides the top bar by removing its visibility class.
     */
    hide() {
        this.element?.classList.remove('is-visible');
    }
}