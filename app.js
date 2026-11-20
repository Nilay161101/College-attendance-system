/**
 * EduPulse - College Attendance Management System
 * Core State & UI Logic
 */

// =======================================================
// INITIAL MOCK DATA
// =======================================================
const INITIAL_COURSES = [
  { id: 'CS301', name: 'CS301 - Data Structures & Algorithms', faculty: 'Dr. Sarah Jenkins', dept: 'Computer Science' },
  { id: 'CS304', name: 'CS304 - Web Engineering & UI Design', faculty: 'Prof. Alan Turing', dept: 'Computer Science' },
  { id: 'EC202', name: 'EC202 - Digital Systems & Microcontrollers', faculty: 'Dr. Marcus Vance', dept: 'Electronics & Comms' }
];

const INITIAL_STUDENTS = [
  { id: 'STU01', roll: 'CS2026-001', name: 'Alex Morgan', dept: 'Computer Science', email: 'alex.m@univ.edu' },
  { id: 'STU02', roll: 'CS2026-002', name: 'Liam Vance', dept: 'Computer Science', email: 'liam.v@univ.edu' },
  { id: 'STU03', roll: 'CS2026-003', name: 'Sophia Chen', dept: 'Computer Science', email: 'sophia.c@univ.edu' },
  { id: 'STU04', roll: 'CS2026-004', name: 'Noah Patel', dept: 'Computer Science', email: 'noah.p@univ.edu' },
  { id: 'STU05', roll: 'CS2026-005', name: 'Emma Watson', dept: 'Computer Science', email: 'emma.w@univ.edu' },
  { id: 'STU06', roll: 'CS2026-006', name: 'Oliver Kim', dept: 'Computer Science', email: 'oliver.k@univ.edu' },
  { id: 'STU07', roll: 'CS2026-007', name: 'Ava Miller', dept: 'Computer Science', email: 'ava.m@univ.edu' },
  { id: 'STU08', roll: 'EC2026-011', name: 'Ethan Hunt', dept: 'Electronics & Comms', email: 'ethan.h@univ.edu' },
  { id: 'STU09', roll: 'EC2026-012', name: 'Mia Khalifa', dept: 'Electronics & Comms', email: 'mia.k@univ.edu' },
  { id: 'STU10', roll: 'EC2026-013', name: 'Lucas Scott', dept: 'Electronics & Comms', email: 'lucas.s@univ.edu' },
  { id: 'STU11', roll: 'CS2026-008', name: 'Isabella Garcia', dept: 'Computer Science', email: 'isabella.g@univ.edu' },
  { id: 'STU12', roll: 'CS2026-009', name: 'James Wilson', dept: 'Computer Science', email: 'james.w@univ.edu' }
];

// Helper to generate initial 15 days of attendance data
function generateInitialRecords() {
  const records = [];
  const dates = [];
  const today = new Date();
  
  // Create past 12 class dates
  for (let i = 18; i >= 1; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Skip weekends
    if (d.getDay() !== 0 && d.getDay() !== 6) {
      dates.push(d.toISOString().split('T')[0]);
    }
  }

  const dateList = dates.slice(-10); // 10 session dates

  INITIAL_COURSES.forEach(course => {
    dateList.forEach(date => {
      INITIAL_STUDENTS.forEach((student, idx) => {
        // Pseudo-random deterministic status pattern so percentages vary realistically
        let status = 'Present';
        const rand = (idx * 7 + date.charCodeAt(9)) % 10;
        
        if (student.id === 'STU04' || student.id === 'STU09') {
          // Keep STU04 and STU09 low attendance for shortage warnings demo
          status = rand > 3 ? 'Absent' : (rand === 3 ? 'Late' : 'Present');
        } else if (rand === 9) {
          status = 'Absent';
        } else if (rand === 8) {
          status = 'Late';
        } else if (rand === 7) {
          status = 'Excused';
        }

        records.push({
          id: `${course.id}_${date}_${student.id}`,
          courseId: course.id,
          date: date,
          studentId: student.id,
          status: status,
          remarks: status === 'Excused' ? 'Medical Certificate' : '',
          lastModified: new Date(date).toISOString()
        });
      });
    });
  });

  return records;
}

// =======================================================
// STATE MANAGEMENT & LOCAL STORAGE
// =======================================================
let appState = {
  currentRole: 'faculty', // 'faculty' | 'student'
  activeFacultyTab: 'mark-tab',
  activeStudentId: 'STU01', // Default active student view
  targetPercentage: 75,
  courses: [],
  students: [],
  attendanceRecords: [],
  draftMarking: {}, // Temporary state for mark attendance table
  draftEditing: {} // Temporary state for editing past log table
};

// Global Chart Instances
let trendChartInstance = null;
let distChartInstance = null;

