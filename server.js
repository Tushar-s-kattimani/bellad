require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/api/data', async (req, res) => {
    try {
        const [
            { data: dbEmployees },
            { data: dbAttendance },
            { data: dbAdvHistory },
            { data: dbAdvBalances }
        ] = await Promise.all([
            supabase.from('bellad_employees').select('*'),
            supabase.from('bellad_attendance').select('*'),
            supabase.from('bellad_advance_history').select('*'),
            supabase.from('bellad_advance_balances').select('*')
        ]);

        res.json({
            employees: dbEmployees || [],
            attendance: dbAttendance || [],
            advanceHistory: dbAdvHistory || [],
            advanceBalances: dbAdvBalances || []
        });
    } catch (err) {
        console.error("Error fetching data:", err);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

app.post('/api/data', async (req, res) => {
    try {
        const { employeesList, bulkAttendance, advanceBalances, advanceHistory } = req.body;

        // Sync Employees
        if (!employeesList || employeesList.length === 0) {
            await supabase.from('bellad_employees').delete().not('id', 'is', null);
        } else {
            const empData = employeesList.map(emp => ({
                id: emp.id, 
                name: emp.name, 
                initial: emp.initial, 
                bg: emp.bg, 
                role: emp.role, 
                salarytype: emp.salaryType, 
                salaryamount: emp.salaryAmount
            }));
            await supabase.from('bellad_employees').upsert(empData, { onConflict: 'id' });
        }

        // Sync Attendance
        if (!bulkAttendance || Object.keys(bulkAttendance).length === 0) {
            await supabase.from('bellad_attendance').delete().not('date', 'is', null);
        } else {
            const attendanceData = [];
            for (const [date, records] of Object.entries(bulkAttendance)) {
                for (const [empId, status] of Object.entries(records)) {
                    attendanceData.push({ date, employee_id: empId, status });
                }
            }
            if (attendanceData.length > 0) {
                await supabase.from('bellad_attendance').upsert(attendanceData, { onConflict: 'date, employee_id' });
            }
        }

        // Sync Advance Balances
        if (!advanceBalances || Object.keys(advanceBalances).length === 0) {
            await supabase.from('bellad_advance_balances').delete().not('empid', 'is', null);
        } else {
            const balancesData = Object.entries(advanceBalances).map(([empId, balance]) => ({
                empid: empId,
                balance: balance
            }));
            if (balancesData.length > 0) {
                await supabase.from('bellad_advance_balances').upsert(balancesData, { onConflict: 'empid' });
            }
        }

        // Sync Advance History
        if (!advanceHistory || advanceHistory.length === 0) {
            await supabase.from('bellad_advance_history').delete().not('empid', 'is', null);
        } else {
            await supabase.from('bellad_advance_history').delete().not('empid', 'is', null);
            const historyData = advanceHistory.map(record => ({
                empid: record.empId,
                amount: record.amount,
                date: record.date
            }));
            if (historyData.length > 0) {
                await supabase.from('bellad_advance_history').insert(historyData);
            }
        }

        res.json({ success: true });
    } catch (err) {
        console.error("Error syncing data:", err);
        res.status(500).json({ error: "Failed to sync data" });
    }
});

app.post('/api/mark-attendance', async (req, res) => {
    try {
        const { date, empId, status } = req.body;
        await supabase.from('bellad_attendance').upsert({
            date: date,
            employee_id: empId,
            status: status
        }, { onConflict: 'date, employee_id' });
        
        res.json({ success: true });
    } catch (err) {
        console.error("Error marking attendance:", err);
        res.status(500).json({ error: "Failed to mark attendance" });
    }
});

const PORT = process.env.PORT || 3000;
app.use(express.static('./', {
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
}));
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT} (Connected to Supabase)`);
});
