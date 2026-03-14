// settings.js
document.addEventListener('DOMContentLoaded', async () => {
    const role = localStorage.getItem('role');
    const studentDataStr = localStorage.getItem('loggedInStudent');
    const db = firebase.firestore();

    // Elements
    const tabItems = document.querySelectorAll('.tab-item');
    const tabContents = document.querySelectorAll('.tab-content');
    const profileForm = document.getElementById('profile-form');
    const nameInput = document.getElementById('user-fullname');
    const roleInput = document.getElementById('user-role');
    const idInput = document.getElementById('user-id');
    const courseGroup = document.getElementById('student-course-group');
    const courseInput = document.getElementById('user-course');

    // Tab Switching Logic
    tabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');

            tabItems.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            tab.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // Color Swatch Logic
    const swatches = document.querySelectorAll('.color-swatch');
    swatches.forEach(swatch => {
        swatch.addEventListener('click', () => {
            swatches.forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const color = swatch.getAttribute('data-color');
            document.documentElement.style.setProperty('--accent', color);
            localStorage.setItem('themeAccent', color);
        });
    });

    // Populate User Data
    const loadUserData = async () => {
        if (role === 'admin') {
            nameInput.value = 'Administrator';
            roleInput.value = 'Admin';
            idInput.value = 'ADM-001';
            courseGroup.style.display = 'none';
        } else if (role === 'student' && studentDataStr) {
            const student = JSON.parse(studentDataStr);
            roleInput.value = 'Student';
            idInput.value = student.id;
            nameInput.value = student.name;

            // Fetch latest from Firestore for more detail
            try {
                const doc = await db.collection('students').doc(student.id).get();
                if (doc.exists) {
                    const fullData = doc.data();
                    nameInput.value = fullData.name || student.name;
                    courseInput.value = fullData.course || 'Not Assigned';
                    courseGroup.style.display = 'block';
                }
            } catch (error) {
                console.error('Error fetching student details:', error);
            }
        }
    };

    await loadUserData();

    // Profile Form Submission
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = nameInput.value.trim();

        if (!newName) return alert('Name cannot be empty.');

        try {
            if (role === 'student') {
                const student = JSON.parse(studentDataStr);
                await db.collection('students').doc(student.id).update({
                    name: newName
                });

                // Update local storage
                student.name = newName;
                localStorage.setItem('loggedInStudent', JSON.stringify(student));
            } else {
                // Update Admin Profile
                const adminId = localStorage.getItem('adminId') || 'admin';
                await db.collection('admins').doc(adminId).update({
                    fullName: newName
                });
            }

            // Log activity
            const currentStudent = (role === 'student') ? JSON.parse(studentDataStr) : null;
            await db.collection('activityLogs').add({
                studentName: currentStudent ? currentStudent.name : 'Admin',
                action: 'Profile Update: Personal details updated.',
                timestamp: firebase.firestore.Timestamp.now(),
                role: role
            });

            alert('Profile updated successfully! ✨');
            window.location.reload();
        } catch (error) {
            console.error('Update failed:', error);
            alert('Failed to update profile.');
        }
    });

    // Security Form Submission (Password Update)
    const securityForm = document.getElementById('security-form');
    if (securityForm) {
        securityForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const currentPassword = document.getElementById('current-password').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;
            const submitBtn = document.getElementById('update-password-btn');

            if (newPassword !== confirmPassword) {
                return alert('New passwords do not match.');
            }

            if (newPassword.length < 6) {
                return alert('Password must be at least 6 characters.');
            }

            const originalText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Updating...';

            try {
                let userDocRef;
                if (role === 'admin') {
                    const adminId = localStorage.getItem('adminId') || 'admin';
                    userDocRef = db.collection('admins').doc(adminId);
                } else {
                    const student = JSON.parse(studentDataStr);
                    userDocRef = db.collection('students').doc(student.id);
                }

                const doc = await userDocRef.get();
                if (!doc.exists) throw new Error('User document not found.');

                const userData = doc.data();

                // Verify current password if it exists in DB
                if (userData.password && userData.password !== currentPassword) {
                    throw new Error('Incorrect current password.');
                }

                // Update password in Firestore
                await userDocRef.update({
                    password: newPassword
                });

                // Log activity
                const currentStudent = (role === 'student') ? JSON.parse(studentDataStr) : null;
                await db.collection('activityLogs').add({
                    studentName: currentStudent ? currentStudent.name : 'Admin',
                    action: 'Security Update: Password changed.',
                    timestamp: firebase.firestore.Timestamp.now(),
                    role: role
                });

                alert('Password updated successfully! 🔐');
                securityForm.reset();
            } catch (error) {
                console.error('Password update error:', error);
                alert(`Security Update Failed: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        });
    }

    // Apply saved theme preference
    const savedColor = localStorage.getItem('themeAccent');
    if (savedColor) {
        document.documentElement.style.setProperty('--accent', savedColor);
        const matchingSwatch = document.querySelector(`.color-swatch[data-color="${savedColor}"]`);
        if (matchingSwatch) {
            swatches.forEach(s => s.classList.remove('active'));
            matchingSwatch.classList.add('active');
        }
    }
});
