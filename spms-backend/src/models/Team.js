import mongoose, { Schema } from "mongoose";

const teamSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    joinCode: { type: String, required: true, unique: true, uppercase: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      validate: {
        validator: (v) => v.length >= 1,
        message: "A team needs at least one member.",
      },
    },
    leader: { type: Schema.Types.ObjectId, ref: "User", required: true },
    maxMembers: { type: Number, required: true, min: 1, max: 20 },
  },
  { timestamps: true }
);

// A unique multikey index means a student id can appear in at most one team
// document — the database itself rejects duplicate team membership.
teamSchema.index({ members: 1 }, { unique: true });
teamSchema.index({ department: 1, name: 1 });

export const Team = mongoose.model("Team", teamSchema);
