import { Types } from "mongoose";
import { Team } from "../models/Team.js";
import { Project } from "../models/Project.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ok, paginate, searchRegex } from "../utils/http.js";
import { USER_REF_FIELDS } from "../utils/serialize.js";
import { overdueCounts } from "../services/progress.js";
import { toTeamProgressRow } from "../services/serializers.js";

const SORTS = {
  progress_desc: { progress: -1, name: 1 },
  progress_asc: { progress: 1, name: 1 },
  name: { name: 1 },
  recent: { createdAt: -1 },
};

/**
 * Team progress board. Admins see every team (including teams that have not
 * proposed a project yet); faculty see only the teams they guide. Sorted and
 * paginated in MongoDB using the denormalized project progress.
 */
export const teamsProgress = asyncHandler(async (req, res) => {
  const { page, limit, search, department, status, sort } = req.query;
  const isFaculty = req.user.role === "faculty";

  const pipeline = [];
  const teamMatch = {};
  if (search) teamMatch.name = searchRegex(search);
  if (department) teamMatch.department = new Types.ObjectId(department);
  if (Object.keys(teamMatch).length) pipeline.push({ $match: teamMatch });

  pipeline.push(
    {
      $lookup: {
        from: Project.collection.name,
        localField: "_id",
        foreignField: "team",
        as: "project",
        pipeline: [{ $project: { status: 1, progress: 1, faculty: 1 } }],
      },
    },
    { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } }
  );
  const projectMatch = {};
  if (isFaculty) {
    projectMatch["project.faculty"] = new Types.ObjectId(req.user.id);
    projectMatch["project.status"] = { $ne: "draft" };
  }
  if (status) projectMatch["project.status"] = status;
  if (Object.keys(projectMatch).length) pipeline.push({ $match: projectMatch });

  pipeline.push(
    { $addFields: { progress: { $ifNull: ["$project.progress", -1] } } },
    { $sort: SORTS[sort] ?? SORTS.progress_desc },
    { $facet: { rows: [{ $skip: (page - 1) * limit }, { $limit: limit }, { $project: { _id: 1 } }], total: [{ $count: "n" }] } }
  );

  const [result] = await Team.aggregate(pipeline);
  const ids = result.rows.map((r) => r._id);
  const total = result.total[0]?.n ?? 0;

  const [teams, projects] = await Promise.all([
    Team.find({ _id: { $in: ids } })
      .populate("members", USER_REF_FIELDS)
      .populate("department", "name code")
      .lean(),
    Project.find({ team: { $in: ids } })
      .populate("faculty", USER_REF_FIELDS)
      .lean(),
  ]);
  const overdue = await overdueCounts(projects.map((p) => p._id));
  const teamById = new Map(teams.map((t) => [t._id.toString(), t]));
  const projectByTeam = new Map(projects.map((p) => [p.team.toString(), p]));

  const rows = ids
    .map((id) => {
      const team = teamById.get(id.toString());
      if (!team) return null;
      const project = projectByTeam.get(id.toString()) ?? null;
      return toTeamProgressRow(team, project, project ? (overdue.get(project._id.toString()) ?? 0) : undefined);
    })
    .filter(Boolean);

  ok(res, rows, { pagination: paginate(page, limit, total) });
});