// Initialize System Data
function initSystem() {
  const stored = localStorage.getItem('edupulse_state');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      appState.courses = parsed.courses || INITIAL_COURSES;
      appState.students = parsed.students || INITIAL_STUDENTS;
      appState.attendanceRecords = parsed.attendanceRecords || generateInitialRecords();
    } catch (e) {
      console.error('Failed to parse storage, re-initializing data', e);
      resetDatabase();
      return;
    }
  } else {
    appState.courses = INITIAL_COURSES;
    appState.students = INITIAL_STUDENTS;
    appState.attendanceRecords = generateInitialRecords();
    saveStateToStorage();
  }

  // Set default today's date in faculty mark input
  const todayStr = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('faculty-date-input');
  if (dateInput) dateInput.value = todayStr;

  populateCourseDropdowns();
  populateStudentDropdown();

  // Render initial UI
  renderUI();
  lucide.createIcons();
}

function saveStateToStorage() {
  localStorage.setItem('edupulse_state', JSON.stringify({
    courses: appState.courses,
    students: appState.students,
    attendanceRecords: appState.attendanceRecords
  }));
}

function resetDatabase() {
  localStorage.removeItem('edupulse_state');
  appState.courses = INITIAL_COURSES;
  appState.students = INITIAL_STUDENTS;
  appState.attendanceRecords = generateInitialRecords();
  saveStateToStorage();
  showToast('Database reset to initial demo data!', 'info');
  initSystem();
}

// =======================================================
// ROLE & UI SWITCHING LOGIC
// =======================================================
function switchRole(role) {
  appState.currentRole = role;
  
  const facultyBtn = document.getElementById('role-faculty-btn');
  const studentBtn = document.getElementById('role-student-btn');
  const facultySec = document.getElementById('faculty-section');
  const studentSec = document.getElementById('student-section');
  const studentSelectWrapper = document.getElementById('student-selector-wrapper');

  if (role === 'faculty') {
    facultyBtn.classList.add('active');
    studentBtn.classList.remove('active');
    facultySec.classList.remove('hidden');
    studentSec.classList.add('hidden');
    studentSelectWrapper.classList.add('hidden');
  } else {
    studentBtn.classList.add('active');
    facultyBtn.classList.remove('active');
    studentSec.classList.remove('hidden');
    facultySec.classList.add('hidden');
    studentSelectWrapper.classList.remove('hidden');
    renderStudentView();
  }
}

function changeActiveStudent(studentId) {
  appState.activeStudentId = studentId;
  renderStudentView();
}

function switchFacultyTab(tabId) {
  appState.activeFacultyTab = tabId;
  
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });

  if (tabId === 'mark-tab') {
    renderMarkAttendanceTable();
  } else if (tabId === 'edit-tab') {
    populateEditDateDropdown();
    loadHistoricalRecords();
  } else if (tabId === 'roster-tab') {
    renderRosterGrid();
  } else if (tabId === 'analytics-tab') {
    renderClassAnalytics();
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const themeIcon = document.getElementById('theme-icon');
  if (document.body.classList.contains('light-theme')) {
    themeIcon.setAttribute('data-lucide', 'sun');
  } else {
    themeIcon.setAttribute('data-lucide', 'moon');
  }
  lucide.createIcons();
}

// =======================================================
// DROPDOWN POPULATION UTILITIES
// =======================================================
function populateCourseDropdowns() {
  const facultyCourseSelect = document.getElementById('faculty-course-select');
  const editCourseSelect = document.getElementById('edit-course-select');
  const studentTimelineCourse = document.getElementById('student-timeline-course');

  const optionsHTML = appState.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

  if (facultyCourseSelect) facultyCourseSelect.innerHTML = optionsHTML;
  if (editCourseSelect) editCourseSelect.innerHTML = optionsHTML;
  if (studentTimelineCourse) {
    studentTimelineCourse.innerHTML = '<option value="ALL">All Subjects</option>' + optionsHTML;
  }
}

function populateStudentDropdown() {
  const select = document.getElementById('active-student-select');
  if (!select) return;
  select.innerHTML = appState.students.map(s => 
    `<option value="${s.id}" ${s.id === appState.activeStudentId ? 'selected' : ''}>${s.name} (${s.roll})</option>`
  ).join('');
}

// =======================================================
// FACULTY: TAB 1 - MARK ATTENDANCE
// =======================================================
function renderMarkAttendanceTable() {
  const courseId = document.getElementById('faculty-course-select').value;
  const sessionDate = document.getElementById('faculty-date-input').value;
  const tbody = document.getElementById('mark-table-body');
  if (!tbody || !courseId || !sessionDate) return;

  const searchVal = document.getElementById('mark-search-input').value.toLowerCase();
  
  // Filter students based on course / search
  const filteredStudents = appState.students.filter(s => 
    s.name.toLowerCase().includes(searchVal) || s.roll.toLowerCase().includes(searchVal)
  );

  // Initialize draft marking state if not present
  appState.draftMarking = {};
  filteredStudents.forEach(s => {
    // Check if record already exists for this course + date + student
    const existing = appState.attendanceRecords.find(r => r.courseId === courseId && r.date === sessionDate && r.studentId === s.id);
    appState.draftMarking[s.id] = {
      status: existing ? existing.status : 'Present',
      remarks: existing ? existing.remarks : ''
    };
  });

  renderMarkRows(filteredStudents, courseId);
  updateMarkStatsSummary();
}

