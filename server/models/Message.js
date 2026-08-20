import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isBroadcast: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    required: false
  },
  read: { type: Boolean, default: false },
  mediaUrl: {
    type: String,
    default: null
  }
}, { timestamps: true });

export default mongoose.model('Message', messageSchema);
