import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Disable buffering so Mongoose throws immediately when disconnected rather than hanging for 10s
mongoose.set('bufferCommands', false);

const connectDB = async () => {
  if (!process.env.MONGODB_URI || (!process.env.MONGODB_URI.startsWith('mongodb://') && !process.env.MONGODB_URI.startsWith('mongodb+srv://'))) {
    console.warn('⚠️ MONGODB_URI is not valid (must start with mongodb:// or mongodb+srv://). Falling back to in-memory store.');
    return false;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds instead of buffering
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Dynamic import to prevent circular dependency
    const { default: User } = await import('./models/User.js');
    const { default: Location } = await import('./models/Location.js');

    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('🌱 Database is empty. Ready for live user registration.');
    }

    const locCount = await Location.countDocuments();
    if (locCount === 0) {
      console.log('🌱 Seeding default office location...');
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
      console.log('✅ Default location seeded successfully.');
    }

    return true;
  } catch (error) {
    console.error(`⚠️ MongoDB Connection Error: ${error.message}. App will use in-memory store as fallback.`);
    return false;
  }
};

export const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

export default connectDB;
