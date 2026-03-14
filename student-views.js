// student-views.js
document.addEventListener('DOMContentLoaded', () => {
    const db = window.db;
    const listView = document.getElementById('students-list-view');
    const detailView = document.getElementById('student-detail-view');
    const studentsGrid = document.getElementById('students-grid');
    const detailProfileCard = document.getElementById('detail-profile-card');
    const detailModulesGrid = document.getElementById('detail-modules-grid');
    const backBtn = document.getElementById('back-to-list');
    const addModuleBtn = document.getElementById('add-module-btn');
    const moduleModal = document.getElementById('add-module-modal');
    const moduleForm = document.getElementById('module-form');
    const closeModuleModal = document.getElementById('close-module-modal');

    let currentEditingStudentId = null;

    const renderStudentList = async (searchTerm = '') => {
        try {
            const snapshot = await db.collection('students').get();
            studentsGrid.innerHTML = '';
            const lowerSearch = searchTerm.toLowerCase();

            snapshot.forEach(doc => {
                const student = doc.data();
                if (searchTerm && 
                    !student.name.toLowerCase().includes(lowerSearch) && 
                    !student.id.toLowerCase().includes(lowerSearch)) {
                    return;
                }

                const card = document.createElement('div');
                card.className = 'module-item';
                card.style.cursor = 'pointer';
                card.innerHTML = `
                    <div class="module-name">
                        <span>${student.name}</span>
                        <i class="fa-solid fa-user-graduate"></i>
                    </div>
                    <div class="module-grade" style="color: var(--accent); font-size: 1.2rem;">GPA: ${parseFloat(student.gpa || 0).toFixed(2)}</div>
                    <div class="text-muted" style="font-size: 0.8rem; margin-top: 5px;">ID: #${student.id}</div>
                    <div class="text-muted" style="font-size: 0.8rem;">Course: ${student.course}</div>
                `;
                card.addEventListener('click', () => showStudentDetail(student.id));
                studentsGrid.appendChild(card);
            });
        } catch (error) {
            console.error('Error rendering student list:', error);
        }
    };

    // Add Search Event Listener
    const searchInput = document.getElementById('global-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderStudentList(e.target.value);
        });
    }

    // Expose for student-manager.js
    window.renderStudentList = renderStudentList;
    document.addEventListener('studentAdded', () => renderStudentList());

    const showStudentDetail = async (studentId) => {
        currentEditingStudentId = studentId;
        try {
            const doc = await db.collection('students').doc(studentId).get();
            if (!doc.exists) return;
            const student = doc.data();

            // Populate Profile Card
            detailProfileCard.innerHTML = `
                <div class="profile-pic">
                    <i class="fa-solid fa-user-graduate"></i>
                </div>
                <div class="student-info">
                    <h3>${student.name}</h3>
                    <p>ID: #${student.id} | ${student.course}</p>
                </div>
                <div class="gpa-display">
                    <div class="text-muted" style="margin-bottom: 5px; font-size: 0.9rem;">Cumulative GPA</div>
                    <div class="gpa-value" style="color: var(--accent);">${parseFloat(student.gpa || 0).toFixed(2)}</div>
                    <div class="text-muted" style="margin-top: 5px; font-size: 0.8rem;">Out of 4.0</div>
                </div>
                <div style="margin-top: 20px; width: 100%; text-align: left;">
                    <h4 style="margin-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">Quick Stats</h4>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="text-muted">Total Credits:</span>
                        <span>${student.totalCredits || 120}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="text-muted">Earned Credits:</span>
                        <span>${student.earnedCredits || 0}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <span class="text-muted">Academic Standing:</span>
                        <span class="${student.standing === 'Excellent' ? 'text-success' : 'text-glow'}">${student.standing || 'Good'}</span>
                    </div>
                </div>
            `;

            // Populate Modules Grid
            detailModulesGrid.innerHTML = '';
            const modules = student.modules || [];
            modules.forEach((module, index) => {
                const moduleEl = document.createElement('div');
                moduleEl.className = 'module-item';
                moduleEl.innerHTML = `
                    <div class="module-name">
                        <span>${module.name}</span>
                        <div class="admin-only" style="display: flex; gap: 10px;">
                            <i class="fa-solid fa-pen-to-square edit-icon" style="cursor: pointer; color: var(--accent);" data-index="${index}"></i>
                            <i class="fa-solid fa-trash-can delete-icon" style="cursor: pointer; color: var(--danger);" data-index="${index}"></i>
                        </div>
                    </div>
                    <div class="module-grade ${getGradeClass(module.grade)}">${module.grade}</div>
                    <div class="text-muted" style="font-size: 0.8rem; margin-top: 5px;">Score: ${module.score}% | Credits: ${module.credits || 0}</div>
                    <div class="progress-bar-bg">
                        <div class="progress-bar-fill" style="width: ${module.score}%; background: ${getGradeColor(module.grade)};"></div>
                    </div>
                `;
                detailModulesGrid.appendChild(moduleEl);
            });

            // Add Listeners for Edit/Delete icons (only visible for admins)
            const role = localStorage.getItem('role');
            if (role === 'admin') {
                detailModulesGrid.querySelectorAll('.edit-icon').forEach(icon => {
                    icon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        openModuleEditor(student.id, parseInt(icon.dataset.index));
                    });
                });
                detailModulesGrid.querySelectorAll('.delete-icon').forEach(icon => {
                    icon.addEventListener('click', (e) => {
                        e.stopPropagation();
                        deleteModule(student.id, parseInt(icon.dataset.index));
                    });
                });
            }

            listView.style.display = 'none';
            detailView.style.display = 'block';
        } catch (error) {
            console.error('Error fetching student details:', error);
        }
    };

    const getGradeClass = (grade) => {
        if (!grade) return 'grade-f';
        if (grade.startsWith('A')) return 'grade-a';
        if (grade.startsWith('B')) return 'grade-b';
        if (grade.startsWith('C')) return 'grade-c';
        return 'grade-f';
    };

    const getGradeColor = (grade) => {
        if (!grade) return 'var(--danger)';
        if (grade.startsWith('A')) return 'var(--success)';
        if (grade.startsWith('B')) return 'var(--primary)';
        if (grade.startsWith('C')) return 'var(--secondary)';
        return 'var(--danger)';
    };

    const openModuleEditor = async (studentId, moduleIndex = null) => {
        try {
            const doc = await db.collection('students').doc(studentId).get();
            const student = doc.data();
            
            document.getElementById('edit-module-index').value = moduleIndex !== null ? moduleIndex : '';
            if (moduleIndex !== null) {
                const module = student.modules[moduleIndex];
                document.getElementById('module-name-input').value = module.name;
                document.getElementById('module-score-input').value = module.score;
                document.getElementById('module-credits-input').value = module.credits || '';
                document.getElementById('module-grade-input').value = module.grade;
            } else {
                moduleForm.reset();
            }
            
            moduleModal.style.display = 'flex';
        } catch (error) {
            console.error('Error opening module editor:', error);
        }
    };

    const deleteModule = async (studentId, moduleIndex) => {
        if (!confirm('Are you sure you want to delete this module?')) return;
        try {
            const doc = await db.collection('students').doc(studentId).get();
            const student = doc.data();
            student.modules.splice(moduleIndex, 1);
            const deletedModuleName = student.modules[moduleIndex] ? student.modules[moduleIndex].name : 'Module';
            updateStudentGPA(student);
            await db.collection('students').doc(studentId).update({
                modules: student.modules,
                gpa: student.gpa,
                earnedCredits: student.earnedCredits,
                standing: student.standing
            });

            // Log activity for notification
            await db.collection('activityLogs').add({
                studentName: student.name,
                action: `Module Deleted: ${deletedModuleName}`,
                timestamp: firebase.firestore.Timestamp.now(),
                role: "admin"
            });

            showStudentDetail(studentId);
        } catch (error) {
            console.error('Error deleting module:', error);
        }
    };

    const updateStudentGPA = (student) => {
        if (!student.modules || student.modules.length === 0) {
            student.gpa = 0.0;
            student.earnedCredits = 0;
            student.standing = "N/A";
            return;
        }
        const gradePoints = {
            'A+': 4.0, 'A': 4.0, 'A-': 3.7,
            'B+': 3.3, 'B': 3.0, 'B-': 2.7,
            'C+': 2.3, 'C': 2.0, 'F': 0.0
        };
        
        let totalPoints = 0;
        let totalCredits = 0;
        let earnedCredits = 0;

        student.modules.forEach(m => {
            const credits = parseInt(m.credits || 0);
            const points = gradePoints[m.grade] || 0;
            
            totalPoints += (points * credits);
            totalCredits += credits;
            
            // Earn credits if grade is not F
            if (m.grade !== 'F') {
                earnedCredits += credits;
            }
        });

        student.gpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0.0;
        student.earnedCredits = earnedCredits;
        
        // Determine standing based on GPA
        if (student.gpa >= 3.5) student.standing = "Excellent";
        else if (student.gpa >= 2.0) student.standing = "Good";
        else student.standing = "At Risk";
    };

    const deleteStudent = async (studentId) => {
        if (!confirm('CRITICAL: Are you sure you want to permanently delete this student record? This action cannot be undone.')) return;
        
        try {
            const doc = await db.collection('students').doc(studentId).get();
            const student = doc.data();
            
            await db.collection('students').doc(studentId).delete();
            
            // Log activity
            await db.collection('activityLogs').add({
                studentName: "Admin",
                action: `Student Deleted: ${student.name} (#${studentId})`,
                timestamp: firebase.firestore.Timestamp.now(),
                role: "admin"
            });

            alert('Student record deleted successfully.');
            detailView.style.display = 'none';
            listView.style.display = 'block';
            renderStudentList();
        } catch (error) {
            console.error('Error deleting student:', error);
            alert('Failed to delete student.');
        }
    };

    // Event Listeners
    const deleteStudentBtn = document.getElementById('delete-student-btn');
    if (deleteStudentBtn) {
        deleteStudentBtn.addEventListener('click', () => deleteStudent(currentEditingStudentId));
    }

    if (backBtn) {
        backBtn.addEventListener('click', () => {
            detailView.style.display = 'none';
            listView.style.display = 'block';
            renderStudentList();
        });
    }

    if (addModuleBtn) {
        addModuleBtn.addEventListener('click', () => openModuleEditor(currentEditingStudentId));
    }

    if (closeModuleModal) {
        closeModuleModal.addEventListener('click', () => moduleModal.style.display = 'none');
    }

    // Print Transcript Handler
    const printBtn = document.getElementById('print-transcript');

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    moduleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const doc = await db.collection('students').doc(currentEditingStudentId).get();
            const student = doc.data();
            const indexStr = document.getElementById('edit-module-index').value;
            
            const moduleData = {
                name: document.getElementById('module-name-input').value,
                score: parseInt(document.getElementById('module-score-input').value),
                credits: parseInt(document.getElementById('module-credits-input').value || 0),
                grade: document.getElementById('module-grade-input').value
            };

            if (!student.modules) student.modules = [];

            if (indexStr !== '') {
                student.modules[parseInt(indexStr)] = moduleData;
            } else {
                student.modules.push(moduleData);
            }

            updateStudentGPA(student);
            
            await db.collection('students').doc(currentEditingStudentId).update({
                modules: student.modules,
                gpa: student.gpa,
                earnedCredits: student.earnedCredits,
                standing: student.standing
            });

            // Log activity for notification
            await db.collection('activityLogs').add({
                studentName: student.name,
                action: indexStr !== '' ? `Module Updated: ${moduleData.name}` : `New Module Added: ${moduleData.name}`,
                timestamp: firebase.firestore.Timestamp.now(),
                role: "admin"
            });

            moduleModal.style.display = 'none';
            showStudentDetail(currentEditingStudentId);
        } catch (error) {
            console.error('Error saving module:', error);
        }
    });

    // Initial Routing Logic
    const init = async () => {
        const role = localStorage.getItem('role');
        const loggedInStr = localStorage.getItem('loggedInStudent');
        
        // Check for URL parameter ?id=... (from global search or deep links)
        const urlParams = new URLSearchParams(window.location.search);
        const studentId = urlParams.get('id');

        if (role === 'admin') {
            listView.style.display = 'block';
            
            if (studentId) {
                const searchInput = document.getElementById('global-search');
                if (searchInput) searchInput.value = studentId;
                await renderStudentList(studentId);
            } else {
                await renderStudentList();
            }
        } else if (role === 'student' && loggedInStr) {
            const loggedInStudent = JSON.parse(loggedInStr);
            await showStudentDetail(loggedInStudent.id);
            document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
        }
    };

    init();
});
