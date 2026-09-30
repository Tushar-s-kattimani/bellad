require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || '';
if (MONGO_URI) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('Connected to MongoDB Atlas'))
        .catch(err => console.error('MongoDB connection error:', err));
} else {
    console.warn('Warning: MONGO_URI is not defined in .env file');
}

// Mongoose Schema for User Data
const userDataSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    employeesList: { type: Array, default: [] },
    bulkAttendance: { type: Object, default: {} },
    advanceBalances: { type: Object, default: {} },
    advanceHistory: { type: Array, default: [] },
});

const UserData = mongoose.model('UserData', userDataSchema);

// API Routes
app.get('/api/data/:email', async (req, res) => {
    try {
        const email = req.params.email;
        let data = await UserData.findOne({ email });
        
        if (!data) {
            // Return default empty state if not found
            data = {
                employeesList: [],
                bulkAttendance: {},
                advanceBalances: {},
                advanceHistory: []
            };
        }
        res.json(data);
    } catch (error) {
        console.error('Error fetching data:', error);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
});

app.post('/api/data/:email', async (req, res) => {
    try {
        const email = req.params.email;
        const { employeesList, bulkAttendance, advanceBalances, advanceHistory } = req.body;
        
        const data = await UserData.findOneAndUpdate(
            { email },
            { 
                email,
                employeesList,
                bulkAttendance,
                advanceBalances,
                advanceHistory
            },
            { new: true, upsert: true }
        );
        
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error saving data:', error);
        res.status(500).json({ error: 'Failed to save data' });
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
