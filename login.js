document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;

    const QRUI = document.getElementById('QR-ui');
    const loginArt = document.getElementById('login-art');
    const closeScan = document.getElementById('close-scan');
    const scanStatus = document.getElementById('login-scan-status');
    const qrUploadInput = document.getElementById('qr-upload-login');

    const tabStudent = document.getElementById('tab-student');
    const tabAdmin = document.getElementById('tab-admin');
    const formStudent = document.getElementById('student-login');
    const formAdmin = document.getElementById('admin-login');

    let html5QrCode;
    let isScanning = false;

    // --- Tab Switching Logic ---
    tabStudent.addEventListener('click', () => {
        tabStudent.className = 'btn-primary';
        tabStudent.style.background = 'linear-gradient(135deg, var(--primary), var(--accent-dark))';
        tabStudent.style.border = 'none';
        tabStudent.style.color = 'white';

        tabAdmin.className = 'btn-secondary';
        tabAdmin.style.background = 'transparent';
        tabAdmin.style.border = '1px solid var(--primary)';
        tabAdmin.style.color = 'var(--text-main)';

        formStudent.style.display = 'flex';
        formAdmin.style.display = 'none';

        // Auto-start scanner when switching back to Student
        startScan();
    });

    tabAdmin.addEventListener('click', () => {
        tabAdmin.className = 'btn-primary';
        tabAdmin.style.background = 'linear-gradient(135deg, var(--primary), var(--accent-dark))';
        tabAdmin.style.border = 'none';
        tabAdmin.style.color = 'white';

        tabStudent.className = 'btn-secondary';
        tabStudent.style.background = 'transparent';
        tabStudent.style.border = '1px solid var(--primary)';
        tabStudent.style.color = 'var(--text-main)';

        formAdmin.style.display = 'flex';
        formStudent.style.display = 'none';

        // Auto-stop scanner when switching to Admin
        stopScan();
    });


    // --- QR Scanner Logic (Student) ---

    // Auth Success Handler
    // Auth Success Handler
    const handleSuccessfulAuth = (userType, metadata = {}) => {
        scanStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> Authorized! Entering...';
        scanStatus.style.color = "var(--success)";

        // Save to local storage
        localStorage.setItem('role', userType);
        if (userType === 'student' && metadata.id) {
            localStorage.setItem('loggedInStudent', JSON.stringify(metadata));
        } else if (userType === 'admin') {
            localStorage.setItem('adminId', metadata.username || 'admin');
        }

        // --- INSTANT REDIRECT ---
        window.location.href = 'index.html';
    };

    const handleSuccessfulScan = async (qrData) => {
        if (!isScanning) return; // Guard against multiple triggers
        
        isScanning = false; 
        console.log("QR Recognized. Attempting to stop camera and verify...");

        // Visual success feedback
        const readerDiv = document.getElementById('qr-reader');
        if (readerDiv) {
            const flash = document.createElement('div');
            flash.className = 'scan-flash';
            readerDiv.appendChild(flash);
            setTimeout(() => flash.remove(), 400);
        }

        scanStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verifying Student ID...';
        scanStatus.style.color = "var(--accent)";

        // --- PARALLEL PROCESSING ---
        // Stop camera and query DB at the SAME time to save multiple seconds
        const stopCamPromise = stopScan();
        
        // --- ROBUST PARSING ---
        let decodedData = qrData;
        try {
            decodedData = decodeURIComponent(qrData);
        } catch (e) { }

        let studentId = decodedData.trim();
        if (studentId.toLowerCase().startsWith('student:')) {
            studentId = studentId.substring(8).trim();
        }
        if (studentId.startsWith('#')) {
            studentId = studentId.substring(1).trim();
        }

        try {
            // Start DB lookup immediately
            const docPromise = db.collection('students').doc(studentId).get();
            
            // Wait for BOTH (though DB usually takes longer, we don't block one for the other)
            const [doc] = await Promise.all([docPromise, stopCamPromise]);

            if (doc.exists) {
                const student = doc.data();
                
                // Fire off background logs WITHOUT awaiting them sequentially
                const logPromise = db.collection('activityLogs').add({
                    studentName: student.name,
                    action: "Authorized - QR Login",
                    timestamp: firebase.firestore.Timestamp.now(),
                    role: "student"
                });

                const now = new Date();
                const hours = now.getHours();
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);

                const attendancePromise = db.collection('attendance').add({
                    id: student.id,
                    name: student.name,
                    initials: student.name.split(' ').map(n => n[0]).join(''),
                    email: `${student.name.toLowerCase().replace(' ', '.')}@campus.edu`,
                    course: student.course,
                    date: now.toISOString().split('T')[0],
                    time: `${displayHour}:${minutes} ${ampm}`,
                    location: "Main Entrance",
                    status: hours > 9 ? "late" : "present",
                    method: "QR Code",
                    timestamp: firebase.firestore.Timestamp.now()
                });

                // Jump to dashboard once the data is prepped (logs finish in background)
                handleSuccessfulAuth('student', student);
            } else {
                console.warn("Student ID not found in database:", studentId);
                scanStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ID Not Found: ${studentId}`;
                scanStatus.style.color = "var(--danger)";
                setTimeout(() => {
                    scanStatus.innerHTML = '<i class="fa-solid fa-qrcode"></i> Scanning...';
                    scanStatus.style.color = "var(--accent)";
                    startScan(); // Resume scanning
                }, 4000);
            }
        } catch (error) {
            console.error('Database/Login error:', error);
            scanStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Connection Error. Restarting Scanner...';
            setTimeout(() => startScan(), 3000);
        }
    };

    const startScan = async () => {
        loginArt.style.opacity = '0';
        QRUI.classList.add('active');

        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        const config = {
            fps: 18, // Balanced for speed and CPU load, prevents "lag" queues
            aspectRatio: 1.0, 
            qrbox: (viewfinderWidth, viewfinderHeight) => {
                const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                // 65% is the sweet spot: small enough to be fast, large enough for ease of use
                return {
                    width: Math.floor(minEdgeSize * 0.65),
                    height: Math.floor(minEdgeSize * 0.65)
                };
            },
            videoConstraints: {
                facingMode: { ideal: "environment" }
                // Removed forced resolution to prevent background scaling latency
            },
            formatsToSupport: [ 0 ], // 0 = QR_CODE.
            experimentalFeatures: {
                useBarCodeDetectorIfSupported: true
            }
        };

        try {
            scanStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Starting camera...';
            scanStatus.style.color = "var(--text-main)";

            isScanning = true; // Set before start so immediate hits are caught

            // Attempt 1: Try environment-facing camera
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => {
                        console.log("QR Recognized (Live):", decodedText);
                        handleSuccessfulScan(decodedText);
                    },
                    (errorMessage) => {
                        // Very verbose, only enable for deep debugging
                        // console.log("Scan error:", errorMessage);
                    }
                );
            } catch (firstErr) {
                console.warn("Environment camera failed, trying fallback...", firstErr);
                // Attempt 2: Try any available camera (null constraint)
                await html5QrCode.start(
                    {}, 
                    config,
                    (decodedText) => {
                        console.log("QR Recognized (Fallback):", decodedText);
                        handleSuccessfulScan(decodedText);
                    },
                    () => { }
                );
            }
            
            scanStatus.innerHTML = '<i class="fa-solid fa-qrcode"></i> Scanning...';
            scanStatus.style.color = "var(--accent)";

        } catch (err) {
            isScanning = false;
            console.error("Critical camera error", err);
            let errorMsg = 'Camera Error.';
            if (err.name === 'NotReadableError') {
                errorMsg = 'Camera in use or not found.';
            } else if (err.name === 'NotAllowedError') {
                errorMsg = 'Permission denied.';
            } else if (err.name === 'NotFoundError') {
                errorMsg = 'No camera detected.';
            }
            scanStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${errorMsg}`;
            scanStatus.style.color = "var(--danger)";
        }
    };

    const stopScan = async () => {
        if (html5QrCode) {
            console.log("Requesting camera stop...");
            try {
                await html5QrCode.stop();
                console.log("Camera stopped successfully.");
            } catch (err) {
                console.warn("Camera stop issue (may already be stopped):", err);
            }
        }
        isScanning = false;
    };

    // Auto-start on load if student tab is active
    setTimeout(() => {
        if (formStudent.style.display !== 'none') {
            startScan();
        }
    }, 100);

    closeScan.addEventListener('click', () => {
        stopScan().then(() => {
            QRUI.classList.remove('active');
            loginArt.style.opacity = '1';
        });
    });

    // File upload handle
    qrUploadInput.addEventListener('change', async (e) => {
        if (e.target.files.length == 0) return;

        // Ensure camera is stopped first
        await stopScan();

        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        const imageFile = e.target.files[0];
        scanStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Image...';
        scanStatus.style.color = "var(--text-main)";

        try {
            const decodedText = await html5QrCode.scanFile(imageFile, true);
            isScanning = true; // Set to true so handleSuccessfulScan doesn't guard it
            await handleSuccessfulScan(decodedText);
        } catch (err) {
            console.error("QR Scan File Error:", err);
            scanStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> No QR detected in image.';
            scanStatus.style.color = "var(--danger)";
        }

        e.target.value = '';
    });


    // --- Traditional Form Handling (Student Disabled) ---
    /*
    formStudent.addEventListener('submit', async (e) => {
        // Feature removed as per user request
    });
    */

    // --- Admin Authentication & Seeding ---
    const checkAndSeedAdmins = async () => {
        if (!db) return;
        try {
            const adminRef = db.collection('admins').doc('admin');
            const doc = await adminRef.get();
            if (!doc.exists) {
                console.log('Seeding default admin credentials...');
                await adminRef.set({
                    username: "admin",
                    password: "password123", // In a real app, use hashing!
                    fullName: "System Administrator",
                    lastLogin: firebase.firestore.Timestamp.now()
                });
            }
        } catch (error) {
            console.error('Error seeding admin:', error);
        }
    };

    if (db) checkAndSeedAdmins();

    formAdmin.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!db) {
            alert('Database not connected. Check configuration.');
            return;
        }

        const btn = formAdmin.querySelector('.btn-primary');
        const username = document.getElementById('admin-username').value.trim();
        const password = document.getElementById('admin-password').value;
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating';
        btn.disabled = true;

        try {
            // We use the username as the document ID for quick lookup
            const adminRef = db.collection('admins').doc(username);
            const doc = await adminRef.get();

            if (doc.exists) {
                const adminData = doc.data();

                // Simple password check
                if (adminData.password === password) {
                    await adminRef.update({
                        lastLogin: firebase.firestore.Timestamp.now()
                    });

                    await db.collection('activityLogs').add({
                        studentName: "Admin",
                        action: "Admin Login Successful",
                        timestamp: firebase.firestore.Timestamp.now(),
                        role: "admin"
                    });

                    handleSuccessfulAuth('admin', adminData);
                } else {
                    alert('Invalid admin password.');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }
            } else {
                alert('Admin username not found.');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Admin login error:', error);
            alert(`Authentication error: ${error.message}`);
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

});
