import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'supervisor', 'trainee', 'worker'], default: 'trainee' },
  employeeId: { type: String, unique: true, sparse: true },
  department: { type: String },
  phone: { type: String },
  workStartTime: { type: String }, // e.g., "09:00"
  workEndTime: { type: String }, // e.g., "17:00"
  status: { type: String, enum: ['Active', 'Suspended'], default: 'Active' },
  avatar: { type: String },
  punctualityStreak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  earlyBirdPoints: { type: Number, default: 0 },
  lastPunctualDate: { type: String },
  streakRank: { type: String, default: 'Spark' },
  earlyBirdMultiplier: { type: Number, default: 1.0 },
  totalEarlyCheckIns: { type: Number, default: 0 },
  totalOnTimeCheckIns: { type: Number, default: 0 },
  pushSubscriptions: { type: Array, default: [] },
  resetPasswordOtp: { type: String },
  resetPasswordExpires: { type: Date },
  resetPasswordToken: { type: String },
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
