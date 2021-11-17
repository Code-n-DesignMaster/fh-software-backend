import { ObjectId } from 'mongodb';
import { Schema } from 'mongoose';

const schema = new Schema({
  // private, group chat, etc..?
  type: {
    type: String,
    index: true
  },
  name: String,
  lastMessage: String,
  lastSenderId: Schema.Types.ObjectId,
  lastMessageCreatedAt: Date,
  recipients: [{
    _id: false,
    source: String,
    sourceId: Schema.Types.ObjectId
  }],
  meta: Schema.Types.Mixed,
  streamId: ObjectId,
  performerId: ObjectId,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

schema.index({ recipients: 1 });

export const ConversationSchema = schema;
