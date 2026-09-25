const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_kNS3liz6EgKq@ep-weathered-hill-b55m67c1-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require');

async function setup() {
    try {
        console.log('Creating tables...');
        
        await sql`
            CREATE TABLE IF NOT EXISTS bellad_employees (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                initial VARCHAR(10),
                bg VARCHAR(50),
                role VARCHAR(100),
                salaryType VARCHAR(50),
                salaryAmount NUMERIC
            )
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS bellad_attendance (
                date VARCHAR(20),
                employee_id VARCHAR(50),
                status VARCHAR(50),
                PRIMARY KEY (date, employee_id)
            )
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS bellad_advance_history (
                id SERIAL PRIMARY KEY,
                empId VARCHAR(50),
                amount NUMERIC,
                date VARCHAR(50)
            )
        `;

        await sql`
            CREATE TABLE IF NOT EXISTS bellad_advance_balances (
                empId VARCHAR(50) PRIMARY KEY,
                balance NUMERIC
            )
        `;

        console.log('Tables created successfully.');
    } catch (err) {
        console.error('Error creating tables:', err);
    }
}

setup();
