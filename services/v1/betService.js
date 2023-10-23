import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { decryptTransactionCode } from "../../lib/io-guards/transaction-code.js";
import Bet, { BET_RESULT_STATUS } from "../../models/v1/Bet.js";
import User from "../../models/v1/User.js";
import betPlService from "./bet/betPlService.js";
import { BET_CATEGORIES } from "../../models/v1/BetCategory.js";

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

const fetchRunAmount = async ({ ...reqBody }) => {
  try {
    const { loginUserId, marketRunnerId } = reqBody;
    let findBet = await Bet.find({ userId: loginUserId, runnerId: marketRunnerId, betResultStatus: BET_RESULT_STATUS.RUNNING }).sort({ runnerScore: 1 });
    let runArray = [];
    if (findBet.length > 0) {
      const findFirst = findBet[0].runnerScore - 1;
      const findLast = findBet[findBet.length - 1].runnerScore;
      const getAllNumber = Array(findLast - findFirst + 1).fill().map((_, idx) => runArray.push({ run: findFirst + idx, amount: 0 }))
      for (var i = 0; i < findBet.length; i++) {
        for (var j = 0; j < runArray.length; j++) {
          if (findBet[i].isBack == true) {
            if (runArray[j].run >= findBet[i].runnerScore) {
              runArray[j].amount = runArray[j].amount + findBet[i].stake;
            }
            else {
              runArray[j].amount = runArray[j].amount - findBet[i].stake;
            }
          }
          else {
            if (runArray[j].run < findBet[i].runnerScore) {
              runArray[j].amount = runArray[j].amount + findBet[i].stake;
            }
            else {
              runArray[j].amount = runArray[j].amount - findBet[i].stake;
            }
          }
        }
      }
    }
    return runArray;

  } catch (e) {
    throw new Error(e);
  }
};

const fetchUserExposureList = async ({ ...reqBody }) => {
  try {
    const { loginUserId } = reqBody;
    let findBets = await Bet.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(loginUserId),
          betResultStatus: BET_RESULT_STATUS.RUNNING
        },
      },
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
          pipeline: [{ $project: { name: 1, startDate: 1, typeId: 1 } }, {
            $lookup: {
              from: "bet_categories",
              localField: "typeId",
              foreignField: "_id",
              as: "bet_category",
              pipeline: [
                {
                  $project: { name: 1 },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$bet_category",
              preserveNullAndEmptyArrays: true,
            },
          },],
        },
      },
      {
        $unwind: {
          path: "$market",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "events",
          localField: "eventId",
          foreignField: "_id",
          as: "event",
          pipeline: [{ $project: { name: 1, startDate: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$event",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          marketName: "$market.name",
          eventName: "$event.name",
          betCategoryName: "$market.bet_category.name",
        },
      },
      {
        $unset: ["market", "event"],
      },
      {
        $group: {
          _id: { eventId: "$eventId", marketId: "$marketId" }, marketName: { $first: '$marketName' }, eventName: { $first: '$eventName' }, betCategoryName: { $first: '$betCategoryName' }, createdAt: { $first: '$createdAt' },
        },
      },
      { $sort: { createdAt: 1 } },
    ]);

    let finalExposureList = [];
    for (var i = 0; i < findBets.length; i++) {
      let marketId = findBets[i]._id.marketId;
      let findEventId = finalExposureList.filter(
        function (item, index) {
          item.index = index;
          return item.eventId.toString() == findBets[i]._id.eventId.toString();
        });

      if (findEventId.length > 0) {
        if (findBets[i].betCategoryName == BET_CATEGORIES.FANCY) {
          let getRunnerPl = await betPlService.fetchRunningSingleRunnerOddPl({ userId: loginUserId, marketId })
          finalExposureList[finalExposureList[0].index].exposure = finalExposureList[finalExposureList[0].index].exposure + getRunnerPl;
        }
        else {
          let getRunnerPl = await betPlService.fetchRunningMultiRunnerOddPl({ userId: loginUserId, marketId })
          let exposure = 0;
          let totalExposure = getRunnerPl.map(function (item) {
            exposure += item.pl
          })
          finalExposureList[finalExposureList[0].index].exposure = finalExposureList[finalExposureList[0].index].exposure + exposure;
        }
      }
      else {
        if (findBets[i].betCategoryName == BET_CATEGORIES.FANCY) {
          let getRunnerPl = await betPlService.fetchRunningSingleRunnerOddPl({ userId: loginUserId, marketId })
          finalExposureList.push({ eventId: findBets[i]._id.eventId, eventName: findBets[i].eventName, exposure: getRunnerPl })
        }
        else {
          let getRunnerPl = await betPlService.fetchRunningMultiRunnerOddPl({ userId: loginUserId, marketId })
          let exposure = 0;
          let totalExposure = getRunnerPl.map(function (item) {
            exposure += item.pl
          })
          finalExposureList.push({ eventId: findBets[i]._id.eventId, eventName: findBets[i].eventName, exposure: exposure })
        }

      }
    }
    return finalExposureList;

  } catch (e) {
    throw new Error(e);
  }
};

export default {
  settlement,
  getChildUserData,
  getCompleteBetEventWise,
  fetchRunAmount,
  fetchUserExposureList
};
