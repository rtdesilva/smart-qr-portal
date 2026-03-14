document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;
    
    // UI Elements
    const logList = document.querySelector('.log-list');



    // Initialize Log
    const initLogs = async (role, studentName) => {
        if (!logList) return;
        logList.innerHTML = '';
        const now = new Date();
        
        try {
            if (role === 'admin') {
                // For admin, show recent scans from ALL students
                const snapshot = await db.collection('activityLogs')
                    .orderBy('timestamp', 'desc')
                    .limit(5)
                    .get();

                if (snapshot.empty) {
                    // Seed initial logs if empty
                    const seedLogs = [
                        { studentName: "Sarah Jenkins", action: "Authorized - Main Entrance", timestamp: firebase.firestore.Timestamp.now() },
                        { studentName: "Marcus Johnson", action: "Authorized - Main Entrance", timestamp: firebase.firestore.Timestamp.now() },
                        { studentName: "Emily Chen", action: "Authorized - Library", timestamp: firebase.firestore.Timestamp.now() }
                    ];
                    for(const log of seedLogs) {
                        await db.collection('activityLogs').add(log);
                    }
                    return initLogs('admin'); // retry after seed
                }

                snapshot.forEach(doc => {
                    const log = doc.data();
                    const date = log.timestamp ? log.timestamp.toDate() : new Date();
                    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const logItem = `
                        <div class="log-item">
                            <div class="log-time">${timeStr}</div>
                            <div class="log-details">
                                <h4>${log.studentName}</h4>
                                <p>${log.action}</p>
                            </div>
                        </div>
                    `;
                    logList.insertAdjacentHTML('beforeend', logItem);
                });
            } else {
                // Student specific logs
                const snapshot = await db.collection('activityLogs')
                    .where('studentName', '==', studentName)
                    .orderBy('timestamp', 'desc')
                    .limit(5)
                    .get();

                snapshot.forEach(doc => {
                    const log = doc.data();
                    const date = log.timestamp ? log.timestamp.toDate() : new Date();
                    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    const logItem = `
                        <div class="log-item">
                            <div class="log-time">${timeStr}</div>
                            <div class="log-details">
                                <h4>${studentName}</h4>
                                <p>${log.action}</p>
                            </div>
                        </div>
                    `;
                    logList.insertAdjacentHTML('beforeend', logItem);
                });
            }
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    };
    
    // Check role and personalize dashboard
    const initDashboard = async () => {
        const role = localStorage.getItem('role');
        const loggedInStr = localStorage.getItem('loggedInStudent');
        const adminWelcome = document.getElementById('admin-welcome');

        try {
            if (role === 'student' && loggedInStr) {
                const student = JSON.parse(loggedInStr);
                
                // Fetch latest data from Firestore
                const studentDoc = await db.collection('students').doc(student.id).get();
                const latestStudent = studentDoc.exists ? studentDoc.data() : student;

                if(adminWelcome) {
                    adminWelcome.innerHTML = `<span class="text-glow">Welcome back, ${latestStudent.name.split(' ')[0]}!</span>`;
                    const welcomeSub = adminWelcome.nextElementSibling;
                    if(welcomeSub) welcomeSub.innerText = "Here's your academic progress overview.";
                }

                if (gpaEl) gpaEl.innerText = parseFloat(latestStudent.gpa || 0).toFixed(2);
                if (creditsEl) creditsEl.innerText = latestStudent.earnedCredits || 0;

                // Calculate real Attendance percentage
                try {
                    const attendanceSnapshot = await db.collection('attendance').where('id', '==', latestStudent.id).get();
                    const totalDays = 30; // Target days for a semester
                    const presentDays = attendanceSnapshot.size;
                    const percent = Math.min(Math.round((presentDays / totalDays) * 100), 100);
                    if (attendEl) attendEl.innerText = `${percent}%`;
                } catch (err) {
                    console.error("Attendance calc error:", err);
                }

                // Logs are now handled by notifications.js for better synchronization
            } else if (role === 'admin') {
                // Default Admin view
                if(adminWelcome) adminWelcome.innerHTML = `<span class="text-glow">Welcome back, Admin!</span>`;
                
                // Admin stats calculation
                const studentSnapshot = await db.collection('students').get();
                const totalStudentsEl = document.getElementById('total-students-stat');
                if (totalStudentsEl) totalStudentsEl.innerText = studentSnapshot.size;

                const todayStr = new Date().toISOString().split('T')[0];
                const attendanceSnapshot = await db.collection('attendance').where('date', '==', todayStr).get();
                const totalPresentEl = document.getElementById('total-present-stat');
                if (totalPresentEl) totalPresentEl.innerText = attendanceSnapshot.size;

                const logsSnapshot = await db.collection('activityLogs').get();
                const logsEl = document.getElementById('recent-logs-count');
                if (logsEl) logsEl.innerText = logsSnapshot.size;

                // Logs are now handled by notifications.js for better synchronization
            }
        } catch (error) {
            console.error('Error initializing dashboard:', error);
        }
    };

    initDashboard();
});

