/**
 * theme-switcher.js
 * Handles Light/Dark mode transitions and persistence across the SmartQR portal.
 */

document.addEventListener('DOMContentLoaded', () => {
    const themeToggleBtn = document.getElementById('theme-toggle');
    const body = document.body;

    // Force dark mode exclusively for Admin Portal
    localStorage.setItem('smartqr-theme', 'dark');
    body.classList.remove('light-mode');

    // Remove toggle button if it exists (extra safety)
    if (themeToggleBtn) {
        themeToggleBtn.style.display = 'none';
    }
});
