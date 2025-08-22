/**
 * --- REMOVED THEME PERSISTENCE LOGIC ---
 * This is now handled by a blocking inline script in index.html
 * to prevent the "flash of unthemed content".
 */

import TopBar from './TopBar.js';
import Menu from './menu.js';

console.log("Main application script loaded.");

/**
 * --- CONFIGURATION ---
 * Set the direct download link to your latest release asset.
 */
const latestReleaseUrl = 'https://github.com/Liiesl/ManhwaOCR/';

/**
 * --- POLISHED TRANSITION CONSTANTS ---
 */
const SCROLL_END_DEBOUNCE = 150; // ms of scroll inactivity to determine snap has finished

// --- INITIALIZE UI MODULES ---
const topBar = new TopBar('#main-header');
const menu = new Menu('body'); // The menu will be injected into the body

// --- NEW: MENU TOGGLE LOGIC ---
const burgerToggle = document.querySelector('#burger-menu-toggle');
if (burgerToggle) {
    burgerToggle.addEventListener('click', () => {
        menu.open();
    });
}


// --- SCROLL-BASED "TRANSITION MAGIC" & SNAPPING ---
const heroSection = document.querySelector('.hero'); // Get the hero element
const heroContent = document.querySelector('.hero-content');
const heroOverlay = document.querySelector('.hero-overlay');
const contentPanel = document.querySelector('.content-panel');

let isSnapping = false; // Flag to prevent scroll loops during programmatic "snap"
let scrollEndTimer = null; // Timer to detect when a programmatic scroll has finished

// Easing function for smoother, more natural animations
const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

/**
 * Handles the continuous visual updates based on scroll position.
 * This runs on every scroll event to ensure animations are liquid-smooth.
 * @param {number} scrollPosition The current window.scrollY
 */
function handleScrollAnimations(scrollPosition) {
    const snapPoint = heroSection.offsetHeight; // Use the hero's actual height as the animation boundary
    // Calculate progress and apply an easing function for a polished feel
    const rawProgress = Math.min(scrollPosition / snapPoint, 1);
    const progress = easeOutCubic(rawProgress);

    // 1. Animate the hero content fading out. We use rawProgress to make it fade slightly ahead of the easing.
    if (heroContent) {
        heroContent.style.opacity = 1 - Math.min(rawProgress * 1.5, 1);
    }
    // 2. Animate the dark overlay fading in over the hero.
    if (heroOverlay) {
        heroOverlay.style.opacity = progress * 0.5;
    }
    // 3. NEW: Animate the panel from full-width to container-width and manage its properties.
    if (contentPanel) {
        const viewportWidth = window.innerWidth;
        const targetMaxWidth = 1100; // This value is from .content-panel in CSS

        // The final width should not exceed the viewport width.
        const finalMaxWidth = Math.min(targetMaxWidth, viewportWidth);

        // Interpolate max-width from full viewport width down to the final constrained width.
        const interpolatedMaxWidth = (viewportWidth * (1 - progress)) + (finalMaxWidth * progress);
        // Interpolate the top border-radius from 0px (full-width) to 12px (snapped).
        const interpolatedRadius = 12 * progress;

        contentPanel.style.maxWidth = `${interpolatedMaxWidth}px`;
        contentPanel.style.borderRadius = `${interpolatedRadius}px ${interpolatedRadius}px 0 0`;

        // Add a visual cue that the panel is clickable when peeking.
        contentPanel.style.cursor = scrollPosition < snapPoint ? 'pointer' : 'default';
    }
}

// Set the initial state of the animations when the script loads
handleScrollAnimations(window.scrollY);

