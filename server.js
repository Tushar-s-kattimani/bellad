const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const sql = neon('postgresql://neondb_owner:npg_kNS3liz6EgKq@ep-weathered-hill-b55m67c1-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require');

app.get('/api/data', async (req, res) => {
    try {
        const dbEmployees = await sql`SELECT * FROM bellad_employees`;
        const dbAttendance = await sql`SELECT * FROM bellad_attendance`;
        const dbAdvHistory = await sql`SELECT * FROM bellad_advance_history`;
        const dbAdvBalances = await sql`SELECT * FROM bellad_advance_balances`;

        res.json({
            employees: dbEmployees,
            attendance: dbAttendance,
            advanceHistory: dbAdvHistory,
            advanceBalances: dbAdvBalances
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
            await sql`DELETE FROM bellad_employees`;
        } else {
            for (const emp of employeesList) {
                await sql`INSERT INTO bellad_employees (id, name, initial, bg, role, salaryType, salaryAmount) 
                          VALUES (${emp.id}, ${emp.name}, ${emp.initial}, ${emp.bg}, ${emp.role}, ${emp.salaryType}, ${emp.salaryAmount})
                          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, initial = EXCLUDED.initial, bg = EXCLUDED.bg, role = EXCLUDED.role, salaryType = EXCLUDED.salarytype, salaryAmount = EXCLUDED.salaryamount`;
            }
        }

        // Sync Attendance
        if (!bulkAttendance || Object.keys(bulkAttendance).length === 0) {
            await sql`DELETE FROM bellad_attendance`;
        } else {
            for (const [date, records] of Object.entries(bulkAttendance)) {
                for (const [empId, status] of Object.entries(records)) {
                    await sql`INSERT INTO bellad_attendance (date, employee_id, status) 
                              VALUES (${date}, ${empId}, ${status})
                              ON CONFLICT (date, employee_id) DO UPDATE SET status = EXCLUDED.status`;
                }
            }
        }

        // Sync Advance Balances
        if (!advanceBalances || Object.keys(advanceBalances).length === 0) {
            await sql`DELETE FROM bellad_advance_balances`;
        } else {
            for (const [empId, balance] of Object.entries(advanceBalances)) {
                await sql`INSERT INTO bellad_advance_balances (empId, balance) 
                          VALUES (${empId}, ${balance})
                          ON CONFLICT (empId) DO UPDATE SET balance = EXCLUDED.balance`;
            }
        }

        // Sync Advance History
        if (!advanceHistory || advanceHistory.length === 0) {
            await sql`DELETE FROM bellad_advance_history`;
        } else {
            await sql`DELETE FROM bellad_advance_history`;
            for (const record of advanceHistory) {
                await sql`INSERT INTO bellad_advance_history (empId, amount, date) VALUES (${record.empId}, ${record.amount}, ${record.date})`;
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
        await sql`INSERT INTO bellad_attendance (date, employee_id, status) 
                  VALUES (${date}, ${empId}, ${status})
                  ON CONFLICT (date, employee_id) DO UPDATE SET status = EXCLUDED.status`;
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
})); // Serve index.html, script.js, styles.css
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access this server on your mobile at your computer's IP address (e.g., http://192.168.x.x:${PORT})`);
});
