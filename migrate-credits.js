/**
 * MIGRATION SCRIPT: Run this once via browser console to update all student records with credits.
 * 
 * Instructions:
 * 1. Open your browser console while on the Students page.
 * 2. Paste this entire script and press Enter.
 */

async function runStudentCreditsMigration() {
    const db = window.db;
    if (!db) {
        console.error("Database (db) not found on window object.");
        return;
    }

    console.log("Starting migration: Updating all students with relevant credits...");

    try {
        const snapshot = await db.collection('students').get();
        if (snapshot.empty) {
            console.log("No students found in database.");
            return;
        }

        const gradePoints = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'F': 0.0
        };

        const batch = db.batch();
        let updateCount = 0;

        snapshot.forEach(doc => {
            const student = doc.data();
            let changed = false;

            if (!student.modules) student.modules = [];

            // 1. Ensure all modules have credits
            student.modules.forEach(m => {
                if (!m.credits) {
                    m.credits = 4; // Default to 4 credits if missing
                    changed = true;
                }
            });

            // 2. Recalculate GPA, Earned Credits, and Standing
            let totalPoints = 0;
            let totalCredits = 0;
            let earnedCredits = 0;

            student.modules.forEach(m => {
                const credits = parseInt(m.credits || 0);
                const points = gradePoints[m.grade] || 0;

                totalPoints += (points * credits);
                totalCredits += credits;

                if (m.grade !== 'F') {
                    earnedCredits += credits;
                }
            });

            const newGpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0.0;

            // Check if major fields changed or are missing
            if (student.gpa !== newGpa || student.earnedCredits !== earnedCredits || !student.standing) {
                student.gpa = newGpa;
                student.earnedCredits = earnedCredits;

                if (newGpa >= 3.5) student.standing = "Excellent";
                else if (newGpa >= 2.0) student.standing = "Good";
                else student.standing = "At Risk";

                changed = true;
            }

            if (changed) {
                const docRef = db.collection('students').doc(doc.id);
                batch.update(docRef, {
                    modules: student.modules,
                    gpa: student.gpa,
                    earnedCredits: student.earnedCredits,
                    standing: student.standing
                });
                updateCount++;
            }
        });

        if (updateCount > 0) {
            await batch.commit();
            console.log(`Migration successful! Updated ${updateCount} students.`);
        } else {
            console.log("All students are already up to date. No changes needed.");
        }

    } catch (error) {
        console.error("Migration failed:", error);
    }
}

// Automatically expose to window for easy access
window.runMigration = runStudentCreditsMigration;
console.log("Migration script loaded. Type 'runMigration()' in the console to start the update.");
