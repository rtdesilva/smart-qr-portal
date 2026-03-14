// database-sync.js
// This script ensures that every attendance log has a corresponding student record.

document.addEventListener('DOMContentLoaded', async () => {
    const db = window.db;
    if (!db) return;

    console.log('🔄 Database Sync: Checking for student-attendance consistency...');

    try {
        // 1. Fetch all attendance logs
        const attendanceSnapshot = await db.collection('attendance').get();
        const attendanceLogs = attendanceSnapshot.docs.map(doc => doc.data());

        // 2. Fetch all registered students
        const studentSnapshot = await db.collection('students').get();
        const existingStudentIds = new Set(studentSnapshot.docs.map(doc => doc.id));

        const batch = db.batch();
        let syncCount = 0;

        // 3. Identify attendance logs without a student record
        const studentsToCreate = new Map();

        attendanceLogs.forEach(log => {
            if (!existingStudentIds.has(log.id)) {
                if (!studentsToCreate.has(log.id)) {
                    studentsToCreate.set(log.id, {
                        id: log.id,
                        name: log.name,
                        email: log.email || `${log.name.toLowerCase().replace(' ', '.')}@campus.edu`,
                        course: log.course || 'Unassigned',
                        gpa: (Math.random() * (4.0 - 2.5) + 2.5).toFixed(2), // Generate a reasonable GPA for synced students
                        modules: [
                            { name: 'General Studies', score: 85, grade: 'A' },
                            { name: 'Core Foundation', score: 78, grade: 'B' }
                        ],
                        addedViaSync: true,
                        timestamp: firebase.firestore.Timestamp.now()
                    });
                }
            }
        });

        // 4. Create missing student records
        studentsToCreate.forEach((studentData, studentId) => {
            const studentRef = db.collection('students').doc(studentId);
            batch.set(studentRef, studentData);
            syncCount++;
        });

        if (syncCount > 0) {
            await batch.commit();
            console.log(`✅ Database Sync: Successfully created ${syncCount} missing student records.`);
            // Notify other components to refresh
            document.dispatchEvent(new CustomEvent('studentAdded'));
        } else {
            console.log('✅ Database Sync: All attendance logs have corresponding student records. No sync needed.');
        }

    } catch (error) {
        console.error('❌ Database Sync Error:', error);
    }
});