function filterMarkTable() {
  renderMarkAttendanceTable();
}

function renderMarkRows(students, courseId) {
  const tbody = document.getElementById('mark-table-body');
  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">No matching students found</td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(student => {
    const draft = appState.draftMarking[student.id] || { status: 'Present', remarks: '' };
    const overallPct = calculateStudentOverallPercentage(student.id);

    let badgeClass = 'badge-success';
    if (overallPct < 75) badgeClass = 'badge-danger';
    else if (overallPct < 85) badgeClass = 'badge-warning';

    return `
      <tr>
        <td><strong>${student.roll}</strong></td>
        <td>
          <div style="font-weight:600;">${student.name}</div>
          <div class="text-muted" style="font-size:0.75rem;">${student.email}</div>
        </td>
        <td><span class="badge badge-info">${student.dept}</span></td>
        <td><span class="badge ${badgeClass}">${overallPct}%</span></td>
        <td class="text-center">
          <div class="status-radio-group">
            <button class="status-btn ${draft.status === 'Present' ? 'selected' : ''}" data-status="Present" onclick="setDraftStatus('${student.id}', 'Present')">Present</button>
            <button class="status-btn ${draft.status === 'Absent' ? 'selected' : ''}" data-status="Absent" onclick="setDraftStatus('${student.id}', 'Absent')">Absent</button>
            <button class="status-btn ${draft.status === 'Late' ? 'selected' : ''}" data-status="Late" onclick="setDraftStatus('${student.id}', 'Late')">Late</button>
            <button class="status-btn ${draft.status === 'Excused' ? 'selected' : ''}" data-status="Excused" onclick="setDraftStatus('${student.id}', 'Excused')">Excused</button>
          </div>
        </td>
        <td>
          <input type="text" placeholder="Add note..." value="${draft.remarks}" onchange="setDraftRemarks('${student.id}', this.value)" style="width:140px; font-size:0.8rem; padding:0.3rem 0.6rem;" />
        </td>
      </tr>
    `;
  }).join('');
}

function setDraftStatus(studentId, status) {
  if (appState.draftMarking[studentId]) {
    appState.draftMarking[studentId].status = status;
  }
  renderMarkAttendanceTable();
}

function setDraftRemarks(studentId, remarks) {
  if (appState.draftMarking[studentId]) {
    appState.draftMarking[studentId].remarks = remarks;
  }
}

function markAllBatch(status) {
  Object.keys(appState.draftMarking).forEach(stuId => {
    appState.draftMarking[stuId].status = status;
  });
  renderMarkAttendanceTable();
  showToast(`Marked all visible students as ${status}`, 'info');
}

function updateMarkStatsSummary() {
  let p = 0, a = 0, l = 0, e = 0;
  Object.values(appState.draftMarking).forEach(item => {
    if (item.status === 'Present') p++;
    else if (item.status === 'Absent') a++;
    else if (item.status === 'Late') l++;
    else if (item.status === 'Excused') e++;
  });

  document.getElementById('stat-present-count').innerText = `Present: ${p}`;
  document.getElementById('stat-absent-count').innerText = `Absent: ${a}`;
  document.getElementById('stat-late-count').innerText = `Late: ${l}`;
  document.getElementById('stat-excused-count').innerText = `Excused: ${e}`;
}

function saveCurrentAttendance() {
  const courseId = document.getElementById('faculty-course-select').value;
  const sessionDate = document.getElementById('faculty-date-input').value;
  if (!courseId || !sessionDate) {
    showToast('Please select a course and session date', 'error');
    return;
  }

  let updatedCount = 0;
  Object.keys(appState.draftMarking).forEach(studentId => {
    const draft = appState.draftMarking[studentId];
    const recId = `${courseId}_${sessionDate}_${studentId}`;
    const existingIndex = appState.attendanceRecords.findIndex(r => r.id === recId);

    const recordObj = {
      id: recId,
      courseId: courseId,
      date: sessionDate,
      studentId: studentId,
      status: draft.status,
      remarks: draft.remarks || '',
      lastModified: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      appState.attendanceRecords[existingIndex] = recordObj;
    } else {
      appState.attendanceRecords.push(recordObj);
    }
    updatedCount++;
  });

  saveStateToStorage();
  showToast(`Successfully saved attendance for ${updatedCount} students on ${sessionDate}!`, 'success');
  renderMarkAttendanceTable();
}

