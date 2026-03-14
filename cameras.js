document.addEventListener('DOMContentLoaded', () => {

    const cameraGrid = document.getElementById('camera-grid');
    const filterChips = document.querySelectorAll('.filter-chip');
    const searchInput = document.getElementById('camera-search');

    // Camera Mock Data
    const cameras = [
        { id: "CAM-01", name: "Main Entrance", location: "North Gate", status: "online", resolution: "4K AI", fps: "30fps" },
        { id: "CAM-02", name: "Library Turnstile", location: "Central Hub", status: "online", resolution: "1080p", fps: "60fps" },
        { id: "CAM-03", name: "Cafeteria Line A", location: "Student Union", status: "online", resolution: "1080p", fps: "30fps" },
        { id: "CAM-04", name: "Science Lab 102", location: "West Wing", status: "online", resolution: "4K AI", fps: "30fps" },
        { id: "CAM-05", name: "Gymnasium Entry", location: "Rec Center", status: "online", resolution: "1080p", fps: "30fps" },
        { id: "CAM-06", name: "Staff Parking Auto", location: "Lot B", status: "online", resolution: "1080p", fps: "15fps" },
        { id: "CAM-07", name: "Auditorium Back", location: "South Wing", status: "offline", resolution: "1080p", fps: "--" },
        { id: "CAM-08", name: "Dormitory Alpha", location: "Living Quarters", status: "online", resolution: "4K AI", fps: "30fps" }
    ];

    const generateCameraCards = (data) => {
        cameraGrid.innerHTML = '';

        if (data.length === 0) {
            cameraGrid.innerHTML = '<div style="color:var(--text-muted); padding: 2rem;">No cameras found matching filter criteria.</div>';
            return;
        }

        data.forEach((cam, index) => {
            const isOffline = cam.status === 'offline';
            const statusClass = `status-${cam.status}`;
            const statusText = cam.status.charAt(0).toUpperCase() + cam.status.slice(1);

            // Random offset for animation delays so they don't scan in sync
            const animDelay = Math.random() * 5 + 's';

            let viewportContent = `
                <img src="scan.png" alt="${cam.name}" class="cam-image">
                <div class="scan-overlay-grid"></div>
                <div class="mini-scan-line" style="animation-duration: ${Math.random() * 2 + 1.5}s; animation-delay: ${animDelay}"></div>
                <div class="mini-track-box track-${index}">
                    <div class="mini-match-label label-${index}">Match!</div>
                </div>
            `;

            if (isOffline) {
                viewportContent = `
                    <div class="offline-msg">
                        <i class="fa-solid fa-video-slash"></i>
                        <span>Feed Unavailable</span>
                    </div>
                `;
            }

            const card = document.createElement('div');
            card.className = `camera-card ${isOffline ? 'offline' : 'online'}`;
            // If online, randomly decide if it's currently scanning
            if (!isOffline && Math.random() > 0.3) {
                card.classList.add('is-scanning');
            }

            card.innerHTML = `
                <div class="cam-viewport">
                    <div class="cam-status ${statusClass}">
                        <div class="status-dot"></div>
                        ${statusText}
                    </div>
                    ${viewportContent}
                </div>
                <div class="cam-info">
                    <div class="cam-title">
                        <h3>${cam.name}</h3>
                        <i class="fa-solid fa-ellipsis-vertical"></i>
                    </div>
                    <div class="cam-meta">
                        <span><i class="fa-solid fa-location-dot"></i> ${cam.location}</span>
                        <span><i class="fa-solid fa-microchip"></i> ${cam.resolution}</span>
                        <span><i class="fa-solid fa-stopwatch"></i> ${cam.fps}</span>
                    </div>
                    <div class="cam-actions">
                        <button class="cam-btn"><i class="fa-solid fa-expand"></i> View Full</button>
                        <button class="cam-btn"><i class="fa-solid fa-gear"></i> Settings</button>
                    </div>
                </div>
            `;
            cameraGrid.appendChild(card);
        });

        startRandomMatches();
    };

    // Simulate random positive matches hitting the cameras
    let matchInterval;
    const startRandomMatches = () => {
        clearInterval(matchInterval);

        matchInterval = setInterval(() => {
            // Find all track boxes
            const trackBoxes = document.querySelectorAll('.mini-track-box');
            if (trackBoxes.length === 0) return;

            // Pick a random box
            const randomBox = trackBoxes[Math.floor(Math.random() * trackBoxes.length)];

            // Force matched state
            randomBox.classList.add('matched');

            // Generate fake ID
            const label = randomBox.querySelector('.mini-match-label');
            if (label) label.innerText = `ID-#${Math.floor(Math.random() * 8000)}`;

            // Remove it after 2 seconds
            setTimeout(() => {
                randomBox.classList.remove('matched');
            }, 2000);

        }, 3500); // Every 3.5 seconds
    };

    // Filtering logic
    const filterCameras = () => {
        const term = searchInput.value.toLowerCase();
        // get active chip
        const activeFilter = document.querySelector('.filter-chip.active').dataset.filter;

        const filtered = cameras.filter(cam => {
            const matchSearch = cam.name.toLowerCase().includes(term) || cam.location.toLowerCase().includes(term);
            const matchStatus = activeFilter === 'all' || cam.status === activeFilter;
            return matchSearch && matchStatus;
        });

        generateCameraCards(filtered);
    };

    // Filter Chips Events
    filterChips.forEach(chip => {
        chip.addEventListener('click', (e) => {
            filterChips.forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            filterCameras();
        });
    });

    // Search Event
    searchInput.addEventListener('input', filterCameras);

    // Initial load
    generateCameraCards(cameras);

});
