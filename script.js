// =====================================================
// SchoolAdmin v2 - Connects to PHP/MySQL backend API
// =====================================================

var API = 'api/';

function $(id) { return document.getElementById(id); }

function initials(name) {
  var parts = name.split(' ');
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function fullName(u) {
  return u.first_name + ' ' + u.last_name;
}

function badgeClass(status) {
  var map = {
    'Available': 'g', 'Good': 'g', 'Returned': 'g', 'Active': 'g',
    'Pending': 'a', 'Fair': 'a', 'Borrowing': 'a', 'Low stock': 'a',
    'Overdue': 'r', 'Unavailable': 'r', 'Poor': 'r', 'Rejected': 'r',
    'Approved': 'b', 'Completed': 'b', 'Cancelled': 'x', 'Unpaid': 'r',
    'Paid': 'g', 'Waived': 'a'
  };
  return map[status] || 'x';
}

function badge(text) {
  return '<span class="badge ' + badgeClass(text) + '">' + text + '</span>';
}

function statCard(label, value, note, noteClass) {
  return '<div class="card stat"><span>' + label + '</span><b>' + value + '</b><small class="' + (noteClass || '') + '">' + note + '</small></div>';
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  var d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(expectedReturn) {
  return new Date(expectedReturn) < new Date();
}

// ---------- API FETCH HELPERS ----------
function apiGet(endpoint) {
  return fetch(API + endpoint).then(function (r) { return r.json(); });
}

function apiPost(endpoint, data) {
  return fetch(API + endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(function (r) { return r.json(); });
}

function apiPut(endpoint, data) {
  return fetch(API + endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(function (r) { return r.json(); });
}

function apiDelete(endpoint) {
  return fetch(API + endpoint, { method: 'DELETE' }).then(function (r) { return r.json(); });
}

// ---------- STATE ----------
var state = { page: 'dashboard', id: null, tab: null };
var filters = { search: '', category: 'All', status: 'All' };

// ---------- NAVIGATION ----------
var titles = {
  dashboard: ['Dashboard', 'Monitor active loans and borrowing requests'],
  equipment: ['Equipment', 'Manage inventory, availability and school equipment loans'],
  students: ['Students', 'Manage student borrowers and track equipment loans'],
  studentDetail: ['Student Detail', 'View student information and manage their equipment loans'],
  equipmentDetail: ['Equipment Detail', 'Manage equipment information, loan history and condition records'],
  reports: ['Reports', 'Borrowing and return activity'],
  settings: ['Settings', 'Manage school profile and equipment borrowing preferences'],
  penalties: ['Penalties', 'Track and manage late return penalties']
};

function go(page, id, tab) {
  state.page = page;
  state.id = id || null;
  state.tab = tab || null;
  filters = { search: '', category: 'All', status: 'All' };
  render();
  window.scrollTo(0, 0);
}

function render() {
  var navPage = state.page === 'studentDetail' ? 'students' : state.page === 'equipmentDetail' ? 'equipment' : state.page;
  var links = document.querySelectorAll('#nav a');
  for (var i = 0; i < links.length; i++) {
    links[i].classList.toggle('active', links[i].dataset.page === navPage);
  }
  $('pageTitle').textContent = titles[state.page][0];
  $('pageSub').textContent = titles[state.page][1];
  pages[state.page]();
}

// ---------- TABS ----------
function tabs(list) {
  var html = '<div class="tabs">';
  for (var i = 0; i < list.length; i++) {
    var t = list[i];
    var cls = state.tab === t[0] ? 'active' : '';
    html += '<a class="' + cls + '" onclick="go(\'' + state.page + '\',' + state.id + ',\'' + t[0] + '\')">' + t[1] + '</a>';
  }
  html += '</div>';
  return html;
}

// ---------- MODAL ----------
function openModal(html) {
  $('modalBox').innerHTML = html;
  $('modal').classList.remove('hidden');
}
function closeModal() {
  $('modal').classList.add('hidden');
}
$('modal').onclick = function (e) {
  if (e.target === $('modal')) closeModal();
};

// ---------- TABLE REFRESH ----------
function refreshTable() {
  if (state.page === 'equipment') loadEquipmentTable();
  else if (state.page === 'students') loadStudentsTable();
}

// =====================================================
// PAGES
// =====================================================
var pages = {};

// ===== DASHBOARD =====
pages.dashboard = function () {
  $('page').innerHTML = '<div class="stats" id="dashStats"></div><div class="two-col" id="dashContent"></div>';

  apiGet('dashboard.php').then(function (data) {
    var s = data.stats;
    $('dashStats').innerHTML =
      statCard('Total equipment', s.total_equipment, 'Items in inventory') +
      statCard('Registered students', s.total_students, 'In the system') +
      statCard('Active loans', s.active_loans, 'Currently borrowed') +
      statCard('Overdue', s.overdue, 'Needs follow-up', 'red-text');

    var reqHtml = '';
    if (data.requests && data.requests.length > 0) {
      data.requests.forEach(function (r) {
        reqHtml += '<div class="item"><div class="person"><span class="avatar">' + initials(fullName(r)) + '</span><div>' + fullName(r) + '<small>' + r.equip_name + '</small></div></div>' +
          '<div><button class="btn sm" onclick="approveRequest(' + r.reservation_id + ')">Approve</button> <button class="btn sm light" onclick="rejectRequest(' + r.reservation_id + ')">Reject</button></div></div>';
      });
    } else {
      reqHtml = '<p class="sub">No pending requests.</p>';
    }

    var activeHtml = '';
    if (data.active_loans && data.active_loans.length > 0) {
      data.active_loans.forEach(function (l) {
        activeHtml += '<div class="item"><div>' + l.equip_name + '<small>Borrowed by ' + fullName(l) + '</small></div><small>Due ' + formatDate(l.expected_return_date) + '</small></div>';
      });
    } else {
      activeHtml = '<p class="sub">None</p>';
    }

    var overdueHtml = '';
    if (data.overdue && data.overdue.length > 0) {
      data.overdue.forEach(function (l) {
        overdueHtml += '<div class="item"><div>' + l.equip_name + '<small>' + fullName(l) + '</small></div><span class="red-text">Due ' + formatDate(l.expected_return_date) + '</span></div>';
      });
    } else {
      overdueHtml = '<p class="sub">None</p>';
    }

    $('dashContent').innerHTML =
      '<div class="card"><h3>Borrowing requests</h3><p class="sub">Approve or reject student requests</p>' + reqHtml + '</div>' +
      '<div><div class="card"><h3>Active loans</h3>' + activeHtml + '</div>' +
      '<div class="card"><h3 class="red-text">Overdue returns</h3>' + overdueHtml + '</div></div>';
  });
};

// ===== EQUIPMENT LIST =====
pages.equipment = function () {
  $('page').innerHTML =
    '<div class="stats" id="equipStats"></div>' +
    '<div class="card"><h3>Equipment inventory</h3><p class="sub">Search, filter and open any item</p>' +
    '<div class="toolbar"><input id="searchBox" placeholder="Search equipment name or code" oninput="filters.search=this.value; refreshTable()">' +
    '<select id="catFilter" onchange="filters.category=this.value; refreshTable()"><option>All</option></select>' +
    '<select id="statusFilter" onchange="filters.status=this.value; refreshTable()"><option>All</option><option>Available</option><option>On loan</option><option>Unavailable</option></select>' +
    '<div class="row-end"><button class="btn" onclick="openAddEquipment()">+ Add equipment</button></div></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Equipment</th><th>Category</th><th>Serial</th><th>Location</th><th>Condition</th><th>Status</th><th></th></tr></thead>' +
    '<tbody id="tableBody"></tbody></table></div></div>';

  apiGet('categories.php').then(function (cats) {
    var opts = cats.map(function (c) { return '<option>' + c.category_name + '</option>'; }).join('');
    $('catFilter').innerHTML = '<option>All</option>' + opts;
  });

  apiGet('dashboard.php').then(function (data) {
    var s = data.stats;
    $('equipStats').innerHTML =
      statCard('Total equipment', s.total_equipment, 'Items in inventory') +
      statCard('Available', s.total_equipment - s.active_loans, 'Ready to borrow', 'green-text') +
      statCard('On loan', s.active_loans, 'Currently borrowed') +
      statCard('Overdue', s.overdue, 'Needs follow-up', 'red-text');
  });

  loadEquipmentTable();
};

function loadEquipmentTable() {
  apiGet('equipment.php').then(function (data) {
    var html = '';
    data.forEach(function (e) {
      var text = (e.name + ' ' + e.serial_number + ' ' + e.category_name).toLowerCase();
      if (text.indexOf(filters.search.toLowerCase()) === -1) return;
      if (filters.category !== 'All' && e.category_name !== filters.category) return;

      var status = e.on_loan > 0 ? 'On loan' : 'Available';
      if (filters.status !== 'All' && filters.status !== status) return;

      html += '<tr><td>' + e.name + '<small>' + e.serial_number + '</small></td><td>' + e.category_name +
        '</td><td>' + e.serial_number + '</td><td>' + e.room_name_or_number +
        '</td><td>' + badge(e.condition_status) + '</td><td>' + badge(status) +
        '</td><td><a class="link" onclick="go(\'equipmentDetail\',' + e.equipment_id + ',\'history\')">Manage</a></td></tr>';
    });
    $('tableBody').innerHTML = html || '<tr><td colspan="7">No equipment found.</td></tr>';
  });
}

// ===== STUDENTS LIST =====
pages.students = function () {
  $('page').innerHTML =
    '<div class="stats" id="studStats"></div>' +
    '<div class="card"><h3>Student directory</h3><p class="sub">Search students and open their loan records</p>' +
    '<div class="toolbar"><input placeholder="Search by name, ID or email" oninput="filters.search=this.value; refreshTable()">' +
    '<select id="statusFilter" onchange="filters.status=this.value; refreshTable()"><option>All</option><option>Good standing</option><option>Borrowing</option><option>Overdue</option></select>' +
    '<div class="row-end"><button class="btn" onclick="openAddStudent()">+ Add student</button></div></div>' +
    '<div class="table-wrap"><table><thead><tr><th>Student</th><th>ID Number</th><th>Grade</th><th>Loans</th><th>Status</th><th></th></tr></thead>' +
    '<tbody id="tableBody"></tbody></table></div></div>';

  apiGet('dashboard.php').then(function (data) {
    var s = data.stats;
    $('studStats').innerHTML =
      statCard('Registered students', s.total_students, 'In the system') +
      statCard('Active loans', s.active_loans, 'Currently borrowed') +
      statCard('Overdue borrowers', s.overdue, 'Needs follow-up', 'red-text') +
      statCard('Pending requests', data.requests ? data.requests.length : 0, 'Awaiting approval');
  });

  loadStudentsTable();
};

function loadStudentsTable() {
  apiGet('users.php?role=Student').then(function (data) {
    apiGet('transactions.php?status=active').then(function (activeTxns) {
      apiGet('transactions.php?status=overdue').then(function (overdueTxns) {
        var html = '';
        data.forEach(function (s) {
          var text = (s.first_name + ' ' + s.last_name + ' ' + s.id_number + ' ' + s.email).toLowerCase();
          if (text.indexOf(filters.search.toLowerCase()) === -1) return;

          var activeCount = activeTxns.filter(function (t) { return t.user_id == s.user_id; }).length;
          var hasOverdue = overdueTxns.some(function (t) { return t.user_id == s.user_id; });
          var status = hasOverdue ? 'Overdue' : (activeCount > 0 ? 'Borrowing' : 'Good standing');

          if (filters.status !== 'All' && filters.status !== status) return;

          var gradeDisplay = '-';
          if (s.grade && s.class) gradeDisplay = s.grade + ' - ' + s.class;
          else if (s.grade) gradeDisplay = s.grade;
          else if (s.class) gradeDisplay = s.class;
          html += '<tr><td><div class="person"><span class="avatar">' + initials(fullName(s)) + '</span><div>' + fullName(s) + '<small>' + s.email + '</small></div></div></td><td>' + s.id_number +
            '</td><td>' + gradeDisplay + '</td><td>' + activeCount + ' active</td><td>' + badge(status) +
            '</td><td><a class="link" onclick="go(\'studentDetail\',' + s.user_id + ',\'loans\')">View profile</a></td></tr>';
        });
        $('tableBody').innerHTML = html || '<tr><td colspan="6">No students found.</td></tr>';
      });
    });
  });
}

// ===== STUDENT DETAIL =====
pages.studentDetail = function () {
  $('page').innerHTML = '<a class="back" onclick="go(\'students\')">&larr; Back to students</a><div id="studDetail"></div>';

  apiGet('users.php').then(function (users) {
    var s = users.find(function (u) { return u.user_id == state.id; });
    if (!s) return;

    apiGet('transactions.php?user_id=' + state.id).then(function (txns) {
      var activeCount = txns.filter(function (t) { return !t.actual_return_date; }).length;
      var returnedCount = txns.filter(function (t) { return t.actual_return_date; }).length;
      var overdueCount = txns.filter(function (t) { return !t.actual_return_date && isOverdue(t.expected_return_date); }).length;
      var status = overdueCount > 0 ? 'Overdue' : (activeCount > 0 ? 'Borrowing' : 'Good standing');

      var body = '';
      if (state.tab === 'loans' || !state.tab) {
        body = loanTable(txns.filter(function (t) { return !t.actual_return_date; }), true);
      } else if (state.tab === 'history') {
        body = '<div class="toolbar"><div class="row-end"><button class="btn light" onclick="exportLoans(' + s.user_id + ')">Export</button></div></div>' + loanTable(txns, true);
      } else if (state.tab === 'edit') {
        body = '<form onsubmit="saveStudent(event,' + s.user_id + ')"><div class="form-grid">' +
          '<div><label>First name</label><input id="fFirst" value="' + s.first_name + '" required></div>' +
          '<div><label>Last name</label><input id="fLast" value="' + s.last_name + '" required></div>' +
          '<div><label>ID Number</label><input id="fIdNum" value="' + s.id_number + '" required></div>' +
          '<div><label>Grade</label><input id="fGrade" value="' + (s.grade || '') + '"></div>' +
          '<div><label>Class</label><input id="fClass" value="' + (s.class || '') + '"></div>' +
          '<div><label>School email</label><input id="fEmail" type="email" value="' + s.email + '"></div>' +
          '<div><label>Phone</label><input id="fPhone" value="' + (s.contact_number || '') + '"></div></div>' +
          '<div class="form-actions"><button type="button" class="btn light" onclick="go(\'studentDetail\',' + s.user_id + ',\'loans\')">Cancel</button><button class="btn">Save changes</button></div></form>';
      }

      $('studDetail').innerHTML =
        '<div class="card"><div class="detail-head"><span class="avatar">' + initials(fullName(s)) + '</span><div><b>' + fullName(s) + '</b> ' + badge(status) +
        '<br><small>' + s.id_number + ' &middot; ' + (s.grade || '-') + ' &middot; ' + s.email + '</small></div></div>' +
        '<div class="mini-stats"><div><b>' + txns.length + '</b><span>Total loans</span></div><div><b>' + activeCount +
        '</b><span>Active</span></div><div><b>' + returnedCount + '</b><span>Returned</span></div><div><b>' + overdueCount +
        '</b><span>Overdue</span></div></div></div>' +
        '<div class="card">' + tabs([['loans', 'Active loans'], ['history', 'Full history'], ['edit', 'Edit student']]) + body + '</div>';
    });
  });
};

// ===== EQUIPMENT DETAIL =====
pages.equipmentDetail = function () {
  $('page').innerHTML = '<a class="back" onclick="go(\'equipment\')">&larr; Back to equipment</a><div id="equipDetail"></div>';

  apiGet('equipment.php?id=' + state.id).then(function (e) {
    if (!e) return;

    apiGet('transactions.php?equipment_id=' + state.id).then(function (txns) {
      var activeCount = txns.filter(function (t) { return !t.actual_return_date; }).length;
      var status = activeCount > 0 ? 'On loan' : 'Available';

      var body = '';
      if (state.tab === 'history' || !state.tab) {
        body = '<div class="toolbar"><div class="row-end"><button class="btn light" onclick="exportLoans(0,' + e.equipment_id + ')">Export</button></div></div>' + loanTable(txns, false);
      } else if (state.tab === 'condition') {
        body = '<div class="toolbar"><div class="row-end"><button class="btn" onclick="openRecordCondition(' + e.equipment_id + ')">+ Record condition</button></div></div>' +
          '<div class="table-wrap"><table><thead><tr><th>Date</th><th>Unit</th><th>Condition</th><th>Notes</th><th>Recorded by</th></tr></thead><tbody>' +
          '<tr><td colspan="5">Condition log coming soon via API</td></tr></tbody></table></div>';
      } else if (state.tab === 'edit') {
        body = '<form onsubmit="saveEquipment(event,' + e.equipment_id + ')"><div class="form-grid">' +
          '<div><label>Equipment name</label><input id="fName" value="' + e.name + '" required></div>' +
          '<div><label>Serial number</label><input id="fSerial" value="' + e.serial_number + '" required></div>' +
          '<div><label>Category</label><input id="fCat" value="' + e.category_name + '"></div>' +
          '<div><label>Location</label><input id="fLoc" value="' + e.room_name_or_number + '"></div>' +
          '<div class="full"><label>Specifications</label><textarea id="fSpecs" rows="3">' + (e.specifications || '') + '</textarea></div></div>' +
          '<div class="form-actions"><button type="button" class="btn red" onclick="deleteEquipment(' + e.equipment_id + ')">Delete</button><button type="button" class="btn light" onclick="go(\'equipmentDetail\',' + e.equipment_id + ',\'history\')">Cancel</button><button class="btn">Save changes</button></div></form>';
      }

      $('equipDetail').innerHTML =
        '<div class="card"><div class="detail-head"><div><b>' + e.name + '</b> ' + badge(status) +
        '<br><small>' + e.serial_number + ' &middot; ' + e.category_name + ' &middot; ' + e.room_name_or_number + '</small></div></div>' +
        '<div class="mini-stats"><div><b>1</b><span>Total units</span></div><div><b>' + (status === 'Available' ? 1 : 0) +
        '</b><span>Available</span></div><div><b>' + activeCount + '</b><span>On loan</span></div><div>' + badge(e.condition_status) +
        '<span> Condition</span></div></div></div>' +
        '<div class="card">' + tabs([['history', 'Full loan history'], ['condition', 'Condition log'], ['edit', 'Edit equipment']]) + body + '</div>';
    });
  });
};

// ===== REPORTS =====
pages.reports = function () {
  $('page').innerHTML = '<div class="stats" id="repStats"></div><div class="two-col" id="repCharts"></div><div id="repTable"></div>';

  apiGet('reports.php').then(function (data) {
    var s = data.summary;
    $('repStats').innerHTML =
      statCard('Items borrowed', s.total, 'All time') +
      statCard('Items returned', s.returned, 'Back on the shelf', 'green-text') +
      statCard('Active loans', s.active, 'Currently borrowed') +
      statCard('Overdue items', s.overdue, 'Needs follow-up', 'red-text');

    var months = data.monthly || [];
    var chart = months.map(function (m) {
      return '<div class="bar-group"><div class="bar-pair"><i style="height:' + m.borrowed * 0.8 + 'px"></i><i class="light" style="height:' + m.returned * 0.8 + 'px"></i></div><small>' + m.month + '</small></div>';
    }).join('');

    var cats = data.category_stats || [];
    var max = 1;
    cats.forEach(function (c) { if (c.total_transactions > max) max = c.total_transactions; });
    var bars = cats.map(function (c) {
      var activeCount = c.active + c.overdue;
      return '<div class="hbar"><span>' + c.category_name + '<b>' + activeCount + '</b></span><div style="width:' + (activeCount / max * 100) + '%"></div></div>';
    }).join('');

    $('repCharts').innerHTML =
      '<div class="card"><h3>Borrowing &amp; returns</h3><p class="sub">Dark = borrowed, light = returned</p><div class="bars">' + chart + '</div></div>' +
      '<div class="card"><h3>Active loans by category</h3>' + bars + '</div>';

    var rows = cats.map(function (c) {
      return '<tr><td>' + c.category_name + '</td><td>' + c.total_transactions + '</td><td>' + c.returned + '</td><td>' + c.active + '</td><td class="red-text">' + c.overdue + '</td></tr>';
    }).join('');

    $('repTable').innerHTML =
      '<div class="card"><div class="toolbar"><div><h3>Borrowing detail by category</h3></div><div class="row-end"><button class="btn light" onclick="exportLoans(0)">Export report</button></div></div>' +
      '<div class="table-wrap"><table><thead><tr><th>Category</th><th>Borrowed</th><th>Returned</th><th>Active</th><th>Overdue</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
  });
};

// ===== SETTINGS =====
function toggleRow(id, title, text) {
  return '<div class="setting"><div><div style="font-weight:500">' + title + '</div><small style="display:block;color:var(--muted);margin-top:2px">' + text + '</small></div><input type="checkbox" id="' + id + '"></div>';
}

pages.settings = function () {
  $('page').innerHTML = '<div id="settingsForm"></div>';

  apiGet('settings.php').then(function (s) {
    $('settingsForm').innerHTML =
      '<div class="card"><h3>School &amp; admin profile</h3><p class="sub">Shown on reports and notices</p><div class="form-grid">' +
      '<div><label>School name</label><input id="sSchool" value="' + s.school_name + '"></div>' +
      '<div><label>School email</label><input id="sEmail" value="' + s.school_email + '"></div>' +
      '<div><label>Admin name</label><input id="sAdmin" value="' + s.admin_name + '"></div></div></div>' +
      '<div class="card"><h3>Borrowing policies</h3><p class="sub">Rules for every loan</p><div class="form-grid">' +
      '<div><label>Default loan length (days)</label><input id="sDays" type="number" min="1" value="' + s.default_loan_days + '"></div>' +
      '<div><label>Maximum loans per user</label><input id="sMax" type="number" min="1" value="' + s.max_loans_per_user + '"></div></div></div>' +
      '<div class="card"><h3>Reminders &amp; notifications</h3>' +
      toggleRow('reminders', 'Email due-date reminders', 'Remind users before equipment is due') +
      toggleRow('overdueAlerts', 'Overdue alerts', 'Alert admins when equipment is late') +
      toggleRow('weeklySummary', 'Weekly summary', 'Send a weekly activity report') + '</div>' +
      '<div class="form-actions"><button class="btn light" onclick="go(\'settings\')">Cancel</button><button class="btn" onclick="saveSettings()">Save changes</button></div>';

    $('reminders').checked = s.reminders == 1;
    $('overdueAlerts').checked = s.overdue_alerts == 1;
    $('weeklySummary').checked = s.weekly_summary == 1;
  });
};

// ===== PENALTIES =====
pages.penalties = function () {
  $('page').innerHTML =
    '<div class="card"><h3>Penalties</h3><p class="sub">Late return fines and payment status</p>' +
    '<div class="table-wrap"><table><thead><tr><th>User</th><th>Equipment</th><th>Amount</th><th>Reason</th><th>Status</th><th></th></tr></thead>' +
    '<tbody id="penaltyBody"></tbody></table></div></div>';

  apiGet('penalties.php').then(function (data) {
    var html = data.map(function (p) {
      return '<tr><td>' + p.first_name + ' ' + p.last_name + '<small>' + p.id_number + '</small></td><td>' + p.equip_name +
        '</td><td>$' + p.amount_due + '</td><td>' + p.reason + '</td><td>' + badge(p.payment_status) +
        '</td><td><button class="btn sm" onclick="markPenaltyPaid(' + p.penalty_id + ')">Mark paid</button></td></tr>';
    }).join('');
    $('penaltyBody').innerHTML = html || '<tr><td colspan="6">No penalties found.</td></tr>';
  });
};

// =====================================================
// SHARED COMPONENTS
// =====================================================
function loanTable(loans, showStudent) {
  var rows = loans.map(function (l) {
    var who = showStudent
      ? l.first_name + ' ' + l.last_name + '<small>' + l.id_number + '</small>'
      : l.equip_name + '<small>' + l.serial_number + '</small>';
    var st = l.actual_return_date ? 'Returned' : (isOverdue(l.expected_return_date) ? 'Overdue' : 'Active');
    var action = st === 'Returned' ? '-' : '<button class="btn sm light" onclick="returnLoan(' + l.transaction_id + ')">Mark returned</button>';
    return '<tr><td>TXN-' + l.transaction_id + '</td><td>' + who + '</td><td>' + formatDate(l.checkout_date) + '</td><td>' + formatDate(l.expected_return_date) + '</td><td>' + formatDate(l.actual_return_date) + '</td><td>' + badge(st) + '</td><td>' + action + '</td></tr>';
  }).join('');

  return '<div class="table-wrap"><table><thead><tr><th>Transaction ID</th><th>' + (showStudent ? 'Student' : 'Equipment') +
    '</th><th>Checked out</th><th>Due date</th><th>Returned</th><th>Status</th><th></th></tr></thead><tbody>' +
    (rows || '<tr><td colspan="7">No loans to show.</td></tr>') + '</tbody></table></div>';
}

// =====================================================
// ACTIONS
// =====================================================

function approveRequest(reservationId) {
  apiPut('reservations.php', { reservation_id: reservationId, action: 'approve', admin_id: 1 }).then(function (res) {
    if (res.success) { render(); }
    else { alert(res.error || 'Failed to approve'); }
  });
}

function rejectRequest(reservationId) {
  apiPut('reservations.php', { reservation_id: reservationId, action: 'reject', admin_id: 1 }).then(function () {
    render();
  });
}

function returnLoan(transactionId) {
  apiPut('transactions.php', { transaction_id: transactionId, actual_return_date: true, return_condition: 'Good' }).then(function () {
    render();
  });
}

function markPenaltyPaid(penaltyId) {
  apiPut('penalties.php', { penalty_id: penaltyId, payment_status: 'Paid' }).then(function () {
    go('penalties');
  });
}

// ---------- ADD EQUIPMENT ----------
function openAddEquipment() {
  apiGet('categories.php').then(function (cats) {
    apiGet('locations.php').then(function (locs) {
      var catOpts = cats.map(function (c) { return '<option value="' + c.category_id + '">' + c.category_name + '</option>'; }).join('');
      var locOpts = locs.map(function (l) { return '<option value="' + l.location_id + '">' + l.room_name_or_number + '</option>'; }).join('');

      openModal('<h3>Add equipment</h3><form onsubmit="addEquipment(event)"><div class="form-grid">' +
        '<div class="full"><label>Name</label><input id="nName" required></div>' +
        '<div><label>Serial number</label><input id="nSerial" required></div>' +
        '<div><label>Category</label><select id="nCat">' + catOpts + '</select></div>' +
        '<div><label>Location</label><select id="nLoc">' + locOpts + '</select></div>' +
        '<div class="full"><label>Specifications</label><textarea id="nSpecs" rows="3"></textarea></div></div>' +
        '<div class="form-actions"><button type="button" class="btn light" onclick="closeModal()">Cancel</button><button class="btn">Add equipment</button></div></form>');
    });
  });
}

function addEquipment(e) {
  e.preventDefault();
  apiPost('equipment.php', {
    name: $('nName').value,
    serial_number: $('nSerial').value,
    category_id: Number($('nCat').value),
    location_id: Number($('nLoc').value),
    specifications: $('nSpecs').value,
    condition_status: 'Good'
  }).then(function () { closeModal(); go('equipment'); });
}

function saveEquipment(e, id) {
  e.preventDefault();
  apiPut('equipment.php', {
    equipment_id: id,
    name: $('fName').value,
    serial_number: $('fSerial').value,
    category_id: 1,
    location_id: 1,
    specifications: $('fSpecs').value,
    condition_status: 'Good'
  }).then(function () { go('equipmentDetail', id, 'history'); });
}

function deleteEquipment(id) {
  if (!confirm('Delete this equipment and all related records?')) return;
  apiDelete('equipment.php?id=' + id).then(function () { go('equipment'); });
}

// ---------- ADD STUDENT ----------
function openAddStudent() {
  openModal('<h3>Add student</h3><form onsubmit="addStudent(event)"><div class="form-grid">' +
    '<div><label>First name</label><input id="nFirst" required></div>' +
    '<div><label>Last name</label><input id="nLast" required></div>' +
    '<div><label>ID Number</label><input id="nIdNum" required></div>' +
    '<div><label>Grade</label><input id="nGrade" placeholder="Grade 10"></div>' +
    '<div><label>Class</label><input id="nClass" placeholder="A"></div>' +
    '<div><label>School email</label><input id="nEmail" type="email"></div></div>' +
    '<div class="form-actions"><button type="button" class="btn light" onclick="closeModal()">Cancel</button><button class="btn">Add student</button></div></form>');
}

function addStudent(e) {
  e.preventDefault();
  apiPost('users.php', {
    id_number: $('nIdNum').value,
    first_name: $('nFirst').value,
    last_name: $('nLast').value,
    grade: $('nGrade').value,
    class: $('nClass').value,
    email: $('nEmail').value,
    role: 'Student',
    account_status: 'Active'
  }).then(function () { closeModal(); go('students'); });
}

function saveStudent(e, id) {
  e.preventDefault();
  apiPut('users.php', {
    user_id: id,
    first_name: $('fFirst').value,
    last_name: $('fLast').value,
    id_number: $('fIdNum').value,
    grade: $('fGrade').value,
    class: $('fClass').value,
    email: $('fEmail').value,
    contact_number: $('fPhone').value,
    role: 'Student',
    account_status: 'Active'
  }).then(function () { go('studentDetail', id, 'loans'); });
}

// ---------- SETTINGS ----------
function saveSettings() {
  apiPut('settings.php', {
    school_name: $('sSchool').value,
    school_email: $('sEmail').value,
    admin_name: $('sAdmin').value,
    default_loan_days: Number($('sDays').value),
    max_loans_per_user: Number($('sMax').value),
    reminders: $('reminders').checked,
    overdue_alerts: $('overdueAlerts').checked,
    weekly_summary: $('weeklySummary').checked
  }).then(function () { alert('Settings saved.'); });
}

// ---------- EXPORT ----------
function exportLoans(userId, equipId) {
  apiGet('transactions.php' + (userId ? '?user_id=' + userId : equipId ? '?equipment_id=' + equipId : '')).then(function (data) {
    var rows = [['Transaction ID', 'Student', 'Equipment', 'Checked out', 'Due', 'Returned', 'Status']];
    data.forEach(function (l) {
      var st = l.actual_return_date ? 'Returned' : (isOverdue(l.expected_return_date) ? 'Overdue' : 'Active');
      rows.push(['TXN-' + l.transaction_id, l.first_name + ' ' + l.last_name, l.equip_name, l.checkout_date, l.expected_return_date, l.actual_return_date || '', st]);
    });
    var text = rows.map(function (r) { return r.join(','); }).join('\n');
    var link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
    link.download = 'loans.csv';
    link.click();
  });
}

// ---------- CONDITION LOG ----------
function openRecordCondition(id) {
  openModal('<h3>Record condition</h3><form onsubmit="addCondition(event,' + id + ')"><div class="form-grid">' +
    '<div><label>Unit code</label><input id="cUnit" required></div>' +
    '<div><label>New condition</label><select id="cTo"><option>Good</option><option>Fair</option><option>Poor</option></select></div>' +
    '<div class="full"><label>Notes</label><textarea id="cNote" rows="3" required></textarea></div></div>' +
    '<div class="form-actions"><button type="button" class="btn light" onclick="closeModal()">Cancel</button><button class="btn">Save record</button></div></form>');
}

function addCondition(e, id) {
  e.preventDefault();
  closeModal();
  go('equipmentDetail', id, 'condition');
}

// =====================================================
// START
// =====================================================
render();
