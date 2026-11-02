import mongoose, { Schema } from "mongoose";

const departmentSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, maxlength: 120 },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true, maxlength: 10 },
    description: { type: String, default: "", maxlength: 500 },
  },
  { timestamps: true }
);

departmentSchema.set("toJSON", {
  transform(_doc, ret) {
    ret.id = ret._id?.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Department = mongoose.model("Department", departmentSchema);
