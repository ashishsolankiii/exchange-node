import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { decryptTransactionCode } from "../../lib/io-guards/transaction-code.js";
import Bet, { BET_RESULT_STATUS } from "../../models/v1/Bet.js";
import User from "../../models/v1/User.js";

const settlement = async ({ ...reqBody }) => {
  try {
    const { settlementData, loginUserId, transactionCode } = reqBody;

    let findLoginUser = await User.findOne({ _id: loginUserId });
    const loginUsertransactionCode = decryptTransactionCode(findLoginUser.transactionCode);

    if (transactionCode == loginUsertransactionCode) {
      for (var i = 0; i < settlementData.length; i++) {
        let findUser = await User.findOne({ _id: settlementData[i].userId });
        let findParentUser = await User.findOne({ _id: findUser.parentId });

        if (findUser) {
          if (findUser.userPl >= 0) {
            findParentUser.downPoint = findParentUser.downPoint + Number(settlementData[i].amount) * -1;
            await findParentUser.save();
            findUser.userPl = Number(findUser.userPl) - Number(settlementData[i].amount);
            findUser.balance = Number(findUser.balance) - Number(settlementData[i].amount);
            findUser.upPoint = findUser.upPoint + Number(settlementData[i].amount);
            await findUser.save();
          } else {
            findParentUser.downPoint = findParentUser.downPoint + settlementData[i].amount;
            await findParentUser.save();
            findUser.userPl = Number(findUser.userPl) + Number(settlementData[i].amount);
            findUser.balance = Number(findUser.balance) + Number(settlementData[i].amount);
            findUser.upPoint = findUser.upPoint + Number(settlementData[i].amount) * -1;
            await findUser.save();
          }
        } else {
          throw new ErrorResponse("User not found.").status(200);
        }
      }
    } else {
      throw new ErrorResponse("Invalid transaction code.").status(200);
    }

    return settlementData.map(function (item) {
      return item;
    });
  } catch (e) {
    throw new Error(e);
  }
};

const getChildUserData = async ({ userId, filterUserId }) => {
  try {
    // Filters
    const filters = {
      isDeleted: false,
      isActive: true,
      parentId: new mongoose.Types.ObjectId(userId),
      userPl: { $ne: 0 },
    };

    //If filterUserId has value then add in filter
    if (filterUserId) {
      filters._id = new mongoose.Types.ObjectId(filterUserId);
    }

    //Get all users
    const users = await User.aggregate([
      {
        $match: filters,
      },
      {
        $unset: ["__v", "password"],
      },
      {
        $project: {
          username: 1,
          fullName: 1,
          role: 1,
          creditPoints: { $ifNull: ["$creditPoints", 0] },
          balance: { $ifNull: ["$balance", 0] },
          userPl: { $ifNull: ["$userPl", 0] },
          exposure: { $ifNull: ["$exposure", 0] },
        },
      },
    ]);

    //Add new attribute points = creditPoints +userPl
    users.forEach((user) => {
      user.points = user.creditPoints + user.userPl;
    });

    return users;
  } catch (e) {
    throw new Error(e);
  }
};

const getCompleteBetEventWise = async ({ ...reqBody }) => {
  try {
    const { loginUserId, eventId } = reqBody;
    let filters = {
      userId: new mongoose.Types.ObjectId(loginUserId),
      eventId: new mongoose.Types.ObjectId(eventId),
    };
    let findEventBets = await Bet.aggregate([
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
          pipeline: [{ $project: { name: 1, startDate: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$market",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          marketName: "$market.name",
        },
      },
      {
        $match: filters,
      },
      {
        $unset: ["market"],
      },
      {
        $group: {
          _id: "$marketId",
          pl: {
            $sum: {
              $cond: {
                if: { $eq: ["$betResultStatus", BET_RESULT_STATUS.WON] },
                then: "$potentialWin",
                else: "$potentialLoss",
              },
            },
          },
          marketName: { $first: "$marketName" },
        },
      },
      { $sort: { marketName: -1 } },
    ]);

    return findEventBets;
  } catch (e) {
    throw new Error(e);
  }
};

export default {
  settlement,
  getChildUserData,
  getCompleteBetEventWise,
};
