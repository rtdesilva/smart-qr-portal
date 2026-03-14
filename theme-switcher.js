/**
 * theme-switcher.js
 * Handles Light/Dark mode transitions and persistence across the SmartQR portal.
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Load saved theme or default to dark
    const savedTheme = localStorage.getItem('smartqr-theme') || 'dark';
    
    if (savedTheme === 'light') {
        body.classList.add('light-mode');
        updateToggleButton(true);
    } else {
        updateToggleButton(false);
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isLightMode = body.classList.toggle('light-mode');
            localStorage.setItem('smartqr-theme', isLightMode ? 'light' : 'dark');
            updateToggleButton(isLightMode);
            
            // Dispatch event for other components (like charts) to react if needed
            window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme: isLightMode ? 'light' : 'dark' } }));
        });
    }

    function updateToggleButton(isLight) {
        if (!themeToggleBtn) return;
        const icon = themeToggleBtn.querySelector('i');
        if (icon) {
            icon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        }
        themeToggleBtn.title = isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode';
    }
});
