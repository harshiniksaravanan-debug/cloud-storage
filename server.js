require('dotenv').config();
const express = require('express');
const path = require('path');
const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'Cloud Storage API', version: '1.0.0' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
