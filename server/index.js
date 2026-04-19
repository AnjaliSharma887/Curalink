const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const researchRoutes = require('./routes/researchRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', researchRoutes);

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Curalink server is running!' });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.log('❌ MongoDB error:', err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});