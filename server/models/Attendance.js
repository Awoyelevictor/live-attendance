import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: String, required: true }, // YYYY-MM-DD
  checkInTime: { type: String },
  checkOutTime: { type: String },
  location: { type: String },
  coordinates: {
    lat: Number,
    lng: Number
  },
  distance: { type: Number }, // in meters from office
  status: { type: String, enum: ['present', 'late', 'absent'], default: 'present' },
  os: { type: String },
  browser: { type: String },
  adminNotes: { type: String }
}, { timestamps: true });

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
