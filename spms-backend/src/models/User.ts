import mongoose, { Schema, Types, HydratedDocument } from "mongoose";
import bcrypt from "bcryptjs";
import { ROLES, type Role } from "@edutrack/shared";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  usn?: string;
  department?: Types.ObjectId | null;
  isActive: boolean;
  tokenVersion: number;
  lastLoginAt?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpires?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
  setPassword(plain: string): Promise<void>;
}

export type UserDoc = HydratedDocument<IUser, IUserMethods>;
type UserModel = mongoose.Model<IUser, object, IUserMethods>;

export const BCRYPT_ROUNDS = process.env.NODE_ENV === "test" ? 4 : 12;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 160 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, required: true, default: "student" },
    usn: { type: String, trim: true, maxlength: 40 },
    department: { type: Schema.Types.ObjectId, ref: "Department", default: null },
    isActive: { type: Boolean, default: true },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1, department: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ name: 1 });
// Student IDs (USN) must be unique when present.
userSchema.index({ usn: 1 }, { unique: true, partialFilterExpression: { usn: { $type: "string", $gt: "" } } });

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.setPassword = async function (plain: string) {
  this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
};

userSchema.set("toJSON", {
  transform(_doc, ret: any) {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.passwordHash;
    delete ret.passwordResetTokenHash;
    delete ret.passwordResetExpires;
    delete ret.tokenVersion;
    delete ret.__v;
    if (ret.department && ret.department._id) {
      ret.department = { id: ret.department._id.toString(), name: ret.department.name, code: ret.department.code };
    }
    return ret;
  },
});

export const User = mongoose.model<IUser, UserModel>("User", userSchema);
