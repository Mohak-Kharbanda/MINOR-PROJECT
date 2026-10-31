import mongoose, { Schema, Types } from "mongoose";

export interface ITeam {
  _id: Types.ObjectId;
  name: string;
  joinCode: string;
  department: Types.ObjectId;
  members: Types.ObjectId[];
  leader: Types.ObjectId;
  maxMembers: number;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    joinCode: { type: String, required: true, unique: true, uppercase: true },
    department: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    members: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      validate: {
        validator: (v: unknown[]) => v.length >= 1,
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

export const Team = mongoose.model<ITeam>("Team", teamSchema);