// =======================================================
// FACULTY: TAB 2 - EDIT PAST ATTENDANCE LOGS
// =======================================================
function populateEditDateDropdown() {
  const courseId = document.getElementById('edit-course-select').value;
  const dateSelect = document.getElementById('edit-date-select');
  if (!dateSelect || !courseId) return;

  // Find all dates that have attendance recorded for this course
  const datesSet = new Set(
    appState.attendanceRecords.filter(r => r.courseId === courseId).map(r => r.date)
  );

  const datesArray = Array.from(datesSet).sort((a, b) => b.localeCompare(a)); // Descending order

  if (datesArray.length === 0) {
    dateSelect.innerHTML = `<option value="">No past sessions found</option>`;
  } else {
    dateSelect.innerHTML = datesArray.map(d => `<option value="${d}">${d}</option>`).join('');
  }
}

function loadHistoricalRecords() {
  const courseId = document.getElementById('edit-course-select').value;
  const dateVal = document.getElementById('edit-date-select').value;
  const tbody = document.getElementById('edit-table-body');
  const badge = document.getElementById('edit-session-badge');
  const lastModInfo = document.getElementById('edit-last-modified-info');

  if (!courseId || !dateVal) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No historical records available for selection</td></tr>`;
    badge.innerText = 'No Session Selected';
    badge.className = 'status-summary-badge badge-warning';
    return;
  }

  const sessionRecords = appState.attendanceRecords.filter(r => r.courseId === courseId && r.date === dateVal);
  badge.innerText = `${sessionRecords.length} Student Records Found`;
  badge.className = 'status-summary-badge badge-success';

  if (sessionRecords.length > 0) {
    const lastModDate = new Date(sessionRecords[0].lastModified).toLocaleString();
    lastModInfo.innerHTML = `<i data-lucide="clock"></i> Last modified: ${lastModDate}`;
  } else {
    lastModInfo.innerHTML = `<i data-lucide="clock"></i> Last modified: Never`;
  }

  appState.draftEditing = {};
  appState.students.forEach(student => {
    const existing = sessionRecords.find(r => r.studentId === student.id);
    appState.draftEditing[student.id] = {
      recordedStatus: existing ? existing.status : 'Absent',
      newStatus: existing ? existing.status : 'Absent',
      reason: existing ? existing.remarks : ''
    };
  });

  tbody.innerHTML = appState.students.map(student => {
    const editObj = appState.draftEditing[student.id];
    return `
      <tr>
        <td><strong>${student.roll}</strong></td>
        <td>${student.name}</td>
        <td><span class="badge ${getStatusBadgeClass(editObj.recordedStatus)}">${editObj.recordedStatus}</span></td>
        <td>
          <div class="status-radio-group">
            <button class="status-btn ${editObj.newStatus === 'Present' ? 'selected' : ''}" data-status="Present" onclick="setEditDraftStatus('${student.id}', 'Present')">Present</button>
            <button class="status-btn ${editObj.newStatus === 'Absent' ? 'selected' : ''}" data-status="Absent" onclick="setEditDraftStatus('${student.id}', 'Absent')">Absent</button>
            <button class="status-btn ${editObj.newStatus === 'Late' ? 'selected' : ''}" data-status="Late" onclick="setEditDraftStatus('${student.id}', 'Late')">Late</button>
            <button class="status-btn ${editObj.newStatus === 'Excused' ? 'selected' : ''}" data-status="Excused" onclick="setEditDraftStatus('${student.id}', 'Excused')">Excused</button>
          </div>
        </td>
        <td>
          <input type="text" placeholder="Reason for edit..." value="${editObj.reason}" onchange="setEditDraftReason('${student.id}', this.value)" style="width:100%; font-size:0.85rem;" />
        </td>
      </tr>
    `;
  }).join('');
  
  lucide.createIcons();
}

function setEditDraftStatus(studentId, status) {
  if (appState.draftEditing[studentId]) {
    appState.draftEditing[studentId].newStatus = status;
  }
  loadHistoricalRecords();
}

function setEditDraftReason(studentId, reason) {
  if (appState.draftEditing[studentId]) {
    appState.draftEditing[studentId].reason = reason;
  }
}

function saveHistoricalEdits() {
  const courseId = document.getElementById('edit-course-select').value;
  const dateVal = document.getElementById('edit-date-select').value;
  if (!courseId || !dateVal) return;

  let count = 0;
  Object.keys(appState.draftEditing).forEach(studentId => {
    const editObj = appState.draftEditing[studentId];
    const recId = `${courseId}_${dateVal}_${studentId}`;
    const idx = appState.attendanceRecords.findIndex(r => r.id === recId);

    const recordObj = {
      id: recId,
      courseId: courseId,
      date: dateVal,
      studentId: studentId,
      status: editObj.newStatus,
      remarks: editObj.reason || 'Edited by Faculty',
      lastModified: new Date().toISOString()
    };

    if (idx >= 0) {
      appState.attendanceRecords[idx] = recordObj;
    } else {
      appState.attendanceRecords.push(recordObj);
    }
    count++;
  });

  saveStateToStorage();
  showToast(`Updated attendance log for ${dateVal}! Percentages recalculated.`, 'success');
  loadHistoricalRecords();
}

// =======================================================
// FACULTY: TAB 3 - STUDENT ROSTER & MANAGEMENT
// =======================================================
function renderRosterGrid() {
  const grid = document.getElementById('roster-grid');
  if (!grid) return;

  const query = document.getElementById('roster-search-input').value.toLowerCase();
  const filtered = appState.students.filter(s => 
    s.name.toLowerCase().includes(query) || s.roll.toLowerCase().includes(query) || s.dept.toLowerCase().includes(query)
  );

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="glass-card" style="grid-column:1/-1; text-align:center; color:var(--text-muted);">No students found matching your query.</div>`;
    return;
  }

  grid.innerHTML = filtered.map(s => {
    const overallPct = calculateStudentOverallPercentage(s.id);
    const initials = s.name.split(' ').map(n => n[0]).join('').toUpperCase();
    
    let badgeClass = 'badge-success';
    if (overallPct < 75) badgeClass = 'badge-danger';
    else if (overallPct < 85) badgeClass = 'badge-warning';

    return `
      <div class="glass-card student-card">
        <div class="student-card-header">
          <div class="student-avatar">${initials}</div>
          <div class="student-info">
            <h4>${s.name}</h4>
            <p>${s.roll} • ${s.dept}</p>
          </div>
        </div>

        <div class="student-card-stats">
          <div class="card-stat">
            <span class="card-stat-label">Overall %</span>
            <span class="card-stat-val ${overallPct < 75 ? 'text-danger' : 'text-success'}">${overallPct}%</span>
          </div>
          <div class="card-stat">
            <span class="card-stat-label">Status</span>
            <span class="badge ${badgeClass}">${overallPct >= 75 ? 'Eligible' : 'Shortage'}</span>
          </div>
        </div>

        <div class="student-card-actions">
          <button class="btn btn-sm btn-ghost" style="flex:1;" onclick="openEditStudentModal('${s.id}')">
            <i data-lucide="edit-2"></i> Edit Details
          </button>
          <button class="btn btn-sm btn-outline-danger" onclick="deleteStudent('${s.id}')">
            <i data-lucide="trash-2"></i> Delete
          </button>
        </div>
      </div>
    `;
  }).join('');

  lucide.createIcons();
}

