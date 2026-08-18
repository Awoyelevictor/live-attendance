import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

let isConnecting = false;
let reconnectTimer = null;

// Track connection state events
mongoose.connection.on('connected', () => {
  const host = mongoose.connection.host || 'Atlas Cluster';
  const dbName = mongoose.connection.name || 'default';
  console.log(`✅ [MongoDB Atlas] Connected successfully to host: ${host} | Database: ${dbName}`);
});

mongoose.connection.on('error', (err) => {
  console.error(`❌ [MongoDB Atlas] Connection error:`, err.message);
});

mongoose.connection.on('disconnected', () => {
  console.warn(`⚠️ [MongoDB Atlas] Disconnected from database. Attempting auto-reconnect...`);
  scheduleReconnect();
});

mongoose.connection.on('reconnected', () => {
  console.log(`🔄 [MongoDB Atlas] Successfully reconnected to cluster.`);
});

function scheduleReconnect() {
  if (reconnectTimer || !process.env.MONGODB_URI) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    if (mongoose.connection.readyState !== 1 && !isConnecting) {
      console.log('🔄 [MongoDB Atlas] Retrying connection...');
      await connectDB();
    }
  }, 5000);
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri || (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://'))) {
    console.warn('⚠️ [MongoDB] MONGODB_URI is not set or invalid (must start with mongodb:// or mongodb+srv://). Using in-memory fallback for local preview.');
    return false;
  }

  if (mongoose.connection.readyState === 1) {
    return true;
  }

  if (isConnecting) {
    return false;
  }

  isConnecting = true;

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000, // 15s timeout for reliable DNS resolution with Atlas SRV
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      autoIndex: true
    });

    isConnecting = false;
    console.log(`✅ [MongoDB Atlas Cluster 0] Active connection established: ${conn.connection.host} / ${conn.connection.name}`);

    // Dynamic import models to seed default office location if none exists
    const { default: Location } = await import('./models/Location.js');
    const locCount = await Location.countDocuments();
    if (locCount === 0) {
      console.log('🌱 [MongoDB Atlas] Initializing default office location...');
      await Location.create({
        name: 'HQ Tech Park',
        address: '100 Innovation Way, Silicon Valley',
        lat: 37.7749,
        lng: -122.4194,
        radius: 50000,
        clockInTime: '09:00',
        gracePeriod: 15,
        clockOutTime: '17:00',
        status: 'Active'
      });
      console.log('✅ [MongoDB Atlas] Default office location created.');
    }

    // Seed default admin account
    const { default: User } = await import('./models/User.js');
    const adminExists = await User.findOne({ email: 'admin@example.com' });
    if (!adminExists) {
      console.log('🌱 [MongoDB Atlas] Initializing default admin account...');
      await User.create({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'admin123', // hook will hash it automatically
        role: 'admin',
        employeeId: 'ADM-001',
        department: 'Management'
      });
      console.log('✅ [MongoDB Atlas] Default admin account created (admin@example.com / admin123).');
    }

    return true;
  } catch (error) {
    isConnecting = false;
    console.error(`⚠️ [MongoDB Atlas] Connection attempt failed: ${error.message}`);
    scheduleReconnect();
    return false;
  }
};

export const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export const getDbStatus = () => {
  const states = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const state = states[mongoose.connection.readyState] || 'Unknown';
  return {
    connected: mongoose.connection.readyState === 1,
    state,
    host: mongoose.connection.host || null,
    databaseName: mongoose.connection.name || null
  };
};

export default connectDB;
