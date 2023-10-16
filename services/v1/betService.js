import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import { decryptTransactionCode } from "../../lib/io-guards/transaction-code.js";
import Bet, { BET_ORDER_STATUS, BET_RESULT_STATUS } from "../../models/v1/Bet.js";
import BetCategory, { BET_CATEGORIES } from "../../models/v1/BetCategory.js";
import Event from "../../models/v1/Event.js";
import Market from "../../models/v1/Market.js";
import MarketRunner, { RUNNER_STATUS } from "../../models/v1/MarketRunner.js";
import User, { USER_ROLE } from "../../models/v1/User.js";

const fetchRunnerPls = async ({ user, ...reqBody }) => {
  try {
    const { eventId, marketId } = reqBody;

    const bets = await Bet.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          marketId: new mongoose.Types.ObjectId(marketId),
          userId: new mongoose.Types.ObjectId(user._id),
          betOrderStatus: BET_ORDER_STATUS.PLACED,
          betResultStatus: BET_RESULT_STATUS.RUNNING,
        },
      },
      { $sort: { createdAt: 1 } },
    ]);

    const marketRunners = await MarketRunner.find({ marketId: new mongoose.Types.ObjectId(marketId) });
    const runner1 = marketRunners[0]._id;
    const runner2 = marketRunners[1]._id;

    const runners = {
      [marketRunners[0]._id]: {
        _id: marketRunners[0]._id,
        marketId: marketRunners[0].marketId,
        runnerName: marketRunners[0].runnerName,
        pl: 0,
      },
      [marketRunners[1]._id]: {
        _id: marketRunners[1]._id,
        marketId: marketRunners[1].marketId,
        runnerName: marketRunners[1].runnerName,
        pl: 0,
      },
    };

    bets.forEach((bet) => {
      if (bet.isBack) {
        if (bet.runnerId.toString() === runner1.toString()) {
          runners[runner1].pl += bet.potentialWin;
          runners[runner2].pl += bet.potentialLoss;
        } else {
          runners[runner1].pl += bet.potentialLoss;
          runners[runner2].pl += bet.potentialWin;
        }
      } else {
        if (bet.runnerId.toString() === runner1.toString()) {
          runners[runner1].pl += bet.potentialLoss;
          runners[runner2].pl += bet.potentialWin;
        } else {
          runners[runner1].pl += bet.potentialWin;
          runners[runner2].pl += bet.potentialLoss;
        }
      }
    });

    return Object.values(runners);
  } catch (e) {
    throw new Error(e);
  }
};

const fetchRunnerPlsFancy = async ({ user, ...reqBody }) => {
  try {
    const { eventId, marketId } = reqBody;

    const bets = await Bet.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          marketId: new mongoose.Types.ObjectId(marketId),
          userId: new mongoose.Types.ObjectId(user._id),
          betOrderStatus: BET_ORDER_STATUS.PLACED,
          betResultStatus: BET_RESULT_STATUS.RUNNING,
        },
      },
      { $sort: { createdAt: 1 } },
    ]);

    const marketRunners = await MarketRunner.find({
      marketId: new mongoose.Types.ObjectId(marketId),
      status: { $ne: RUNNER_STATUS.IN_ACTIVE },
    });
    let runnerPls = [];
    for (const runner of marketRunners) {
      const findRunnerBets = bets.filter(function (item) {
        return item.runnerId.toString() == runner._id.toString();
      });
      let pl = 0;
      if (findRunnerBets.length > 0) {
        findRunnerBets.map(function (item) {
          if (item.isBack) {
            pl += item.potentialWin;
          } else {
            pl += item.potentialLoss;
          }
        });
      }
      runnerPls.push({
        _id: runner._id,
        marketId: runner.marketId,
        runnerName: runner.runnerName,
        pl: pl,
      });
    }
    return runnerPls;
  } catch (e) {
    throw new Error(e);
  }
};

