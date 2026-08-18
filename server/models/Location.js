import mongoose from 'mongoose';

const locationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  radius: { type: Number, default: 100 }, // meters
  clockInTime: { type: String, required: true },
  gracePeriod: { type: Number, default: 15 }, // minutes
  clockOutTime: { type: String, default: '17:00' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' }
}, { timestamps: true });

const Location = mongoose.model('Location', locationSchema);
export default Location;
