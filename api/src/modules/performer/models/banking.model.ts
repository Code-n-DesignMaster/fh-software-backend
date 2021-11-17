import { Document } from 'mongoose';
import { ObjectId } from 'mongodb';
export class BankingModel extends Document {
  firstName?: string;
  lastName?: string;
  SSN?: string;
  bankName?: string;
  bankAccount?: string;
  bankRouting?: string;
  bankSwiftCode?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  bankManageSwitch?: boolean;
  managePercentageFee?: number;
  agentBankName?: string;
  agentBankAccount?: string;
  agentBankRouting?: string;
  agentBankSwiftCode?: string;
  agentFirstName?: string;
  agentlastName?: string;
  agentSSN?: string;
  agentAddress?: string;
  agentCity?: string;
  agentState?: string;
  agentCountry?: string;
  performerId: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