async function updateUserPl(userId, profitLoss) {
  let findUser = await User.findOne({ _id: userId });
  if (findUser.role != USER_ROLE.SYSTEM_OWNER) {
    findUser.userPl = findUser.userPl + profitLoss;
    findUser.balance = findUser.balance + profitLoss;
    findUser.save();

    if (findUser.role != USER_ROLE.SUPER_ADMIN) {
      await updateUserPl(findUser.parentId, profitLoss);
    } else {
      return;
    }
  } else {
    return;
  }
}

const fetchUserEventBets = async ({ ...reqBody }) => {
  try {
    const { eventId, userId } = reqBody;

    const eventBets = await Bet.aggregate([
      {
        $match: {
          eventId: new mongoose.Types.ObjectId(eventId),
          userId: new mongoose.Types.ObjectId(userId),
          betResultStatus: BET_RESULT_STATUS.RUNNING,
        },
      },
      {
        $lookup: {
          from: "market_runners",
          localField: "runnerId",
          foreignField: "_id",
          as: "marketRunner",
          pipeline: [{ $project: { runnerName: 1 } }],
        },
      },
      { $unwind: "$marketRunner" },
      {
        $lookup: {
          from: "markets",
          localField: "marketId",
          foreignField: "_id",
          as: "market",
          pipeline: [
            { $project: { name: 1 } },
            {
              $sort: { name: 1 },
            },
          ],
        },
      },
      {
        $unwind: "$market",
      },
      {
        $group: {
          _id: "$market",
          bets: {
            $push: {
              _id: "$_id",
              runner: "$marketRunner.runnerName",
              stake: "$stake",
              odds: "$odds",
              isBack: "$isBack",
              createdAt: "$createdAt",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          market: "$_id",
          bets: 1,
        },
      },
      {
        $sort: { "bets.createdAt": -1 },
      },
    ]);

    return eventBets;
  } catch (e) {
    throw new Error(e);
  }
};

const completeBet = async ({ ...reqBody }) => {
  try {
    const { marketId, winRunnerId } = reqBody;

    let findMarket = await Market.findOne({ _id: marketId });
    if (
      findMarket.winnerRunnerId == undefined ||
      findMarket.winnerRunnerId == "" ||
      findMarket.winnerRunnerId == null
    ) {
      let findBet = await Bet.find({ marketId: marketId });

      let userids = findBet
        .reduce((prev, cur) => {
          const index = prev.findIndex((v) => v.userId.toString() === cur.userId.toString());
          if (index === -1) {
            prev.push(cur);
          }
          return prev;
        }, [])
        .map(function (item) {
          return item.userId;
        });

      for (var j = 0; j < userids.length; j++) {
        let user = { _id: userids[j] };
        let body = { marketId: marketId, eventId: findMarket.eventId };
        let pl = 0;
        let fetchRunnerPl = (await fetchRunnerPls({ user, ...body })).map(function (item) {
          if (item.pl < 0) {
            pl = item.pl;
            return item.pl;
          }
        });
        let findUser = await User.findOne({ _id: userids[j] });
        findUser.exposure = Number(findUser.exposure) + Number(pl);
        findUser.save();
      }
      for (var i = 0; i < findBet.length; i++) {
        let newFindBet = await Bet.findOne({
          userId: findBet[i].userId,
          marketId: findBet[i].marketId,
          _id: findBet[i]._id,
        });
        let profit = 0;
        let loss = 0;
        if (findBet[i].isBack == true) {
          if (winRunnerId == findBet[i].runnerId.toString()) {
            profit = findBet[i].potentialWin;
            newFindBet.betPl = profit;
            newFindBet.betResultStatus = BET_RESULT_STATUS.WON;
          } else {
            loss = findBet[i].potentialLoss;
            newFindBet.betPl = loss;
            newFindBet.betResultStatus = BET_RESULT_STATUS.LOST;
          }
        } else {
          if (winRunnerId.toString() != findBet[i].runnerId.toString()) {
            profit = findBet[i].potentialWin;
            newFindBet.betPl = profit;
            newFindBet.betResultStatus = BET_RESULT_STATUS.WON;
          } else {
            loss = findBet[i].potentialLoss;
            newFindBet.betPl = loss;
            newFindBet.betResultStatus = BET_RESULT_STATUS.LOST;
          }
        }
        await newFindBet.save();
        if (loss == 0) {
          await updateUserPl(findBet[i].userId, profit);
        } else {
          await updateUserPl(findBet[i].userId, loss);
        }
      }
      findMarket.winnerRunnerId = winRunnerId;
      findMarket.save();
      let findFencyType = await BetCategory.findOne(
        {
          name: BET_CATEGORIES.FANCY,
        },
        { _id: 1 }
      );
      let fencyMarket = await Market.findOne(
        {
          typeId: findFencyType._id,
          eventId: findMarket.eventId,
        },
        { _id: 1 }
      ).sort({ startDate: 1 });
      const findBetNotComplete = await Market.count({
        eventId: findMarket.eventId,
        winnerRunnerId: undefined,
        _id: { $ne: fencyMarket._id },
      });
      const findBetNotCompleteFancy = await MarketRunner.count({ marketId: fencyMarket._id, winScore: null });
      if (findBetNotComplete == 0 && findBetNotCompleteFancy == 0) {
        await Event.updateOne({ _id: findMarket.eventId }, { completed: true });
      }
      return reqBody;
    } else {
      throw new ErrorResponse("Winner already added.").status(200);
    }
  } catch (e) {
    throw new Error(e);
  }
};

const completeBetFency = async ({ ...reqBody }) => {
  try {
    const { marketRunnerId, winScore } = reqBody;

    let findMarketRunner = await MarketRunner.findOne({ _id: marketRunnerId });
    if (findMarketRunner.winScore == null) {
      let findBet = await Bet.find({ runnerId: marketRunnerId });

      for (var i = 0; i < findBet.length; i++) {
        let newFindBet = await Bet.findOne({ userId: findBet[i].userId, runnerId: findBet[i].runnerId });
        let profit = 0;
        let loss = 0;
        if (findBet[i].isBack == true) {
          if (newFindBet.runnerScore <= winScore) {
            profit = findBet[i].potentialWin;
            newFindBet.betPl = profit;
            newFindBet.betResultStatus = BET_RESULT_STATUS.WON;
          } else {
            loss = findBet[i].potentialLoss;
            newFindBet.betPl = loss;
            newFindBet.betResultStatus = BET_RESULT_STATUS.LOST;
          }
        } else {
          if (newFindBet.runnerScore > winScore) {
            profit = findBet[i].potentialWin;
            newFindBet.betPl = profit;
            newFindBet.betResultStatus = BET_RESULT_STATUS.WON;
          } else {
            loss = findBet[i].potentialLoss;
            newFindBet.betPl = loss;
            newFindBet.betResultStatus = BET_RESULT_STATUS.LOST;
          }
        }
        newFindBet.save();
        if (loss == 0) {
          await updateUserPl(findBet[i].userId, profit);
        } else {
          await updateUserPl(findBet[i].userId, loss);
        }
      }
      findMarketRunner.winScore = winScore;
      findMarketRunner.save();

      let findFencyType = await BetCategory.findOne(
        {
          name: BET_CATEGORIES.FANCY,
        },
        { _id: 1 }
      );
      let fencyMarket = await Market.findOne({
        _id: findMarketRunner.marketId,
      }).sort({ startDate: 1 });
      const findBetNotComplete = await Market.count({
        eventId: fencyMarket.eventId,
        winnerRunnerId: undefined,
        _id: { $ne: fencyMarket._id },
      });
      const findBetNotCompleteFancy = await MarketRunner.count({ marketId: fencyMarket._id, winScore: null });

      if (findBetNotComplete == 0 && findBetNotCompleteFancy == 0) {
        await Event.updateOne({ _id: fencyMarket.eventId }, { completed: true });
      }
      return reqBody;
    } else {
      throw new ErrorResponse("Winner already added.").status(200);
    }
  } catch (e) {
    throw new Error(e);
  }
};

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
  fetchRunnerPls,
  fetchUserEventBets,
  completeBet,
  completeBetFency,
  settlement,
  getChildUserData,
  fetchRunnerPlsFancy,
  getCompleteBetEventWise,
};
