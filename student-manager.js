// student-manager.js
document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;
    
    // Only apply if we are on the students page.
    const addStudentBtn = document.getElementById('add-student-btn');
    if (!addStudentBtn) return;
    
    // Modal elements
    const modal = document.getElementById('add-student-modal');
    const closeBtn = document.querySelector('.close-modal');
    const form = document.getElementById('add-student-form');
    const qrDisplay = document.getElementById('generated-qr-display');
    const qrImage = document.getElementById('new-qr-image');
    const downloadBtn = document.getElementById('download-qr-btn');

    // QR Download Handler
    if (downloadBtn) {
        downloadBtn.addEventListener('click', async () => {
            if (!qrImage.src) return;
            
            try {
                const response = await fetch(qrImage.src);
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `student-qr-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } catch (error) {
                console.error('Download failed:', error);
                alert('Failed to download QR code. Please try right-clicking the image and "Save as...".');
            }
        });
    }

    // Default mock data (seed if empty)
    const checkAndSeedData = async () => {
        if (!db) {
            console.warn('Firestore (db) not initialized yet. Skipping seeding.');
            return;
        }
        try {
            const snapshot = await db.collection('students').get();
            if (snapshot.empty) {
                console.log('Seeding initial student data to Firestore...');
                const defaults = [
                    { 
                        name: "Sarah Jenkins", 
                        id: "SC-2489", 
                        course: "Computer Science",
                        gpa: 3.85,
                        totalCredits: 120,
                        earnedCredits: 96,
                        standing: "Good",
                        modules: [
                            { name: "Advanced Algorithms", score: 94, grade: "A", credits: 4 },
                            { name: "Data Structures", score: 90, grade: "A-", credits: 4 },
                            { name: "Computer Networks", score: 86, grade: "B+", credits: 3 },
                            { name: "Operating Systems", score: 83, grade: "B", credits: 4 },
                            { name: "Web Development", score: 98, grade: "A+", credits: 3 },
                            { name: "Database Systems", score: 78, grade: "C+", credits: 3 }
                        ]
                    },
                    { 
                        name: "Marcus Johnson", 
                        id: "SC-1102", 
                        course: "Business Admin",
                        gpa: 3.2,
                        totalCredits: 120,
                        earnedCredits: 80,
                        standing: "Good",
                        modules: [
                            { name: "Microeconomics", score: 85, grade: "B", credits: 3 },
                            { name: "Business Law", score: 92, grade: "A-", credits: 3 },
                            { name: "Marketing", score: 75, grade: "C", credits: 3 }
                        ]
                    },
                    { 
                        name: "Emily Chen", 
                        id: "SC-3991", 
                        course: "Engineering",
                        gpa: 3.9,
                        totalCredits: 120,
                        earnedCredits: 104,
                        standing: "Excellent",
                        modules: [
                            { name: "Fluid Mechanics", score: 95, grade: "A", credits: 4 },
                            { name: "Thermodynamics", score: 91, grade: "A-", credits: 4 },
                            { name: "Engineering Design", score: 98, grade: "A+", credits: 4 }
                        ]
                    }
                ];
                
                const batch = db.batch();
                defaults.forEach(student => {
                    const docRef = db.collection('students').doc(student.id);
                    batch.set(docRef, student);
                });
                await batch.commit();
                console.log('Seed successful.');
            }
        } catch (error) {
            console.error('Error seeding data:', error);
        }
    };

    if (db) checkAndSeedData();

    // Toggle Modal
    addStudentBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        qrDisplay.style.display = 'none'; // reset
        form.style.display = 'block';
        if (form.reset) form.reset();
    });

    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close if click outside
    window.addEventListener('click', (e) => {
        if (e.target == modal) {
            modal.style.display = 'none';
        }
    });

    // Form Submit
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!db) {
            alert('Cloud Database is not connected. Please check your firebase-config.js and internet connection.');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving Student...';

        const newStudent = {
            name: document.getElementById('new-name').value.trim(),
            id: document.getElementById('new-id').value.trim(),
            course: document.getElementById('new-course').value.trim(),
            gpa: 0.00,
            totalCredits: 120,
            earnedCredits: 0,
            standing: "Pending",
            modules: []
        };
        
        try {
            // Save to Firestore
            await db.collection('students').doc(newStudent.id).set(newStudent);
            
            // Log activity for notification
            await db.collection('activityLogs').add({
                studentName: newStudent.name,
                action: "Portal Registration: Welcome to SmartCampus!",
                timestamp: firebase.firestore.Timestamp.now(),
                role: "admin"
            });
            
            // Show the generated QR
            const qrData = encodeURIComponent(`Student:${newStudent.id}`);
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${qrData}`;
            qrImage.src = qrUrl;
            
            form.style.display = 'none';
            qrDisplay.style.display = 'flex';

            // Refresh local UI
            if (window.renderStudentList) {
                await window.renderStudentList();
            } else {
                document.dispatchEvent(new CustomEvent('studentAdded'));
            }
        } catch (error) {
            console.error('Error adding student:', error);
            let msg = 'Failed to register student.';
            if (error.code === 'permission-denied') {
                msg += '\nFirebase Firestore rules are blocking this request. Please set rules to Public/Test mode.';
            } else {
                msg += `\nCloud connection error: ${error.message}`;
            }
            alert(msg);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
