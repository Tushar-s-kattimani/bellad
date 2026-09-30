

// Database sync via Firebase
let isStorageReady = false;
let currentUserEmail = "public@bellad.com";
let employees = [];
let bulkAttendanceData = {};
let advanceBalances = {};
let advanceHistory = [];

let syncTimeout = null;
let isSyncing = false;
let currentSyncId = 0;

function syncToServer() {
    if (syncTimeout) clearTimeout(syncTimeout);
    const syncId = ++currentSyncId;
    syncTimeout = setTimeout(async () => {
        if (!currentUserEmail) return;
        isSyncing = true;
        try {
            const response = await fetch(`/api/data/${encodeURIComponent(currentUserEmail)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    employeesList: employees,
                    bulkAttendance: bulkAttendanceData,
                    advanceBalances: advanceBalances,
                    advanceHistory: advanceHistory
                })
            });
            if (!response.ok) throw new Error('Failed to sync to server');
            console.log("Successfully synced to Server");
        } catch (err) {
            console.error("Error syncing to Server:", err);
        } finally {
            if (currentSyncId === syncId) {
                syncTimeout = null;
                isSyncing = false;
            }
        }
    }, 500);
}

function initApp() {
    // App loads data for public shared view
    loadFromServer();

    // Set current date on Dashboard
    const dateElement = document.getElementById('current-date');
    if (dateElement) {
        const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
        const today = new Date();
        dateElement.textContent = today.toLocaleDateString('en-GB', options);
    }

    // --- State Management ---
    const defaultEmployees = [
        { id: 'emp_01', name: 'Rahul Sharma', initial: 'RS', bg: 'bg-blue', role: 'Software Engineer', salaryType: 'monthly', salaryAmount: 85000 },
        { id: 'emp_02', name: 'Priya Mehta', initial: 'PM', bg: 'bg-purple', role: 'HR Manager', salaryType: 'monthly', salaryAmount: 60000 },
        { id: 'emp_03', name: 'Amit Kumar', initial: 'AK', bg: 'bg-orange', role: 'Sales Executive', salaryType: 'daily', salaryAmount: 2000 },
        { id: 'emp_04', name: 'Sneha Joshi', initial: 'SJ', bg: 'bg-green', role: 'Accountant', salaryType: 'monthly', salaryAmount: 45000 }
    ];

    

    
    
    

    async function loadFromServer() {
        if (!currentUserEmail) return;
        if (isSyncing || syncTimeout) return; // Don't override if we are actively saving local changes

        try {
            isStorageReady = false;
            const response = await fetch(`/api/data/${encodeURIComponent(currentUserEmail)}`);
            if (response.ok) {
                const data = await response.json();
                
                const dbEmployees = data.employeesList || [];
                const dbAttendance = data.bulkAttendance || {};
                const dbAdvBalances = data.advanceBalances || {};
                const dbAdvHistory = data.advanceHistory || [];

                if (dbEmployees.length > 0) {
                    employees = dbEmployees;
                } else if (employees.length === 0) {
                    employees = defaultEmployees;
                    syncToServer();
                }
                
                bulkAttendanceData = dbAttendance;
                advanceBalances = dbAdvBalances;
                advanceHistory = dbAdvHistory;

                // Re-render UI components
                if (typeof renderCalendar === 'function') renderCalendar();
                if (typeof renderDailyAttendance === 'function') renderDailyAttendance();
                if (typeof renderSalaryTable === 'function') renderSalaryTable();
                if (typeof renderAdvanceViews === 'function') renderAdvanceViews();
                if (typeof renderDashboard === 'function') renderDashboard();
                if (typeof renderEmployeeGrid === 'function' && document.getElementById('employees').classList.contains('active')) renderEmployeeGrid();
            }
        } catch (error) {
            console.error("Server Fetch Error:", error);
        } finally {
            isStorageReady = true;
        }
    }

    // Poll for updates every 3 seconds to keep other devices in sync
    setInterval(loadFromServer, 3000);


    // Handle SPA navigation
    const navItems = document.querySelectorAll('.nav-item');
    const pageSections = document.querySelectorAll('.page-section');
    const headerSubtitle = document.getElementById('header-subtitle');

    const pageTitles = {
        'dashboard': 'Employee Management',
        'attendance': 'Attendance & Timesheets',
        'employees': 'Employee Directory',
        'salary': 'Payroll Management',
        'advances': 'Advances & Loans',
        'settings': 'Company Settings'
    };

    function navigateToPage(pageId) {
        navItems.forEach(nav => {
            if (nav.dataset.page === pageId) nav.classList.add('active');
            else nav.classList.remove('active');
        });

        pageSections.forEach(section => {
            if (section.id === pageId) {
                section.classList.add('active');
                
                // specific page renders
                if (pageId === 'employees') renderEmployeeGrid();
                if (pageId === 'salary') renderSalaryTable();
                
                const cards = section.querySelectorAll('.stat-card, .premium-card, .employee-card');
                cards.forEach((card, index) => {
                    card.style.opacity = '0';
                    card.style.transform = 'translateY(20px)';
                    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.2s ease';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                    }, 50 + (index * 50));
                });
            } else {
                section.classList.remove('active');
            }
        });

        if (headerSubtitle && pageTitles[pageId]) {
            headerSubtitle.textContent = pageTitles[pageId];
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = item.dataset.page;
            if (pageId) navigateToPage(pageId);
        });
    });
    
    const navTriggers = document.querySelectorAll('.nav-trigger');
    navTriggers.forEach(trigger => {
        trigger.addEventListener('click', (e) => {
            e.preventDefault();
            const targetPage = trigger.dataset.target;
            if (targetPage) navigateToPage(targetPage);
        });
    });

    // --- Employee Grid & Edit Logic ---
    const employeeGrid = document.getElementById('dynamic-employee-grid');
    const employeeEditModal = document.getElementById('employee-edit-modal');
    const employeeEditForm = document.getElementById('employee-edit-form');
    
    const employeeAddModal = document.getElementById('employee-add-modal');
    const employeeAddForm = document.getElementById('employee-add-form');
    const btnAddEmpTrigger = document.getElementById('btn-add-emp-trigger');
    
    function renderEmployeeGrid() {
        if (!employeeGrid) return;
        employeeGrid.innerHTML = '';
        employees.forEach(emp => {
            const card = `
                <div class="employee-card">
                    <div class="avatar-lg ${emp.bg}">${emp.initial}</div>
                    <h3>${emp.name}</h3>
                    <p class="role">${emp.role || 'Employee'}</p>
                    <p class="emp-id" style="font-weight: 500; color: var(--primary-blue);">Base: ${emp.salaryType === 'monthly' ? '₹'+emp.salaryAmount+'/mo' : '₹'+emp.salaryAmount+'/day'}</p>
                    <div class="employee-actions">
                        <button class="btn-icon btn-edit-emp" data-id="${emp.id}" title="Edit Profile & Salary"><i class="fa-solid fa-pen"></i></button>
                    </div>
                </div>
            `;
            employeeGrid.insertAdjacentHTML('beforeend', card);
        });

        // Bind Edit buttons
        document.querySelectorAll('.btn-edit-emp').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const empId = e.currentTarget.dataset.id;
                const emp = employees.find(e => e.id === empId);
                if (emp) {
                    document.getElementById('edit-emp-id').value = emp.id;
                    document.getElementById('edit-emp-name').value = emp.name;
                    document.getElementById('edit-emp-salary-type').value = emp.salaryType || 'monthly';
                    document.getElementById('edit-emp-salary-amount').value = emp.salaryAmount || 0;
                    employeeEditModal.classList.add('active');
                }
            });
        });
    }

    if(employeeEditForm) {
        employeeEditForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-emp-id').value;
            const empIndex = employees.findIndex(emp => emp.id === id);
            if(empIndex > -1) {
                employees[empIndex].name = document.getElementById('edit-emp-name').value;
                employees[empIndex].salaryType = document.getElementById('edit-emp-salary-type').value;
                employees[empIndex].salaryAmount = parseFloat(document.getElementById('edit-emp-salary-amount').value);
                
                // update initials just in case name changed
                employees[empIndex].initial = employees[empIndex].name.split(' ').map(n=>n[0]).join('').toUpperCase();
                
                syncToServer();
                renderEmployeeGrid();
                
                if (typeof renderDailyAttendance === 'function') renderDailyAttendance();
                if (typeof renderSalaryTable === 'function') renderSalaryTable();
                
                employeeEditModal.classList.remove('active');
            }
        });
    }

    document.querySelectorAll('.btn-close-emp-modal').forEach(btn => {
        btn.addEventListener('click', () => employeeEditModal.classList.remove('active'));
    });

    if (btnAddEmpTrigger) {
        btnAddEmpTrigger.addEventListener('click', () => {
            employeeAddForm.reset();
            employeeAddModal.classList.add('active');
        });
    }

    if (employeeAddForm) {
        employeeAddForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('add-emp-name').value;
            const role = 'Employee';
            const salaryType = document.getElementById('add-emp-salary-type').value;
            const salaryAmount = parseFloat(document.getElementById('add-emp-salary-amount').value);
            
            const initial = name.split(' ').map(n=>n[0]).join('').toUpperCase().substring(0, 2);
            const bgs = ['bg-blue', 'bg-purple', 'bg-orange', 'bg-green'];
            const bg = bgs[employees.length % bgs.length];
            const id = 'emp_' + Date.now();
            
            const newEmp = { id, name, initial, bg, role, salaryType, salaryAmount };
            employees.push(newEmp);
            
            syncToServer();
            renderEmployeeGrid();
            
            if (typeof renderDailyAttendance === 'function') renderDailyAttendance();
            if (typeof renderSalaryTable === 'function') renderSalaryTable();
            if (typeof renderDashboard === 'function') renderDashboard();
            if (typeof renderAdvanceViews === 'function') renderAdvanceViews();
            
            employeeAddModal.classList.remove('active');
        });
    }

    document.querySelectorAll('.btn-close-add-emp-modal').forEach(btn => {
        btn.addEventListener('click', () => employeeAddModal.classList.remove('active'));
    });

    // Initial render for Employee Grid if active
    if (document.querySelector('#employees.active')) renderEmployeeGrid();

    // --- Daily Attendance Logic (Register Style & Custom Calendar) ---
    const dailyAttendanceBody = document.getElementById('daily-attendance-body');
    const calendarDays = document.getElementById('calendar-days');
    const calMonthDisplay = document.getElementById('cal-month-display');
    const btnPrevMonth = document.getElementById('cal-prev-month');
    const btnNextMonth = document.getElementById('cal-next-month');

    // Make getDaysInMonth available here too
    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    let currentCalDate = new Date();
    let selectedCalDate = `${currentCalDate.getFullYear()}-${String(currentCalDate.getMonth() + 1).padStart(2, '0')}-${String(currentCalDate.getDate()).padStart(2, '0')}`;

    function renderCalendar() {
        if (!calendarDays || !calMonthDisplay) return;
        
        const year = currentCalDate.getFullYear();
        const month = currentCalDate.getMonth(); // 0-11
        
        calMonthDisplay.textContent = currentCalDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
        const daysInMonth = getDaysInMonth(year, month + 1); // 1-12 based
        
        calendarDays.innerHTML = '';
        
        // Empty cells before 1st day
        for (let i = 0; i < firstDayOfMonth; i++) {
            calendarDays.insertAdjacentHTML('beforeend', `<div class="cal-day empty"></div>`);
        }
        
        // Days of month
        const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            
            // Determine status
            let statusClass = 'cal-status-none'; // default red
            let markedCount = 0;
            const records = bulkAttendanceData[dateStr];
            
            if (records) {
                markedCount = Object.keys(records).length;
            }
            
            if (markedCount === 0) {
                statusClass = 'cal-status-none';
            } else if (markedCount > 0 && markedCount < employees.length) {
                statusClass = 'cal-status-partial';
            } else if (markedCount === employees.length) {
                statusClass = 'cal-status-complete';
            }
            
            const isSelected = selectedCalDate === dateStr ? 'selected' : '';
            const isToday = todayStr === dateStr ? 'today' : '';
            const isFuture = dateStr > todayStr ? 'future-disabled' : '';
            
            const dayHTML = `<div class="cal-day ${statusClass} ${isSelected} ${isToday} ${isFuture}" data-date="${dateStr}">${i}</div>`;
            calendarDays.insertAdjacentHTML('beforeend', dayHTML);
        }
        
        // Bind clicks
        document.querySelectorAll('.cal-day:not(.empty)').forEach(dayEl => {
            dayEl.addEventListener('click', (e) => {
                if (e.target.classList.contains('future-disabled')) {
                    // Ignore clicks on future dates
                    return;
                }
                selectedCalDate = e.target.dataset.date;
                renderCalendar(); // re-render to update selected styling
                renderDailyAttendance(); // re-render attendance list
                
                // Hide popup if exists
                const calendarPopup = document.getElementById('calendar-popup');
                if (calendarPopup) {
                    calendarPopup.style.display = 'none';
                }
            });
        });
    }

    let lastRenderedDate = null;
    function renderDailyAttendance() {
        if (!dailyAttendanceBody) return;
        
        const selectedDate = selectedCalDate;
        
        // Update display text
        const displaySpan = document.getElementById('selected-date-display');
        if (displaySpan) {
            const [y, m, d] = selectedDate.split('-');
            const dateObj = new Date(y, parseInt(m) - 1, d);
            displaySpan.textContent = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        }
        const recordsForDate = bulkAttendanceData[selectedDate] || {};
        
        if (lastRenderedDate === selectedDate && dailyAttendanceBody.children.length > 0) {
            // Just update radio buttons without rebuilding DOM
            employees.forEach(emp => {
                const status = recordsForDate[emp.id] || '';
                const radios = dailyAttendanceBody.querySelectorAll(`input[name="status_${emp.id}"]`);
                radios.forEach(r => {
                    r.checked = (r.value === status);
                });
            });
            return;
        }
        
        lastRenderedDate = selectedDate;
        dailyAttendanceBody.innerHTML = '';
        
        employees.forEach(emp => {
            const status = recordsForDate[emp.id] || ''; // default to unselected
            
            const rowHTML = `
                <tr>
                    <td>
                        <div class="user-info">
                            <div class="avatar ${emp.bg}">${emp.initial}</div>
                            <span>${emp.name}</span>
                        </div>
                    </td>
                    <td>
                        <div class="status-toggles">
                            <label class="toggle-label toggle-present">
                                <input type="radio" class="attendance-radio" name="status_${emp.id}" value="Present" data-emp-id="${emp.id}" ${status === 'Present' ? 'checked' : ''}>
                                <span>P</span>
                            </label>
                            <label class="toggle-label toggle-absent">
                                <input type="radio" class="attendance-radio" name="status_${emp.id}" value="Absent" data-emp-id="${emp.id}" ${status === 'Absent' ? 'checked' : ''}>
                                <span>A</span>
                            </label>
                            <label class="toggle-label toggle-halfday">
                                <input type="radio" class="attendance-radio" name="status_${emp.id}" value="Half Day" data-emp-id="${emp.id}" ${status === 'Half Day' ? 'checked' : ''}>
                                <span>H</span>
                            </label>
                        </div>
                    </td>
                </tr>
            `;
            dailyAttendanceBody.insertAdjacentHTML('beforeend', rowHTML);
        });

        // Add auto-save event listeners
        document.querySelectorAll('.attendance-radio').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const empId = e.target.dataset.empId;
                const newStatus = e.target.value;
                
                const existingRecord = bulkAttendanceData[selectedDate] ? bulkAttendanceData[selectedDate][empId] : undefined;
                
                if (existingRecord && existingRecord !== newStatus) {
                    const pin = window.prompt("Security Check: Enter Manager PIN (1919) to change an already saved record:");
                    if (pin !== '1919') {
                        alert("Incorrect PIN. Modification cancelled.");
                        // Revert radio button visually
                        const oldRadio = document.querySelector(`input[name="status_${empId}"][value="${existingRecord}"]`);
                        if (oldRadio) oldRadio.checked = true;
                        return;
                    }
                }
                
                // Update local memory
                if (!bulkAttendanceData[selectedDate]) bulkAttendanceData[selectedDate] = {};
                bulkAttendanceData[selectedDate][empId] = newStatus;
                
                // Save locally but bypass the heavy bulk sync hook
                syncToServer();
                
                // Trigger Firebase sync
                syncToServer();
                
                // Re-render calendar to update colors
                renderCalendar();
                
                // Re-render attendance list for any internal state updates
                // renderDailyAttendance(); // Commented out to prevent losing focus if re-rendering is unnecessary here, wait we need it if there's any state dependency, but it might steal focus from radio. Actually radio holds state natively. No, radio is native, but re-rendering rebuilds DOM. Best not to re-render attendance list, just the calendar!
                
                // Update salary table if it's currently open/active
                if (typeof renderSalaryTable === 'function') renderSalaryTable();
                
                // Update dashboard
                if (typeof renderDashboard === 'function') renderDashboard();
            });
        });
    }

    if (calendarDays) {
        if (btnPrevMonth) {
            btnPrevMonth.addEventListener('click', () => {
                currentCalDate.setMonth(currentCalDate.getMonth() - 1);
                renderCalendar();
            });
        }
        if (btnNextMonth) {
            btnNextMonth.addEventListener('click', () => {
                currentCalDate.setMonth(currentCalDate.getMonth() + 1);
                renderCalendar();
            });
        }
        
        const btnToggleCalendar = document.getElementById('btn-toggle-calendar');
        const calendarPopup = document.getElementById('calendar-popup');
        
        if (btnToggleCalendar && calendarPopup) {
            btnToggleCalendar.addEventListener('click', (e) => {
                e.stopPropagation();
                if (calendarPopup.style.display === 'none') {
                    calendarPopup.style.display = 'block';
                    renderCalendar(); // make sure it's up to date when opened
                } else {
                    calendarPopup.style.display = 'none';
                }
            });
            
            // Close calendar if clicking outside
            document.addEventListener('click', (e) => {
                if (calendarPopup.style.display === 'block' && !calendarPopup.contains(e.target) && e.target !== btnToggleCalendar) {
                    calendarPopup.style.display = 'none';
                }
            });
            
            // Prevent clicks inside the popup from closing it
            calendarPopup.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }
        
        renderCalendar();
        renderDailyAttendance();
    }


    // --- Salary Calculation Logic ---
    const salaryTableBody = document.getElementById('salary-table-body');
    const salaryMonthPicker = document.getElementById('salary-month-picker');
    const salaryMonthDisplay = document.getElementById('salary-month-display');

    function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
    }

    function renderSalaryTable() {
        if (!salaryTableBody || !salaryMonthPicker) return;
        
        const selectedMonthVal = salaryMonthPicker.value;
        if(!selectedMonthVal) return;
        
        const [yearStr, monthStr] = selectedMonthVal.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr);
        
        const dateObj = new Date(year, month - 1);
        const monthName = dateObj.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
        if(salaryMonthDisplay) salaryMonthDisplay.textContent = monthName;

        const daysInMonth = getDaysInMonth(year, month);
        
        salaryTableBody.innerHTML = '';
        let totalEstimatedPayout = 0;

        employees.forEach(emp => {
            let daysPresent = 0;
            let daysAbsent = 0;
            let daysHalf = 0;
            let absentDates = [];
            
            // Iterate over every day of the selected month
            for(let d=1; d<=daysInMonth; d++) {
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dailyRecord = bulkAttendanceData[dateStr];
                
                if (dailyRecord && dailyRecord[emp.id]) {
                    const status = dailyRecord[emp.id];
                    if (status === 'Present') {
                        daysPresent += 1;
                    } else if (status === 'Half Day') {
                        daysHalf += 1;
                        daysPresent += 0.5;
                    } else if (status === 'Absent') {
                        daysAbsent += 1;
                        absentDates.push(String(d).padStart(2, '0'));
                    }
                }
            }

            let calculatedPay = 0;
            let dailyRate = 0;
            if (emp.salaryType === 'monthly') {
                dailyRate = emp.salaryAmount / daysInMonth;
                calculatedPay = dailyRate * daysPresent;
            } else {
                dailyRate = emp.salaryAmount;
                calculatedPay = emp.salaryAmount * daysPresent;
            }
            
            // Advance Deduction Logic
            // Make sure advanceBalances is accessible here
            const allAdvances = advanceBalances;
            const advanceBalance = allAdvances[emp.id] || 0;
            let deduction = 0;
            let remainingAdvance = advanceBalance;
            
            if (advanceBalance > 0) {
                deduction = Math.min(calculatedPay, advanceBalance);
                remainingAdvance = advanceBalance - deduction;
                calculatedPay -= deduction;
            }
            
            totalEstimatedPayout += calculatedPay;

            const formattedPay = calculatedPay.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
            const formattedBase = `₹${emp.salaryAmount}/${emp.salaryType === 'monthly' ? 'mo' : 'day'} (₹${dailyRate.toFixed(2)}/day)`;
            
            const absentText = daysAbsent > 0 ? `<div style="color: #dc2626; font-weight: 500;">${daysAbsent}</div><div style="font-size: 11px; color: #ef4444;">(${absentDates.join(', ')})</div>` : `<div style="color: #dc2626;">0</div>`;

            let breakdownHTML = `Net Payable: ${formattedPay}`;
            if (advanceBalance > 0) {
                breakdownHTML = `Net Payable: ${formattedPay}<div style="font-size: 12px; color: #ef4444; margin-top: 4px; font-weight: 500;">Balance Adv.: ₹${remainingAdvance.toFixed(2)}</div>`;
            }

            const row = `
                <tr>
                    <td>
                        <div style="font-weight: 600; color: var(--text-dark);">${emp.name}</div>
                        <div style="font-size: 12px; color: var(--text-gray);">${formattedBase}</div>
                    </td>
                    <td style="text-align: center;">${daysInMonth}</td>
                    <td style="text-align: center; color: #16a34a; font-weight: 500;">${daysPresent}</td>
                    <td style="text-align: center;">${absentText}</td>
                    <td style="text-align: center; color: #d97706; font-weight: 500;">${daysHalf}</td>
                    <td style="text-align: right; font-weight: 700; color: #03488f;">${breakdownHTML}</td>
                </tr>
            `;
            salaryTableBody.insertAdjacentHTML('beforeend', row);
        });
        
        const totalPayoutEl = document.getElementById('total-estimated-payout');
        if (totalPayoutEl) {
            totalPayoutEl.textContent = totalEstimatedPayout.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
        }
    }

    if (salaryMonthPicker) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        salaryMonthPicker.value = `${yyyy}-${mm}`;
        
        renderSalaryTable();
        salaryMonthPicker.addEventListener('change', renderSalaryTable);
    }
    
    // --- Advances Logic ---

    const tabBalances = document.getElementById('tab-advances-balances');
    const tabHistory = document.getElementById('tab-advances-history');
    const viewBalances = document.getElementById('advance-balances-view');
    const viewHistory = document.getElementById('advance-history-view');
    const btnGiveAdvance = document.getElementById('btn-give-advance');
    const selectEmpAdvance = document.getElementById('advance-employee-select');
    const inputAdvanceAmt = document.getElementById('advance-amount');

    if (tabBalances && tabHistory) {
        tabBalances.addEventListener('click', () => {
            viewBalances.style.display = 'block';
            viewHistory.style.display = 'none';
            tabBalances.style.background = 'var(--primary-blue)';
            tabBalances.style.color = 'white';
            tabHistory.style.background = 'transparent';
            tabHistory.style.color = 'var(--primary-blue)';
        });
        
        tabHistory.addEventListener('click', () => {
            viewBalances.style.display = 'none';
            viewHistory.style.display = 'block';
            tabHistory.style.background = 'var(--primary-blue)';
            tabHistory.style.color = 'white';
            tabBalances.style.background = 'transparent';
            tabBalances.style.color = 'var(--primary-blue)';
        });
    }

    function renderAdvanceViews() {
        if (selectEmpAdvance) {
            if (selectEmpAdvance.options.length !== employees.length + 1) {
                const currentValue = selectEmpAdvance.value;
                selectEmpAdvance.innerHTML = '<option value="" disabled selected>Select Employee</option>';
                employees.forEach(emp => {
                    selectEmpAdvance.insertAdjacentHTML('beforeend', `<option value="${emp.id}">${emp.name}</option>`);
                });
                if (currentValue) selectEmpAdvance.value = currentValue;
            }
        }
        
        const balancesBody = document.getElementById('advance-balances-body');
        if (balancesBody) {
            balancesBody.innerHTML = '';
            employees.forEach(emp => {
                const bal = advanceBalances[emp.id] || 0;
                balancesBody.insertAdjacentHTML('beforeend', `
                    <tr>
                        <td>
                            <div style="font-weight: 500;">${emp.name}</div>
                        </td>
                        <td style="text-align: right; font-weight: 700; color: ${bal > 0 ? '#ef4444' : 'var(--text-gray)'}">₹${bal.toFixed(2)}</td>
                    </tr>
                `);
            });
        }
        
        const historyBody = document.getElementById('advance-history-body');
        if (historyBody) {
            historyBody.innerHTML = '';
            [...advanceHistory].reverse().forEach(record => {
                const emp = employees.find(e => e.id === record.empId);
                const empName = emp ? emp.name : 'Unknown';
                historyBody.insertAdjacentHTML('beforeend', `
                    <tr>
                        <td>${record.date}</td>
                        <td>${empName}</td>
                        <td style="text-align: right; font-weight: 600;">₹${record.amount.toFixed(2)}</td>
                    </tr>
                `);
            });
        }
    }

    if (btnGiveAdvance) {
        // We only render these views if we are on the advances page / elements exist
        renderAdvanceViews();
        
        btnGiveAdvance.addEventListener('click', () => {
            const empId = selectEmpAdvance.value;
            const amt = parseFloat(inputAdvanceAmt.value);
            
            if (!empId || isNaN(amt) || amt <= 0) {
                alert('Please select an employee and enter a valid amount.');
                return;
            }
            
            advanceBalances[empId] = (advanceBalances[empId] || 0) + amt;
            
            const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            advanceHistory.push({
                empId: empId,
                amount: amt,
                date: todayStr
            });
            
            syncToServer();
            syncToServer();
            
            inputAdvanceAmt.value = '';
            selectEmpAdvance.value = '';
            
            renderAdvanceViews();
            
            if (typeof renderSalaryTable === 'function') renderSalaryTable();
        });
    }

    // --- Dashboard Logic ---
    function renderDashboard() {
        const todayStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
        
        let presentCount = 0;
        let absentCount = 0;
        let halfdayCount = 0;
        let exceptions = [];
        
        const todayRecords = bulkAttendanceData[todayStr] || {};
        
        employees.forEach(emp => {
            const status = todayRecords[emp.id];
            if (status === 'Present') {
                presentCount++;
            } else if (status === 'Absent') {
                absentCount++;
                exceptions.push({ name: emp.name, status: 'Absent' });
            } else if (status === 'Half Day') {
                halfdayCount++;
                exceptions.push({ name: emp.name, status: 'Half Day' });
            }
        });
        
        const dashTotalStaff = document.getElementById('dash-total-staff');
        const dashPresent = document.getElementById('dash-present');
        const dashAbsent = document.getElementById('dash-absent');
        const dashHalfday = document.getElementById('dash-halfday');
        
        if(dashTotalStaff) dashTotalStaff.textContent = employees.length;
        if(dashPresent) dashPresent.textContent = presentCount;
        if(dashAbsent) dashAbsent.textContent = absentCount;
        if(dashHalfday) dashHalfday.textContent = halfdayCount;
        
        const totalStaff = employees.length;
        const progressPct = totalStaff === 0 ? 0 : Math.round((presentCount / totalStaff) * 100);
        
        const progressTextEl = document.getElementById('dash-progress-text');
        const progressBarEl = document.getElementById('dash-progress-bar');
        const progressPctEl = document.getElementById('dash-progress-pct');
        
        if (progressTextEl) progressTextEl.textContent = `${presentCount} of ${totalStaff} present today`;
        if (progressBarEl) progressBarEl.style.width = `${progressPct}%`;
        if (progressPctEl) progressPctEl.textContent = `${progressPct}%`;
        
        const exceptionsList = document.getElementById('dash-exceptions-list');
        if (exceptionsList) {
            exceptionsList.innerHTML = '';
            if (exceptions.length === 0) {
                exceptionsList.innerHTML = `<div style="color: var(--text-gray); font-size: 14px; padding: 10px; background: var(--bg-light); border-radius: 6px;">No exceptions to show for today.</div>`;
            } else {
                exceptions.forEach(exc => {
                    const color = exc.status === 'Absent' ? '#dc2626' : '#d97706';
                    const bg = exc.status === 'Absent' ? '#fee2e2' : '#fef3c7';
                    const icon = exc.status === 'Absent' ? 'fa-circle-xmark' : 'fa-clock';
                    
                    exceptionsList.insertAdjacentHTML('beforeend', `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; background: ${bg}; border-radius: 6px; border: 1px solid ${color}40;">
                            <div style="font-weight: 500; color: var(--text-dark);">${exc.name}</div>
                            <div style="color: ${color}; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                                <i class="fa-regular ${icon}"></i> ${exc.status}
                            </div>
                        </div>
                    `);
                });
            }
        }
    }

    renderDashboard();

    // Initial animation for active page
    const activePage = document.querySelector('.page-section.active');
    if (activePage) {
        const cards = activePage.querySelectorAll('.stat-card');
        cards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.4s ease, transform 0.4s ease, box-shadow 0.2s ease';
            
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + (index * 100));
        });
    }

    // --- Settings / Data Management Logic ---
    const btnResetData = document.getElementById('btn-reset-data');
    if (btnResetData) {
        btnResetData.addEventListener('click', () => {
            if (confirm("Are you ABSOLUTELY sure? This will delete all daily attendance records and advance history forever. Employee profiles will be kept.")) {
                // Clear local variables
                bulkAttendanceData = {};
                advanceBalances = {};
                advanceHistory = [];
                
                // Clear from LocalStorage
                
                
                
                
                // Re-render UI components
                if (typeof renderCalendar === 'function') renderCalendar();
                if (typeof renderDailyAttendance === 'function') renderDailyAttendance();
                if (typeof renderSalaryTable === 'function') renderSalaryTable();
                if (typeof renderAdvanceViews === 'function') renderAdvanceViews();
                if (typeof renderDashboard === 'function') renderDashboard();
                
                alert("Data has been successfully reset! Starting a fresh tracking period.");
            }
        });
    }
}
initApp();
