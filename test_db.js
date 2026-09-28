const { neon } = require('@neondatabase/serverless');

const sql = neon('postgresql://neondb_owner:npg_kNS3liz6EgKq@ep-weathered-hill-b55m67c1-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require');

async function test() {
    const employees = await sql`SELECT * FROM bellad_employees`;
    console.log('Employees:', employees);
    const attendance = await sql`SELECT * FROM bellad_attendance`;
    console.log('Attendance:', attendance);
}

test();
