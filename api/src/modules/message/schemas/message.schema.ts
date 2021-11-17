import { Schema } from 'mongoose';

export const MessageSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  // text, file, etc...
  type: {
    type: String,
    default: 'text',
    index: true
  },
  fileId: Schema.Types.ObjectId,
  mediaId: Schema.Types.ObjectId,
  text: String,
  videoFileId: Schema.Types.ObjectId,
  senderSource: String,
  senderId: Schema.Types.ObjectId,
  meta: Schema.Types.Mixed,
  tipAmount: Number,
  mimeType: String,
  isTipOption: Boolean,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
