document.addEventListener('DOMContentLoaded', () => {
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

    // --- MODAL LOGIC (Fixing the "Not Appearing" issue) ---
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

    // --- SMOOTH SCROLL (Fixed the SyntaxError Crash) ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');

            // CRITICAL FIX: 
            // If href is exactly "#", it is not a valid ID selector.
            // We MUST return here to prevent the crash that was stopping your modal.
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

    // Vector Background Animation
    const vectorBg = document.querySelector('.vector-background');
    if (vectorBg) {
        window.addEventListener('scroll', () => {
            requestAnimationFrame(() => {
                const scrollY = window.scrollY;
                const docHeight = document.documentElement.scrollHeight - window.innerHeight;
                const scrollPercent = Math.min(1, Math.max(0, scrollY / docHeight));
                const drawOffset = 1 - scrollPercent;
                vectorBg.style.setProperty('--draw-progress', drawOffset);
            });
        });
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