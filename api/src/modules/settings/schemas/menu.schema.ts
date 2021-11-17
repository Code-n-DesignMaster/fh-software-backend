import { Schema } from 'mongoose';

export const MenuSchema = new Schema({
  title: { type: String, default: '', index: true },
  path: { type: String, default: '', index: true },
  internal: { type: Boolean, default: false },
  parentId: { type: Schema.Types.ObjectId, index: true },
  help: { type: String, default: '' },
  section: { type: String, default: '', enum: ['main', 'header', 'footer'] },
  public: { type: Boolean, default: false },
  isPage: { type: Boolean, default: false },
  ordering: { type: Number, default: 0 },
  isNewTab: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
