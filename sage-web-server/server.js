import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import userRoutes from './routes/user.js';

const app = express();

// Config
const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
const ORIGIN = process.env.CORS_ORIGIN || '*';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sage_ai';

// Middleware
app.use(cors({ origin: ORIGIN }));
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('MongoDB connected successfully');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Routes
app.get('/', (req, res) => {
    res.json({ ok: true, service: 'product_page_backend', message: 'Server is running' });
});

// User routes
app.use('/api/users', userRoutes);

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start
app.listen(PORT, () => {
    console.log(`product_page_backend listening on port ${PORT}`);
});