import mongoose from "mongoose";
import User, { USER_ROLE } from "../../models/v1/User.js";
import LoggedInUser from "../../models/v1/LoggedInUser.js";
// Fetch all Dashboard from the database
const fetchDashboardId = async (_id) => {
  try {
    const result = await User.aggregate([
      {
        $match: { _id: new mongoose.Types.ObjectId(_id) },
      },
      {
        $graphLookup: {
          from: "users",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "parentId",
          as: "descendants",
          maxDepth: 10,
        },
      },
      {
        $unwind: { path: "$descendants", preserveNullAndEmptyArrays: true },
      },
      {
        $group: {
          _id: null,
          creditPoints: { $first: "$creditPoints" },
          balance: { $first: "$balance" },
          totalPoint: { $sum: "$descendants.balance" },
          totalExposure: { $sum: "$descendants.exposure" },
          role: { $first: "$role" },
        },
      },
      {
        $project: {
          _id: 0,
          balance: 1,
          creditPoints: 1,
          totalPoint: 1,
          totalExposure: 1,
          AllPts: { $sum: ["$balance", "$totalPoint"] },
          upPoint: { $ifNull: ["$upPoint", 0] },
          downPoint: { $ifNull: ["$downPoint", 0] },
          role: 1
        },
      },
      {
        $project: {
          balance: 1,
          creditPoints: 1,
          totalPoint: 1,
          totalExposure: 1,
          AllPts: 1,
          settlementPoint: { $subtract: ["$AllPts", "$creditPoints"] },
          upPoint: 1,
          downPoint: 1,
          role: 1
        },
      },
    ]);
    if (result.length > 0) {
      if (result[0].role == USER_ROLE.SYSTEM_OWNER) {
        const fiveHoursAgo = new Date();
        fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);
        const deleteLoggedInUser = await LoggedInUser.deleteMany({ createdAt: { $lt: new Date(fiveHoursAgo) } });
        const totalLoggedInUser = await LoggedInUser.count();
        result[0].totalLoggedInUser = totalLoggedInUser;
      }
      else {
        result[0].totalLoggedInUser = 0;
      }
    }
    return {
      result,
    };
  } catch (e) {
    throw new Error(e);
  }
};
export default {
  fetchDashboardId,
};