// The scroll listener's job is now ONLY to run animations and detect the end of a snap.
window.addEventListener('scroll', () => {
    // This will always run to keep animations smooth, both for user scroll and our programmatic scroll.
    handleScrollAnimations(window.scrollY);

    // If we are in a snapping state, we need to know when it's over.
    if (isSnapping) {
        clearTimeout(scrollEndTimer);
        // If no scroll events happen for a short duration, we assume the animation is finished.
        scrollEndTimer = setTimeout(() => {
            isSnapping = false;
        }, SCROLL_END_DEBOUNCE);
    }
}, { passive: true }); // This listener can remain passive as it doesn't block scrolling.

// --- MODIFIED: The wheel listener is the key to removing jank. It intercepts the scroll *intent*
// and replaces the default browser scroll with our smooth, programmatic snap.
window.addEventListener('wheel', (e) => {
    // If a snap animation is already running, prevent user's scroll from interfering.
    if (isSnapping) {
        e.preventDefault();
        return;
    }

    const scrollPosition = window.scrollY;
    const snapPoint = heroSection.offsetHeight;
    const isScrollingDown = e.deltaY > 0;
    const isScrollingUp = e.deltaY < 0;

    // INTENT 1: User is scrolling DOWN from the hero section.
    if (isScrollingDown && scrollPosition < snapPoint) {
        // We only hijack the scroll if they are not already at the snap point.
        // This small tolerance prevents them from getting "stuck" at the boundary.
        if (Math.abs(scrollPosition - snapPoint) > 1) {
            e.preventDefault();
            isSnapping = true;
            window.scrollTo({ top: snapPoint, behavior: 'smooth' });
        }
        // If we are already at (or very near) the snapPoint, we do nothing.
        // The default browser scroll will take over, allowing the user to scroll down the content.
    }
    // INTENT 2: User is scrolling UP towards the hero section.
    else if (isScrollingUp && scrollPosition > 0 && scrollPosition <= snapPoint + 5) { // Use a small buffer for reliability
        e.preventDefault();
        isSnapping = true;
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    // In all other cases (e.g., scrolling within the content panel away from the boundary),
    // no e.preventDefault() is called, so the browser's native scroll works as expected.

}, { passive: false }); // `passive: false` is required to use `preventDefault()`.


// --- NEW: SNAP PANEL ON CLICK ---
// Make the panel itself a trigger to snap into view.
if (contentPanel) {
    contentPanel.addEventListener('click', () => {
        const scrollPosition = window.scrollY;
        const snapPoint = heroSection.offsetHeight;

        // Only snap up if we're in the hero zone and not already snapping.
        // This prevents the click from doing anything once the panel is in view.
        if (scrollPosition < snapPoint && !isSnapping) {
            isSnapping = true;
            window.scrollTo({ top: snapPoint, behavior: 'smooth' });
        }
    });
}

// --- NEW: SNAP BACK TO HERO ON CLICKING BACKGROUND ---
// Makes clicking the hero background (e.g., in the margins beside the panel)
// scroll the view back to the top.
if (heroSection) {
    heroSection.addEventListener('click', (e) => {
        // This should only trigger if the click is on the hero background itself
        // or its semi-transparent overlay, not on child elements like the header or hero-content.
        if (e.target !== heroSection && e.target !== heroOverlay) {
            return;
        }

        const scrollPosition = window.scrollY;

        // Only trigger if the user is scrolled down at all and we are not currently snapping.
        if (scrollPosition > 0 && !isSnapping) {
            isSnapping = true;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}


// --- DOWNLOAD AND REDIRECT LOGIC ---
document.querySelectorAll('.js-download-trigger').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Download starting...');
        window.location.href = latestReleaseUrl;

        // Wait a few seconds to ensure the download has started, then redirect to the homepage.
        setTimeout(() => {
            window.location.href = '/'; // Redirect to the homepage
        }, 3000);
    });
});

// --- SMOOTH SCROLLING LOGIC ---
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    // Exclude download triggers from this logic
    if (anchor.classList.contains('js-download-trigger')) {
        return;
    }

    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        const targetElement = document.querySelector(this.getAttribute('href'));
        if (targetElement) {
             // Simplified: all internal links now just scroll the element into view.
             targetElement.scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});