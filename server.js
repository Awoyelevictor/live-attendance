import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import connectDB, { getDbStatus } from './server/db.js';
import authRoutes from './server/routes/auth.js';
import adminRoutes from './server/routes/admin.js';
import workerRoutes from './server/routes/worker.js';
import messagesRoutes from './server/routes/messages.js';
import notificationsRoutes from './server/routes/notifications.js';
import { startReminderJob } from './server/services/reminders.js';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

// Load env vars
dotenv.config();

async function startServer() {
  // Connect to MongoDB Atlas
  await connectDB();

  // Start background jobs
  startReminderJob();

  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Health check endpoint for cloud platforms & deployment monitors
  app.get('/api/health', (req, res) => {
    const dbStatus = getDbStatus();
    res.status(200).json({ 
      status: 'ok', 
      uptime: process.uptime(), 
      timestamp: new Date().toISOString(),
      database: dbStatus
    });
  });

  // Direct source code download endpoint
  app.get('/api/download-zip', (req, res) => {
    try {
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      res.attachment('attendance-management-system.zip');
      archive.pipe(res);

      // Append all workspace files, ignoring node_modules, dist, .git
      archive.glob('**/*', {
        cwd: process.cwd(),
        ignore: ['node_modules/**', 'dist/**', '.git/**', '.next/**', '.turbo/**', '*.log']
      });

      archive.finalize();
    } catch (err) {
      console.error('Failed to generate zip:', err);
      res.status(500).send('Error creating ZIP archive: ' + err.message);
    }
  });

  // Socket.io connection logic
  const onlineUsers = new Map(); // socket.id -> userId
  app.set("onlineUsers", onlineUsers);

  io.on('connection', (socket) => {
    socket.on('user_connected', (userId) => {
      onlineUsers.set(socket.id, userId);
      // Join a personal room to receive private messages & typing events easily
      socket.join(userId);
      // Broadcast updated online users list
      io.emit('online_users', Array.from(new Set(onlineUsers.values())));
    });

    socket.on('typing', ({ senderId, receiverId }) => {
      if (receiverId) {
        socket.to(receiverId).emit('user_typing', senderId);
      }
    });

    socket.on('stop_typing', ({ senderId, receiverId }) => {
      if (receiverId) {
        socket.to(receiverId).emit('user_stopped_typing', senderId);
      }
    });

    // Handle incoming messages for real-time delivery
    socket.on('send_message', (message) => {
      if (message.isBroadcast) {
        // Broadcast to everyone
        io.emit('receive_message', message);
      } else if (message.receiver) {
        // Send to specific user and the sender themselves (for multi-device sync)
        io.to(message.receiver).emit('receive_message', message);
      }
    });

    socket.on('mark_read', ({ senderId, receiverId }) => {
      if (senderId) {
        socket.to(senderId).emit('messages_read', receiverId);
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.id);
      io.emit('online_users', Array.from(new Set(onlineUsers.values())));
    });
  });

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/worker', workerRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/notifications', notificationsRoutes);

  // Catch unhandled /api calls before Vite SPA fallback
  app.all('/api/*', (req, res) => {
    res.status(404).json({ message: `API endpoint ${req.method} ${req.originalUrl} not found` });
  });

  // Global Express error handler
  app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      message: err.message || 'Internal Server Error'
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