function openAddStudentModal() {
  document.getElementById('modal-title').innerHTML = `<i data-lucide="user-plus"></i> Add New Student`;
  document.getElementById('modal-student-id').value = '';
  document.getElementById('modal-student-name').value = '';
  document.getElementById('modal-student-roll').value = '';
  document.getElementById('modal-student-email').value = '';
  document.getElementById('student-modal').classList.remove('hidden');
  lucide.createIcons();
}

function openEditStudentModal(studentId) {
  const student = appState.students.find(s => s.id === studentId);
  if (!student) return;

  document.getElementById('modal-title').innerHTML = `<i data-lucide="edit"></i> Edit Student Profile`;
  document.getElementById('modal-student-id').value = student.id;
  document.getElementById('modal-student-name').value = student.name;
  document.getElementById('modal-student-roll').value = student.roll;
  document.getElementById('modal-student-dept').value = student.dept;
  document.getElementById('modal-student-email').value = student.email;
  document.getElementById('student-modal').classList.remove('hidden');
  lucide.createIcons();
}

function closeStudentModal() {
  document.getElementById('student-modal').classList.add('hidden');
}

function handleStudentFormSubmit(event) {
  event.preventDefault();
  const id = document.getElementById('modal-student-id').value;
  const name = document.getElementById('modal-student-name').value.trim();
  const roll = document.getElementById('modal-student-roll').value.trim();
  const dept = document.getElementById('modal-student-dept').value;
  const email = document.getElementById('modal-student-email').value.trim();

  if (!name || !roll || !email) {
    showToast('Please complete all required student fields', 'error');
    return;
  }

  if (id) {
    // Edit existing student
    const idx = appState.students.findIndex(s => s.id === id);
    if (idx >= 0) {
      appState.students[idx] = { id, roll, name, dept, email };
      showToast(`Updated student profile for ${name}`, 'success');
    }
  } else {
    // Add new student
    const newId = 'STU' + String(appState.students.length + 1).padStart(2, '0');
    appState.students.push({ id: newId, roll, name, dept, email });
    showToast(`Added new student ${name}!`, 'success');
  }

  saveStateToStorage();
  closeStudentModal();
  populateStudentDropdown();
  renderRosterGrid();
}

function deleteStudent(studentId) {
  if (!confirm('Are you sure you want to remove this student and their records?')) return;
  appState.students = appState.students.filter(s => s.id !== studentId);
  appState.attendanceRecords = appState.attendanceRecords.filter(r => r.studentId !== studentId);
  saveStateToStorage();
  populateStudentDropdown();
  renderRosterGrid();
  showToast('Student deleted from system roster', 'info');
}

