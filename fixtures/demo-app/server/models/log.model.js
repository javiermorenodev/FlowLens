import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  level: String,
  message: String,
  createdAt: { type: Date, default: Date.now },
});

export const Log = mongoose.model('Log', logSchema);
