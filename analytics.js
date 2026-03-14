document.addEventListener('DOMContentLoaded', async () => {
    const db = window.db;
    if (!db) return;

    // Chart Global Defaults
    Chart.defaults.color = 'rgba(255, 255, 255, 0.6)';
    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.scale.grid.color = 'rgba(255, 255, 255, 0.03)';
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10, 10, 18, 0.95)';
    Chart.defaults.plugins.tooltip.titleColor = '#00f2fe';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(0, 242, 254, 0.3)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.usePointStyle = true;


    // Helper: Date Logic
    const getDateString = (date) => {
        const d = new Date(date);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().split('T')[0];
    };
    const todayStr = getDateString(new Date());

    // --- 1. Fetch Student Data (for Department Breakdown) ---
    const fetchDepartmentData = async () => {
        const snapshot = await db.collection('students').get();
        const deptCounts = {};
        
        snapshot.forEach(doc => {
            const course = doc.data().course || 'Unassigned';
            deptCounts[course] = (deptCounts[course] || 0) + 1;
        });

        return {
            labels: Object.keys(deptCounts),
            data: Object.values(deptCounts)
        };
    };

    // --- 2. Fetch Attendance Data (for Traffic Chart) ---
    const fetchTrafficData = async (filter = '7days') => {
        let snapshot;
        const now = new Date();
        
        if (filter === 'today') {
            snapshot = await db.collection('attendance').where('date', '==', todayStr).get();
            const hourlyStats = new Array(12).fill(0); // 7am to 6pm
            const labels = ['7am', '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm', '6pm'];

            snapshot.forEach(doc => {
                const timeStr = doc.data().time; // Assume e.g. "02:30 PM" or "14:30"
                if (timeStr) {
                    let actualHour = parseInt(timeStr.split(':')[0], 10);
                    
                    if (timeStr.toLowerCase().includes('pm') && actualHour !== 12) {
                        actualHour += 12;
                    } else if (timeStr.toLowerCase().includes('am') && actualHour === 12) {
                        actualHour = 0;
                    }

                    if (actualHour >= 7 && actualHour <= 18) {
                        hourlyStats[actualHour - 7]++;
                    }
                }
            });
            return { labels, data: hourlyStats };
        } else {
            let daysBack = 7;
            if (filter === '30days') daysBack = 30;
            if (filter === 'semester') daysBack = 90;

            const startDate = new Date();
            startDate.setDate(now.getDate() - daysBack + 1);
            const startDateStr = getDateString(startDate);

            snapshot = await db.collection('attendance')
                .where('date', '>=', startDateStr)
                .where('date', '<=', todayStr)
                .get();

            const dailyStats = {};
            
            snapshot.forEach(doc => {
                const dateStr = doc.data().date;
                if (dateStr >= startDateStr && dateStr <= todayStr) {
                    dailyStats[dateStr] = (dailyStats[dateStr] || 0) + 1;
                }
            });

            const labels = [];
            const data = [];
            
            for (let i = daysBack - 1; i >= 0; i--) {
                const d = new Date();
                d.setDate(now.getDate() - i);
                const dString = getDateString(d);
                const formattedLabel = `${d.toLocaleString('default', { month: 'short' })} ${d.getDate()}`;
                labels.push(formattedLabel);
                data.push(dailyStats[dString] || 0);
            }

            return { labels, data };
        }
    };

    // --- 3. Fetch Quick Stats ---
    const updateQuickStats = async () => {
        const attendanceSnapshot = await db.collection('attendance').get();
        const totalScans = attendanceSnapshot.size;
        
        // Find Peak Hour
        const hourCounts = {};
        attendanceSnapshot.forEach(doc => {
            const timeStr = doc.data().time;
            if (timeStr) {
                const hour = timeStr.split(':')[0] + (timeStr.toLowerCase().includes('pm') ? ' PM' : ' AM');
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            }
        });
        
        const peakHour = Object.entries(hourCounts).sort((a,b) => b[1] - a[1])[0]?.[0] || '---';

        // Update DOM
        const scansEl = document.getElementById('total-scans-val');
        const peakEl = document.getElementById('peak-traffic-val');
        
        if (scansEl) scansEl.innerText = totalScans.toLocaleString();
        if (peakEl) peakEl.innerText = peakHour;
    };

    // --- 4. Initialize Charts with Live Data ---
    try {
        const [deptData, trafficData] = await Promise.all([
            fetchDepartmentData(),
            fetchTrafficData(),
            updateQuickStats()
        ]);

        // Traffic Line Chart
        const ctxTraffic = document.getElementById('trafficChart').getContext('2d');
        const gradientTraffic = ctxTraffic.createLinearGradient(0, 0, 0, 400);
        gradientTraffic.addColorStop(0, 'rgba(0, 242, 254, 0.5)');
        gradientTraffic.addColorStop(1, 'rgba(0, 242, 254, 0.05)');

        const trafficChart = new Chart(ctxTraffic, {
            type: 'line',
            data: {
                labels: trafficData.labels,
                datasets: [{
                    label: 'Successful Verifications',
                    data: trafficData.data,
                    borderColor: '#00f2fe',
                    backgroundColor: gradientTraffic,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00f2fe',
                    pointBorderColor: 'rgba(255, 255, 255, 0.8)',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                plugins: { 
                    legend: { display: false },
                    tooltip: { enabled: true }
                },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.03)' }
                    }, 
                    x: { 
                        grid: { display: false }
                    } 
                }
            }
        });

        const dateFilter = document.getElementById('dateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', async (e) => {
                const newData = await fetchTrafficData(e.target.value);
                trafficChart.data.labels = newData.labels;
                trafficChart.data.datasets[0].data = newData.data;
                trafficChart.update();
            });
        }

        const generateReportBtn = document.getElementById('generateReportBtn');
        if (generateReportBtn) {
            generateReportBtn.addEventListener('click', () => {
                let csvContent = "data:text/csv;charset=utf-8,Time/Date,Successful Verifications\n";
                const labels = trafficChart.data.labels;
                const data = trafficChart.data.datasets[0].data;
                
                for (let i = 0; i < labels.length; i++) {
                    csvContent += `${labels[i]},${data[i]}\n`;
                }
                
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `campus_traffic_report_${new Date().toISOString().split('T')[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }

        // Department Breakdown Doughnut
        const ctxDept = document.getElementById('departmentChart').getContext('2d');
        new Chart(ctxDept, {
            type: 'doughnut',
            data: {
                labels: deptData.labels,
                datasets: [{
                    data: deptData.data,
                    backgroundColor: ['#4e54c8', '#8f94fb', '#00f2fe', '#4facfe', '#2ed573', '#ff4757'],
                    borderWidth: 2,
                    borderColor: '#0a0a0f',
                    cutout: '65%'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true } }
                }
            }
        });

        // Initializing remaining static charts (Confidence & Processing)
        initStaticCharts();

    } catch (error) {
        console.error('Error initializing analytics charts:', error);
    }

    function initStaticCharts() {
        // Confidence Semi-Circle
        const ctxConfidence = document.getElementById('confidenceChart').getContext('2d');
        new Chart(ctxConfidence, {
            type: 'doughnut',
            data: {
                labels: ['Confidence', 'Errors'],
                datasets: [{
                    data: [99.2, 0.8],
                    backgroundColor: ['#00f2fe', 'rgba(255, 255, 255, 0.05)'],
                    borderWidth: 0, cutout: '80%', circumference: 180, rotation: 270
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        // Processing Times
        const ctxProcessing = document.getElementById('processingChart').getContext('2d');
        new Chart(ctxProcessing, {
            type: 'bar',
            data: {
                labels: ['Main Gate', 'Library', 'Lab 1', 'Lab 2', 'Lab 3'],
                datasets: [{
                    label: 'Avg Response Time (ms)',
                    data: [105, 78, 130, 145, 112],
                    backgroundColor: '#8f94fb',
                    borderRadius: 4,
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

});