// =======================================================
// FACULTY: TAB 4 - CLASS ANALYTICS & CHARTS
// =======================================================
function renderClassAnalytics() {
  const totalStudents = appState.students.length;
  document.getElementById('kpi-total-students').innerText = totalStudents;

  // Calculate Overall Class Average
  let sumPcts = 0;
  let defaultersCount = 0;
  const defaultersList = [];

  appState.students.forEach(s => {
    const pct = calculateStudentOverallPercentage(s.id);
    sumPcts += pct;
    if (pct < 75) {
      defaultersCount++;
      const stats = getStudentAttendanceStats(s.id);
      defaultersList.push({
        student: s,
        pct: pct,
        total: stats.total,
        attended: stats.attended,
        needed: calculateClassesNeededForTarget(stats.attended, stats.total, 75)
      });
    }
  });

  const avgPct = totalStudents > 0 ? Math.round(sumPcts / totalStudents) : 0;
  document.getElementById('kpi-avg-attendance').innerText = `${avgPct}%`;
  document.getElementById('kpi-defaulters-count').innerText = defaultersCount;

  renderDefaultersTable(defaultersList);
  renderAnalyticsCharts();
}

function renderDefaultersTable(defaultersList) {
  const tbody = document.getElementById('defaulters-table-body');
  if (!tbody) return;

  if (defaultersList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-success"><i data-lucide="check-circle"></i> Excellent! No students are currently in attendance shortage (<75%).</td></tr>`;
    lucide.createIcons();
    return;
  }

  tbody.innerHTML = defaultersList.map(item => `
    <tr>
      <td><strong>${item.student.roll}</strong></td>
      <td>${item.student.name}</td>
      <td><span class="badge badge-info">${item.student.dept}</span></td>
      <td>${item.total}</td>
      <td>${item.attended}</td>
      <td><span class="badge badge-danger">${item.pct}%</span></td>
      <td><strong class="text-warning">+${item.needed} consecutive lectures</strong></td>
      <td>
        <button class="btn btn-sm btn-outline-danger" onclick="sendWarningNoticeSingle('${item.student.name}', '${item.student.email}', ${item.pct})">
          <i data-lucide="mail"></i> Notify
        </button>
      </td>
    </tr>
  `).join('');

  lucide.createIcons();
}

function sendWarningNoticeSingle(name, email, pct) {
  showToast(`Warning notice sent to ${name} (${email}) for ${pct}% attendance!`, 'info');
}

function sendWarningNoticeAll() {
  showToast(`Automated warning notices dispatched to all students below 75% threshold!`, 'success');
}

function renderAnalyticsCharts() {
  // Chart 1: Trend Chart
  const trendCtx = document.getElementById('trendChart')?.getContext('2d');
  const distCtx = document.getElementById('distributionChart')?.getContext('2d');
  if (!trendCtx || !distCtx) return;

  // Group attendance by date
  const dateMap = {};
  appState.attendanceRecords.forEach(r => {
    if (!dateMap[r.date]) dateMap[r.date] = { present: 0, total: 0 };
    dateMap[r.date].total++;
    if (r.status === 'Present' || r.status === 'Late') dateMap[r.date].present++;
  });

  const sortedDates = Object.keys(dateMap).sort().slice(-8);
  const trendData = sortedDates.map(d => Math.round((dateMap[d].present / dateMap[d].total) * 100));

  if (trendChartInstance) trendChartInstance.destroy();
  trendChartInstance = new Chart(trendCtx, {
    type: 'line',
    data: {
      labels: sortedDates,
      datasets: [{
        label: 'Attendance Rate (%)',
        data: trendData,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 4,
        pointBackgroundColor: '#8b5cf6'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { color: 'rgba(255,255,255,0.05)' } }
      },
      plugins: { legend: { display: false } }
    }
  });

  // Chart 2: Distribution Chart
  let presentCount = 0, absentCount = 0, lateCount = 0, excusedCount = 0;
  appState.attendanceRecords.forEach(r => {
    if (r.status === 'Present') presentCount++;
    else if (r.status === 'Absent') absentCount++;
    else if (r.status === 'Late') lateCount++;
    else if (r.status === 'Excused') excusedCount++;
  });

  if (distChartInstance) distChartInstance.destroy();
  distChartInstance = new Chart(distCtx, {
    type: 'doughnut',
    data: {
      labels: ['Present', 'Absent', 'Late', 'Excused'],
      datasets: [{
        data: [presentCount, absentCount, lateCount, excusedCount],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: '#94a3b8' } }
      }
    }
  });
}

