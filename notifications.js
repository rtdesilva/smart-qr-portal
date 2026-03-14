// notifications.js - Global notification handler
document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;
    const notifBtn = document.querySelector('.notifications');
    const badge = document.querySelector('.notifications .badge');

    // Create dropdown HTML if it doesn't exist
    if (notifBtn && !document.querySelector('.notification-dropdown')) {
        // Wrap notification icon in a container for positioning
        const container = document.createElement('div');
        container.className = 'notifications-container';
        notifBtn.parentNode.insertBefore(container, notifBtn);
        container.appendChild(notifBtn);

        const dropdownHTML = `
            <div class="notification-dropdown">
                <div class="dropdown-header">
                    <h4>Notifications</h4>
                    <span class="dropdown-badge" style="background: var(--danger); font-size: 0.7rem; padding: 2px 8px; border-radius: 10px; font-weight: bold; display: none;">0 New</span>
                </div>
                <div class="notification-list">
                    <div class="loading-notifs" style="padding: 1rem; text-align: center;">
                        <i class="fa-solid fa-spinner fa-spin"></i> Loading...
                    </div>
                </div>
                <div class="dropdown-footer">
                    <a href="index.html" class="view-all-link">View all activity</a>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', dropdownHTML);
    }

    const dropdown = document.querySelector('.notification-dropdown');
    const notifList = document.querySelector('.notification-list');

    // Toggle Dropdown
    if (notifBtn) {
        notifBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('active');
            if (dropdown.classList.contains('active')) {
                loadNotifications();
            }
        });
    }

    // Close on outside click
    window.addEventListener('click', () => {
        if (dropdown) dropdown.classList.remove('active');
    });

    const loadNotifications = async () => {
        if (!db || !notifList) return;

        try {
            const role = localStorage.getItem('role');
            const loggedInStr = localStorage.getItem('loggedInStudent');
            const query = db.collection('activityLogs');

            const snapshot = await query
                .orderBy('timestamp', 'desc')
                .limit(20)
                .get();

            let logs = [];
            snapshot.forEach(doc => logs.push({ id: doc.id, ...doc.data() }));

            if (role === 'student' && loggedInStr) {
                const student = JSON.parse(loggedInStr);
                logs = logs.filter(log => log.studentName === student.name);
            }

            logs = logs.slice(0, 5);
            notifList.innerHTML = '';
            
            // Get dashboard log list if it exists
            const dashboardLogList = document.querySelector('.log-list');
            if (dashboardLogList) dashboardLogList.innerHTML = '';
            
            if (logs.length === 0) {
                const emptyMsg = '<p style="padding: 1rem; text-align: center; color: var(--text-muted);">No new notifications.</p>';
                notifList.innerHTML = emptyMsg;
                if (dashboardLogList) dashboardLogList.innerHTML = emptyMsg;
                if (badge) badge.style.display = 'none';
                return;
            }

            // Update badge count
            const dropdownBadge = document.querySelector('.dropdown-badge');
            if (badge) {
                badge.innerText = logs.length;
                badge.style.display = 'flex';
            }
            if (dropdownBadge) {
                dropdownBadge.innerText = `${logs.length} New`;
                dropdownBadge.style.display = 'inline-block';
            }

            logs.forEach(data => {
                const time = data.timestamp ? data.timestamp.toDate() : new Date();
                const timeAgo = getTimeAgo(time);
                const timeStr = time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                
                let iconClass = 'scan';
                let icon = 'fa-qrcode';
                
                if (data.action.toLowerCase().includes('admin')) {
                    iconClass = 'system';
                    icon = 'fa-user-shield';
                } else if (data.action.toLowerCase().includes('fail')) {
                    iconClass = 'alert';
                    icon = 'fa-circle-exclamation';
                }

                // Dropdown Item
                const dropdownItem = `
                    <div class="notification-item">
                        <div class="notif-icon ${iconClass}">
                            <i class="fa-solid ${icon}"></i>
                        </div>
                        <div class="notif-content">
                            <h5>${data.studentName}</h5>
                            <p>${data.action}</p>
                            <div class="notif-time">${timeAgo}</div>
                        </div>
                    </div>
                `;
                notifList.insertAdjacentHTML('beforeend', dropdownItem);

                // Dashboard Log Item
                if (dashboardLogList) {
                    const logItem = `
                        <div class="log-item">
                            <div class="log-time">${timeStr}</div>
                            <div class="log-details">
                                <h4>${data.studentName}</h4>
                                <p>${data.action}</p>
                            </div>
                        </div>
                    `;
                    dashboardLogList.insertAdjacentHTML('beforeend', logItem);
                }
            });

        } catch (error) {
            console.error('Error loading notifications:', error);
            if (notifList) {
                notifList.innerHTML = '<p style="padding: 1rem; text-align: center; color: var(--danger);">Failed to load.</p>';
            }
        }
    };

    function getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        return "just now";
    }

    // Auto-load once to set badge
    if (db) loadNotifications();
});
