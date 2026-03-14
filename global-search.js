// global-search.js - Handles top-bar search across all pages
document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;
    const searchBar = document.querySelector('.search-bar');
    const searchInput = searchBar ? searchBar.querySelector('input') : null;

    if (!searchBar || !searchInput) return;

    // Create results dropdown if it doesn't exist
    if (!document.querySelector('.search-results-dropdown')) {
        const dropdownHTML = `<div class="search-results-dropdown"></div>`;
        searchBar.insertAdjacentHTML('beforeend', dropdownHTML);
    }

    const dropdown = searchBar.querySelector('.search-results-dropdown');
    let debounceTimer;

    // Input event listener
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim().toLowerCase();
        
        clearTimeout(debounceTimer);
        
        if (query.length < 2) {
            dropdown.classList.remove('active');
            dropdown.innerHTML = '';
            return;
        }

        debounceTimer = setTimeout(() => {
            performSearch(query);
        }, 300);
    });

    // Perform Firestore search
    const performSearch = async (query) => {
        if (!db) return;

        try {
            dropdown.innerHTML = '<div class="no-results"><i class="fa-solid fa-spinner fa-spin"></i> Searching...</div>';
            dropdown.classList.add('active');

            // Firestore doesn't support easy full-text search without 3rd party
            // But we can do a simple prefix search or fetch all and filter client-side for small datasets
            // For this portal, client-side filtering of all students is efficient enough
            const snapshot = await db.collection('students').get();
            const results = [];

            snapshot.forEach(doc => {
                const student = doc.data();
                if (student.name.toLowerCase().includes(query) || student.id.toLowerCase().includes(query)) {
                    results.push({ id: doc.id, ...student });
                }
            });

            renderResults(results);

        } catch (error) {
            console.error('Search error:', error);
            dropdown.innerHTML = '<div class="no-results text-danger">Search failed.</div>';
        }
    };

    // Render results in dropdown
    const renderResults = (results) => {
        if (results.length === 0) {
            dropdown.innerHTML = '<div class="no-results">No students found matching your query.</div>';
            return;
        }

        dropdown.innerHTML = '';
        results.slice(0, 5).forEach(student => {
            const item = document.createElement('a');
            item.className = 'search-result-item';
            // We'll store the student ID in a way students.html can catch or just redirect
            item.href = `students.html?id=${student.id}`;
            
            item.innerHTML = `
                <div class="search-result-avatar">
                    ${student.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div class="search-result-info">
                    <div class="search-result-name">${student.name}</div>
                    <div class="search-result-id">${student.id}</div>
                </div>
            `;

            item.addEventListener('click', (e) => {
                // If we are on students.html, we might want to trigger the view without full reload
                // But for simplicity, full reload with query param is fine
                // The current students.html/student-views.js needs to handle query param
            });

            dropdown.appendChild(item);
        });
    };

    // Close on outside click
    window.addEventListener('click', (e) => {
        if (!searchBar.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Prevent closing when clicking inside dropdown
    dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
});