// =======================================================
// STUDENT VIEW LOGIC & PERCENTAGE CALCULATIONS
// =======================================================
function renderStudentView() {
  const student = appState.students.find(s => s.id === appState.activeStudentId);
  if (!student) return;

  document.getElementById('student-welcome-title').innerText = `${student.name}'s Attendance Dashboard`;
  document.getElementById('student-welcome-subtitle').innerText = `Roll No: ${student.roll} | Department: ${student.dept}`;

  const overallPct = calculateStudentOverallPercentage(student.id);
  const stats = getStudentAttendanceStats(student.id);

  // Update Overall Gauge Circle
  document.getElementById('overall-percent-num').innerText = `${overallPct}%`;
  const circle = document.getElementById('overall-progress-circle');
  const circumference = 2 * Math.PI * 74; // r=74
  const offset = circumference - (overallPct / 100) * circumference;
  circle.style.strokeDasharray = `${circumference}`;
  circle.style.strokeDashoffset = `${offset}`;

  // Gauge Badge & Status
  const badge = document.getElementById('overall-status-badge');
  const statusEl = document.getElementById('student-eligibility-status');

  if (overallPct >= 75) {
    circle.style.stroke = '#10b981';
    badge.className = 'gauge-status-badge badge-success';
    badge.innerHTML = `<i data-lucide="shield-check"></i> Eligible for Final Exams`;
    statusEl.className = 'kpi-value text-success';
    statusEl.innerText = 'Eligible';
  } else if (overallPct >= 65) {
    circle.style.stroke = '#f59e0b';
    badge.className = 'gauge-status-badge badge-warning';
    badge.innerHTML = `<i data-lucide="alert-circle"></i> Shortage Warning (<75%)`;
    statusEl.className = 'kpi-value text-warning';
    statusEl.innerText = 'Warning';
  } else {
    circle.style.stroke = '#ef4444';
    badge.className = 'gauge-status-badge badge-danger';
    badge.innerHTML = `<i data-lucide="x-octagon"></i> Ineligible (<65%)`;
    statusEl.className = 'kpi-value text-danger';
    statusEl.innerText = 'Ineligible';
  }

  // Update KPI Cards
  document.getElementById('student-total-lectures').innerText = stats.total;
  document.getElementById('student-attended-lectures').innerText = stats.attended;
  document.getElementById('student-absent-lectures').innerText = stats.absent;

  // Render Subject Breakdown Cards
  renderStudentSubjectCards(student.id);

  // Render Calculator & Timeline
  updateTargetCalculator();
  renderStudentTimeline();

  lucide.createIcons();
}

function renderStudentSubjectCards(studentId) {
  const container = document.getElementById('student-subject-cards');
  if (!container) return;

  container.innerHTML = appState.courses.map(course => {
    const cStats = getStudentCourseStats(studentId, course.id);
    const pct = cStats.total > 0 ? Math.round((cStats.attended / cStats.total) * 100) : 0;
    
    let barColor = '#10b981';
    if (pct < 75) barColor = '#ef4444';
    else if (pct < 85) barColor = '#f59e0b';

    return `
      <div class="glass-card subject-card">
        <div class="subject-card-header">
          <div>
            <h4 class="subject-title">${course.name}</h4>
            <span class="subject-code">Faculty: ${course.faculty}</span>
          </div>
          <span class="badge" style="background:rgba(255,255,255,0.05); color:${barColor}; border:1px solid ${barColor};">
            ${pct}%
          </span>
        </div>

        <div class="progress-bar-wrapper">
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" style="width: ${pct}%; background: ${barColor};"></div>
          </div>
        </div>

        <div class="subject-stats-row">
          <span>Attended: <strong>${cStats.attended}/${cStats.total}</strong></span>
          <span>Absent: <strong class="text-danger">${cStats.absent}</strong></span>
          <span>Late: <strong class="text-warning">${cStats.late}</strong></span>
        </div>
      </div>
    `;
  }).join('');
}

// =======================================================
// TARGET ATTENDANCE CALCULATOR
// =======================================================
function setTargetPercent(pct) {
  appState.targetPercentage = pct;
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.classList.toggle('active', btn.innerText.includes(`${pct}%`));
  });
  updateTargetCalculator();
}

