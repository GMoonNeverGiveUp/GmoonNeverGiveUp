// Load environment variables
import 'dotenv/config';
import "./init/envGuard"; 
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import { PORT } from './config';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import memeRoutes from './routes/memeRoutes';
import errorHandler from './middleware/errorHandler';

// Initialize Prisma client and export for controllers
export const prisma = new PrismaClient();

// Create Express app
const app = express();

// Health check endpoint
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    message: '🚀 NGU MemeForge API is running'
  });
});

// Middleware
app.use(cors());
app.use(express.json());

// Register API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/memes', memeRoutes);

// Global error handler (last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`⚡️ Server listening on port ${PORT}`);
});
