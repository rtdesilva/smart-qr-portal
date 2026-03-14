document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;

    const QRBtn = document.getElementById('btn-qr-login');
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
    });


    // --- QR Scanner Logic (Student) ---

    // Auth Success Handler
    const handleSuccessfulAuth = (userType, metadata = {}) => {
        scanStatus.innerHTML = '<i class="fa-solid fa-check-circle"></i> Authenticated! Redirecting...';
        scanStatus.style.color = "var(--success)";

        // Save to local storage to persist the role across pages
        localStorage.setItem('role', userType);
        if (userType === 'student' && metadata.id) {
            localStorage.setItem('loggedInStudent', JSON.stringify(metadata));
        } else if (userType === 'admin') {
            localStorage.setItem('adminId', metadata.username || 'admin');
        } else {
            localStorage.removeItem('loggedInStudent');
            localStorage.removeItem('adminId');
        }

        setTimeout(() => {
            window.location.href = 'index.html'; // Redirect to dashboard
        }, 1500);
    };

    const handleSuccessfulScan = async (qrData) => {
        if (isScanning) {
            await stopScan();
            
            // --- ROBUST PARSING ---
            // 1. Decode in case it's URL encoded (e.g. Student%3ASC-1234)
            let decodedData = qrData;
            try {
                decodedData = decodeURIComponent(qrData);
            } catch (e) {
                console.warn("Decoding failed, using raw data");
            }

            let studentId = decodedData.trim();

            // 2. Handle "Student:ID" prefix (case-insensitive)
            if (studentId.toLowerCase().startsWith('student:')) {
                studentId = studentId.substring(8).trim();
            }

            // 3. Remove leading '#' if present (common in manually typed IDs)
            if (studentId.startsWith('#')) {
                studentId = studentId.substring(1).trim();
            }

            try {
                // Fetch student from Firestore
                const doc = await db.collection('students').doc(studentId).get();
                if (doc.exists) {
                    const student = doc.data();

                    // Add a log entry for the login
                    await db.collection('activityLogs').add({
                        studentName: student.name,
                        action: "Authorized - QR Login",
                        timestamp: firebase.firestore.Timestamp.now(),
                        role: "student"
                    });

                    // --- RECORD ATTENDANCE ---
                    const now = new Date();
                    const hours = now.getHours();
                    const minutes = now.getMinutes().toString().padStart(2, '0');
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);

                    await db.collection('attendance').add({
                        id: student.id,
                        name: student.name,
                        initials: student.name.split(' ').map(n => n[0]).join(''),
                        email: `${student.name.toLowerCase().replace(' ', '.')}@campus.edu`,
                        course: student.course,
                        date: now.toISOString().split('T')[0],
                        time: `${displayHour}:${minutes} ${ampm}`,
                        location: "Main Entrance", // Default
                        status: hours > 9 ? "late" : "present", // Logic: Late after 9 AM
                        method: "QR Code",
                        timestamp: firebase.firestore.Timestamp.now()
                    });

                    handleSuccessfulAuth('student', student);
                } else {
                    scanStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Student ID not found.';
                    scanStatus.style.color = "var(--danger)";
                    setTimeout(() => {
                        scanStatus.innerHTML = '<i class="fa-solid fa-qrcode"></i> Scanning...';
                        scanStatus.style.color = "var(--accent)";
                        startScan(); // Resume scanning
                    }, 3000);
                }
            } catch (error) {
                console.error('Login error:', error);
                scanStatus.innerHTML = 'Authentication failed. Check connection.';
            }
        }
    };

    const startScan = async () => {
        loginArt.style.opacity = '0';
        QRUI.classList.add('active');

        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        try {
            scanStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Starting camera...';
            scanStatus.style.color = "var(--text-main)";

            // Attempt 1: Try environment-facing camera
            try {
                await html5QrCode.start(
                    { facingMode: "environment" },
                    config,
                    (decodedText) => handleSuccessfulScan(decodedText),
                    () => { } // Error ignored
                );
            } catch (firstErr) {
                console.warn("Environment camera failed, trying fallback...", firstErr);
                // Attempt 2: Try any available camera (null constraint)
                await html5QrCode.start(
                    {}, 
                    config,
                    (decodedText) => handleSuccessfulScan(decodedText),
                    () => { }
                );
            }
            
            isScanning = true;
            scanStatus.innerHTML = '<i class="fa-solid fa-qrcode"></i> Scanning...';
            scanStatus.style.color = "var(--accent)";

        } catch (err) {
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
        if (html5QrCode && isScanning) {
            try {
                await html5QrCode.stop();
                isScanning = false;
            } catch (err) {
                console.error("Failed to stop scanning.", err);
            }
        }
    };

    QRBtn.addEventListener('click', (e) => {
        e.preventDefault();
        startScan();
    });

    closeScan.addEventListener('click', () => {
        stopScan().then(() => {
            QRUI.classList.remove('active');
            loginArt.style.opacity = '1';
        });
    });

    // File upload handle
    qrUploadInput.addEventListener('change', (e) => {
        if (e.target.files.length == 0) return;

        if (!html5QrCode) {
            html5QrCode = new Html5Qrcode("qr-reader");
        }

        const imageFile = e.target.files[0];
        scanStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing Image...';
        scanStatus.style.color = "var(--text-main)";

        html5QrCode.scanFile(imageFile, true)
            .then(decodedText => {
                isScanning = true; // Pretend we are scanning so stopScan runs properly
                handleSuccessfulScan(decodedText);
            })
            .catch(err => {
                scanStatus.innerHTML = 'No QR Code detected in image.';
                scanStatus.style.color = "var(--danger)";
            });

        e.target.value = '';
    });


    // --- Traditional Form Handling ---

    formStudent.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = formStudent.querySelector('.btn-primary');
        const idInput = document.getElementById('student-id').value;
        const originalText = btn.innerHTML;

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating';
        btn.disabled = true;

        try {
            const doc = await db.collection('students').doc(idInput).get();
            if (doc.exists) {
                const student = doc.data();

                await db.collection('activityLogs').add({
                    studentName: student.name,
                    action: "Authorized - ID Login",
                    timestamp: firebase.firestore.Timestamp.now(),
                    role: "student"
                });

                // --- RECORD ATTENDANCE ---
                const now = new Date();
                const hours = now.getHours();
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const displayHour = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);

                await db.collection('attendance').add({
                    id: student.id,
                    name: student.name,
                    initials: student.name.split(' ').map(n => n[0]).join(''),
                    email: `${student.name.toLowerCase().replace(' ', '.')}@campus.edu`,
                    course: student.course,
                    date: now.toISOString().split('T')[0],
                    time: `${displayHour}:${minutes} ${ampm}`,
                    location: "Main Entrance",
                    status: hours > 9 ? "late" : "present",
                    method: "ID Input",
                    timestamp: firebase.firestore.Timestamp.now()
                });

                handleSuccessfulAuth('student', student);
            } else {
                alert('Student ID not found in database.');
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Cloud connection error. If using local file, ensure Firebase is configured.');
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

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