function updateTargetCalculator() {
  const stats = getStudentAttendanceStats(appState.activeStudentId);
  const target = appState.targetPercentage;
  const currentPct = stats.total > 0 ? Math.round((stats.attended / stats.total) * 100) : 0;
  
  const resultText = document.getElementById('calc-result-text');
  const resultBox = document.getElementById('calc-result-box');

  if (stats.total === 0) {
    resultText.innerText = 'No session data recorded yet.';
    return;
  }

  if (currentPct >= target) {
    // Calculate how many lectures can be safely missed
    // (Attended) / (Total + x) >= Target / 100
    // => x <= (100 * Attended - Target * Total) / Target
    const safeToMiss = Math.floor((100 * stats.attended - target * stats.total) / target);
    resultBox.style.borderColor = 'rgba(16, 185, 129, 0.3)';
    resultBox.style.background = 'rgba(16, 185, 129, 0.08)';
    
    if (safeToMiss > 0) {
      resultText.innerHTML = `
        <strong class="text-success" style="font-size:1.1rem;">You're above your target!</strong><br/>
        You can safely miss up to <strong>${safeToMiss} upcoming lectures</strong> while staying above your <strong>${target}%</strong> threshold.
      `;
    } else {
      resultText.innerHTML = `
        <strong class="text-success">Right on target!</strong><br/>
        You are currently at <strong>${currentPct}%</strong>. Attend your next class to maintain your eligibility.
      `;
    }
  } else {
    // Calculate consecutive lectures needed
    // (Attended + x) / (Total + x) >= Target / 100
    // => x >= (Target * Total - 100 * Attended) / (100 - Target)
    const needed = Math.ceil((target * stats.total - 100 * stats.attended) / (100 - target));
    resultBox.style.borderColor = 'rgba(239, 68, 68, 0.3)';
    resultBox.style.background = 'rgba(239, 68, 68, 0.08)';
    resultText.innerHTML = `
      <strong class="text-danger" style="font-size:1.1rem;">Shortage Warning!</strong><br/>
      You need to attend <strong>${needed} consecutive upcoming lectures</strong> without missing any to reach <strong>${target}%</strong> attendance.
    `;
  }
}

// =======================================================
// STUDENT PERSONAL TIMELINE
// =======================================================
function renderStudentTimeline() {
  const courseFilter = document.getElementById('student-timeline-course').value;
  const statusFilter = document.getElementById('student-timeline-status').value;
  const tbody = document.getElementById('student-timeline-body');
  if (!tbody) return;

  let records = appState.attendanceRecords.filter(r => r.studentId === appState.activeStudentId);

  if (courseFilter !== 'ALL') {
    records = records.filter(r => r.courseId === courseFilter);
  }
  if (statusFilter !== 'ALL') {
    records = records.filter(r => r.status === statusFilter);
  }

  // Sort descending by date
  records.sort((a, b) => b.date.localeCompare(a.date));

  if (records.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No attendance logs matching filters</td></tr>`;
    return;
  }

  tbody.innerHTML = records.map(r => {
    const course = appState.courses.find(c => c.id === r.courseId) || { name: r.courseId, faculty: 'Faculty' };
    return `
      <tr>
        <td><strong>${r.date}</strong></td>
        <td>${course.name}</td>
        <td class="text-muted">${course.faculty}</td>
        <td><span class="badge ${getStatusBadgeClass(r.status)}">${r.status}</span></td>
        <td style="font-size:0.85rem;" class="text-muted">${r.remarks || 'Regular Session'}</td>
      </tr>
    `;
  }).join('');
}

// =======================================================
// HELPER CALCULATIONS
// =======================================================
function calculateStudentOverallPercentage(studentId) {
  const stats = getStudentAttendanceStats(studentId);
  if (stats.total === 0) return 100;
  return Math.round((stats.attended / stats.total) * 100);
}

function getStudentAttendanceStats(studentId) {
  const recs = appState.attendanceRecords.filter(r => r.studentId === studentId);
  const total = recs.length;
  let attended = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;

  recs.forEach(r => {
    if (r.status === 'Present') attended++;
    else if (r.status === 'Late') { attended++; late++; }
    else if (r.status === 'Excused') { attended++; excused++; } // Excused counts towards attendance
    else if (r.status === 'Absent') absent++;
  });

  return { total, attended, absent, late, excused };
}

function getStudentCourseStats(studentId, courseId) {
  const recs = appState.attendanceRecords.filter(r => r.studentId === studentId && r.courseId === courseId);
  const total = recs.length;
  let attended = 0;
  let absent = 0;
  let late = 0;
  let excused = 0;

  recs.forEach(r => {
    if (r.status === 'Present') attended++;
    else if (r.status === 'Late') { attended++; late++; }
    else if (r.status === 'Excused') { attended++; excused++; }
    else if (r.status === 'Absent') absent++;
  });

  return { total, attended, absent, late, excused };
}

function calculateClassesNeededForTarget(attended, total, target) {
  if (total === 0) return 0;
  const currentPct = Math.round((attended / total) * 100);
  if (currentPct >= target) return 0;
  return Math.ceil((target * total - 100 * attended) / (100 - target));
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'Present': return 'badge-success';
    case 'Absent': return 'badge-danger';
    case 'Late': return 'badge-warning';
    case 'Excused': return 'badge-info';
    default: return 'badge-info';
  }
}

// =======================================================
// TOAST NOTIFICATIONS
// =======================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';

  toast.innerHTML = `<i data-lucide="${iconName}"></i> <span>${message}</span>`;
  container.appendChild(toast);
  lucide.createIcons();

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function renderUI() {
  if (appState.currentRole === 'faculty') {
    switchFacultyTab(appState.activeFacultyTab);
  } else {
    renderStudentView();
  }
}

// Initialize application on DOM content load
document.addEventListener('DOMContentLoaded', () => {
  initSystem();
});
