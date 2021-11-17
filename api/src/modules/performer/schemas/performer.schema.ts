import * as mongoose from 'mongoose';

const performerSchema = new mongoose.Schema({
  name: String,
  firstName: String,
  lastName: String,
  username: {
    type: String,
    index: true,
    lowercase: true,
    unique: true,
    trim: true,
    // uniq if not null
    sparse: true
  },
  email: {
    type: String,
    index: true,
    unique: true,
    lowercase: true,
    trim: true,
    // uniq if not null
    sparse: true
  },
  status: {
    type: String,
    index: true
  },
  phone: {
    type: String
  },
  phoneCode: String, // international code prefix
  avatarId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  avatarPath: String,
  coverId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  coverPath: String,
  idVerificationId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  documentVerificationId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  welcomeVideoId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  welcomeVideoPath: {
    type: String
  },
  activateWelcomeVideo: {
    type: Boolean,
    default: false
  },
  verifiedEmail: {
    type: Boolean,
    default: false
  },
  gender: {
    type: String
  },
  country: {
    type: String
  },
  city: String,
  state: String,
  zipcode: String,
  address: String,
  languages: [
    {
      type: String
    }
  ],
  studioId: mongoose.Schema.Types.ObjectId,
  categoryIds: [
    {
      type: mongoose.Schema.Types.ObjectId
    }
  ],
  schedule: {
    type: mongoose.Schema.Types.Mixed
  },
  timezone: String,
  noteForUser: String,
  height: String,
  weight: String,
  bio: String,
  eyes: String,
  sexualPreference: String,
  monthlyPrice: {
    type: Number,
    default: 5
  },
  yearlyPrice: {
    type: Number,
    default: 25
  },
  stats: {
    likes: {
      type: Number,
      default: 0
    },
    subscribers: {
      type: Number,
      default: 0
    },
    views: {
      type: Number,
      default: 0
    },
    totalVideos: {
      type: Number,
      default: 0
    },
    totalPhotos: {
      type: Number,
      default: 0
    },
    totalGalleries: {
      type: Number,
      default: 0
    },
    totalProducts: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  score: {
    type: Number,
    default: 0,
    index: true
  },
  isOnline: {
    type: Number,
    default: 0
  },
  onlineAt: {
    type: Date
  },
  offlineAt: {
    type: Date
  },
  age: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  storeSwitch: {
    type: Number,
    default: 0
  },
  subsribeSwitch: {
    type: Number,
    default: 1
  },
  freeSubsribeSwitch: {
    type: Number,
    default: 0
  },
  feature: {
    type: Number,
    default: 0
  },
  enableChat: {
    type: Number,
    default: 0
  },
  enableWelcomeMessage: {
    type: Number,
    default: 0
  },
  welcomeImgPath:{
    type: String
  },
  welcomeMessage: {
    type: String
  },
  tipAmount: {
    type: Number,
    default: 3
  },
  welcomeImgfileId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  welcomeMessageVideoPath:{
    type: String
  },
  welcomeMessageVideoId: {
    type: mongoose.Schema.Types.ObjectId,
    index: true
  },
  welcomeMessageMimeType: {
    type: String
  },
  quote: {
    type: String
  }
});

performerSchema.pre<any>('updateOne', async function preUpdateOne(next) {
  const model = await this.model.findOne(this.getQuery());
  const { stats } = model;
  if (!stats) {
    return next();
  }
  const score = (stats.subscribers || 0) * 3 + (stats.likes || 0) * 2 + (stats.views || 0);
  model.score = score || 0;
  await model.save();
  return next();
});

export const PerformerSchema = performerSchema;
