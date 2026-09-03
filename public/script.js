document.addEventListener('DOMContentLoaded', () => {

    // --- SMART VISIT TRACKING (BOT RESISTANT) ---
    // Only track if we haven't tracked them in this browser session yet
    // --- STRICT VISIT TRACKING (BOT RESISTANT) ---
    if (!sessionStorage.getItem('easyscanlate_visit_tracked')) {
        
        let hasTracked = false;
        let interactionScore = 0;
        const REQUIRED_SCORE = 20; // The minimum amount of interaction needed

        const trackHumanVisit = () => {
            if (hasTracked) return;
            hasTracked = true;

            sessionStorage.setItem('easyscanlate_visit_tracked', 'true');

            fetch('https://e.easyscanlate.site/visit', {
                method: 'POST'
            }).catch(err => console.error("Tracking failed", err));
        };

        const addScore = (points) => {
            if (hasTracked) return;
            interactionScore += points;
            
            if (interactionScore >= REQUIRED_SCORE) {
                trackHumanVisit();
            }
        };

        // 1. Mouse movement: Worth 1 point per movement. 
        // A human naturally sweeping the mouse across the screen will hit 20 points in half a second.
        window.addEventListener('mousemove', () => addScore(1), { passive: true });

        // 2. Scrolling: Worth 5 points per scroll tick. 
        // A human scrolling down to see your features will quickly hit 20 points.
        window.addEventListener('scroll', () => addScore(5), { passive: true });

        // 3. Clicks & Taps: Worth 20 points (Instant Pass). 
        // If they click anywhere or tap their phone screen, we instantly know they are human.
        window.addEventListener('click', () => addScore(20), { passive: true });
        window.addEventListener('touchstart', () => addScore(20), { passive: true });
        window.addEventListener('keydown', () => addScore(20), { passive: true });

        // 4. Time on page: Worth 2 points per second.
        // If they sit and read the hero section without touching the mouse for 10 seconds (10s x 2pts = 20), they pass.
        const timeInterval = setInterval(() => {
            if (hasTracked) {
                clearInterval(timeInterval);
            } else {
                addScore(2);
            }
        }, 1000);
    }
    // ---------------------------------------------

    // Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // Comparison Slider Logic
    const slider = document.getElementById('comparison-slider');
    const afterImage = document.querySelector('.after-image');
    const handle = document.querySelector('.comparison-handle');
    let isDragging = false;

    if (slider && afterImage && handle) {
        const updateSlider = (x) => {
            const rect = slider.getBoundingClientRect();
            let position = ((x - rect.left) / rect.width) * 100;
            position = Math.max(0, Math.min(100, position));
            afterImage.style.width = `${position}%`;
            handle.style.left = `${position}%`;
        };

        slider.addEventListener('mousedown', () => isDragging = true);
        window.addEventListener('mouseup', () => isDragging = false);
        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            updateSlider(e.clientX);
        });

        slider.addEventListener('touchstart', () => isDragging = true);
        window.addEventListener('touchend', () => isDragging = false);
        window.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            updateSlider(e.touches[0].clientX);
        });

        slider.addEventListener('click', (e) => {
            updateSlider(e.clientX);
        });
    }

    // Comparison Preview Switching
    const previewItems = document.querySelectorAll('.preview-item');
    const compBefore = document.getElementById('comp-before');
    const compAfter = document.getElementById('comp-after');

    if (previewItems.length > 0 && compBefore && compAfter) {
        previewItems.forEach(item => {
            item.addEventListener('click', () => {
                previewItems.forEach(p => p.classList.remove('active'));
                item.classList.add('active');
                const beforeSrc = item.getAttribute('data-before');
                const afterSrc = item.getAttribute('data-after');
                if (beforeSrc) compBefore.src = beforeSrc;
                if (afterSrc) compAfter.src = afterSrc;
            });
        });
    }

    // --- MODAL LOGIC ---
    const modal = document.getElementById('non-windows-modal');
    const closeBtn = document.querySelector('.modal-close-btn');
    const downloadBtns = document.querySelectorAll('.js-download-trigger');

    // Better detection: Check userAgent string instead of platform
    const isWindows = navigator.userAgent.includes('Windows');

    if (modal && downloadBtns.length > 0) {
        downloadBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Debugging: Check console to ensure click is registered
                console.log('Download clicked. Windows detected:', isWindows);

                if (!isWindows) {
                    e.preventDefault(); // Stop the link from jumping
                    e.stopPropagation(); // Stop other listeners (like smooth scroll) from interfering
                    modal.classList.add('active');
                } else {
                    // If it is windows, but link is '#', prevent jump
                    // (Note: We changed '#' to actual tracking URLs in HTML, so this won't trigger, which is correct! The link will open and track properly).
                    if (btn.getAttribute('href') === '#') {
                        e.preventDefault();
                    }
                }
            });
        });

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
            });
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    // --- SMOOTH SCROLL ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            if (href === '#' || href === '') return;

            e.preventDefault();
            try {
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth'
                    });
                }
            } catch (err) {
                console.warn('Smooth scroll failed for:', href);
            }
        });
    });

    // Workflow Video Switching
    const stepItems = document.querySelectorAll('.step-item');
    const stepVideos = document.querySelectorAll('.step-video');

    if (stepItems.length > 0 && stepVideos.length > 0) {
        const observerOptions = {
            root: null,
            rootMargin: '-40% 0px -40% 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const step = entry.target.getAttribute('data-step');
                    stepVideos.forEach(video => {
                        if (video.id === `video-step-${step}`) {
                            video.classList.add('active');
                        } else {
                            video.classList.remove('active');
                        }
                    });
                    stepItems.forEach(item => item.classList.remove('active'));
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        stepItems.forEach(item => observer.observe(item));
    }

    // Vector Background — scroll-linked draw + slow idle revolution (fast while scrolling)
    // (Breathing stays pure CSS; only the rings' circling motion is driven here.)
    const vectorBg = document.querySelector('.vector-background');
    if (vectorBg) {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        // Per-ring scroll factors mirror the nth-child rules in base.css (children 2-11)
        const REV_FACTORS = [0.9, 1.3, 1.1, 1.5, 0.95, 1.25, 1.6, 1.0, 1.4, 1.15];
        const PATTERN_LEN = 1.1; // dash cycle: 0.35+0.1+0.35+0.1+0.10+0.1
        const IDLE_SPEED = PATTERN_LEN / 600; // dash units/sec when idle (~10min per revolution)
        const SCROLL_SPEED = 0.1; // dash units/sec while scrolling (~11s per revolution)
        const IDLE_AFTER = 350; // ms of no scroll before easing back to idle speed
        const rings = Array.from(vectorBg.querySelectorAll('.vector-shape'));

        let lastScroll = -Infinity;
        let lastY = window.scrollY;
        let scrollDir = 1; // +1 scrolling down, -1 scrolling up

        window.addEventListener('scroll', () => {
            const y = window.scrollY;
            if (y !== lastY) scrollDir = y > lastY ? 1 : -1;
            lastY = y;
            lastScroll = performance.now();
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPercent = Math.min(1, Math.max(0, scrollY / docHeight));
                const drawOffset = 1 - scrollPercent;
                vectorBg.style.setProperty('--draw-progress', drawOffset);
            });
        }, { passive: true });

        if (!reduceMotion && rings.length > 0) {
            vectorBg.classList.add('js-rev');
            const n = rings.length;
            // Orbital shear: inner rings circle faster, outer rings slower.
            // (One shared phase made every ring's gaps stack up radially.)
            const orbitMul = rings.map((_, i) => 1.6 - (i / Math.max(1, n - 1)) * 1.1);
            // Staggered starting phases spread around your 0.4 base, so gaps
            // never line up across rings.
            const BASE_PHASE = 0.4;
            const revs = rings.map((_, i) => (BASE_PHASE + (i * PATTERN_LEN) / n) % PATTERN_LEN);
            const vels = rings.map(() => scrollDir * IDLE_SPEED);
            let prev = performance.now();

            const tick = (now) => {
                const dt = Math.min(0.1, (now - prev) / 1000);
                prev = now;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollT = docHeight > 0
                    ? Math.min(1, Math.max(0, window.scrollY / docHeight))
                    : 0;
                // Scrolling sets the pace; direction always follows the last scroll
                // gesture — scroll up and the slow idle crawl keeps drifting backward
                // until you scroll down again.
                const pace = (now - lastScroll < IDLE_AFTER) ? SCROLL_SPEED : IDLE_SPEED;
                const k = Math.min(1, dt * 5);
                rings.forEach((ring, i) => {
                    const target = scrollDir * pace * orbitMul[i];
                    vels[i] += (target - vels[i]) * k;
                    revs[i] = (((revs[i] + vels[i] * dt) % PATTERN_LEN) + PATTERN_LEN) % PATTERN_LEN;
                    ring.style.strokeDashoffset = String(scrollT * (REV_FACTORS[i] ?? 1) + revs[i]);
                });
                requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
        }
    }

    // Theme Toggle Logic
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const iconSun = document.querySelector('.icon-sun');
    const iconMoon = document.querySelector('.icon-moon');

    const savedTheme = localStorage.getItem('theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

    if (savedTheme) {
        htmlElement.setAttribute('data-theme', savedTheme);
    } else if (systemTheme === 'light') {
        htmlElement.setAttribute('data-theme', 'light');
    }

    const updateThemeIcons = () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        if (currentTheme === 'light') {
            if (iconSun) iconSun.style.display = 'none';
            if (iconMoon) iconMoon.style.display = 'block';
        } else {
            if (iconSun) iconSun.style.display = 'block';
            if (iconMoon) iconMoon.style.display = 'none';
        }
    };

    updateThemeIcons();

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = htmlElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            htmlElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcons();
        });
    }

    // Mobile Menu Logic
    const burgerToggle = document.getElementById('burger-menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');
    const mobileMenuOverlay = document.querySelector('.mobile-menu-overlay');
    const mobileMenuClose = document.querySelector('.mobile-menu-close');

    if (burgerToggle && mobileMenu && mobileMenuOverlay) {
        const toggleMenu = () => {
            burgerToggle.classList.toggle('active');
            mobileMenu.classList.toggle('active');
            mobileMenuOverlay.classList.toggle('active');
            document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
        };

        burgerToggle.addEventListener('click', toggleMenu);
        if (mobileMenuClose) mobileMenuClose.addEventListener('click', toggleMenu);
        mobileMenuOverlay.addEventListener('click', toggleMenu);

        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', toggleMenu);
        });
    }
});