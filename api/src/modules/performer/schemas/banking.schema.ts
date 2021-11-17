import { Schema } from 'mongoose';

export const BankingSettingSchema = new Schema({
  performerId: {
    type: Schema.Types.ObjectId,
    index: true
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  SSN: {
    type: String
  },
  bankName: {
    type: String
  },
  bankAccount: {
    type: String
  },
  bankRouting: {
    type: String
  },
  bankSwiftCode: {
    type: String
  },
  address: {
    type: String
  },
  city: {
    type: String
  },
  state: {
    type: String
  },
  country: {
    type: String
  },
  bankManageSwitch: {
    type: Boolean,
    default: false
  },
  managePercentageFee: {
    type: Number,
    default: 10
  },
  agentBankName: {
    type: String
  },
  agentBankAccount: {
    type: String
  },
  agentBankRouting: {
    type: String
  },
  agentBankSwiftCode: {
    type: String
  },
  agentFirstName: {
    type: String
  },
  agentlastName: {
    type: String
  },
  agentSSN: {
    type: String
  },
  agentAddress: {
    type: String
  },
  agentCity: {
    type: String
  },
  agentState: {
    type: String
  },
  agentCountry: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});
