import express from "express";
import mongoose from "mongoose";
import { route } from "../../../lib/error-handling/routes-error-boundary.js";
import { getTrimmedUser } from "../../../lib/io-guards/auth.js";
import Bet, { BET_RESULT_STATUS } from "../../../models/v1/Bet.js";
import { BET_CATEGORIES } from "../../../models/v1/BetCategory.js";
import Market from "../../../models/v1/Market.js";
import MarketRunner from "../../../models/v1/MarketRunner.js";
import User from "../../../models/v1/User.js";
import betService from "../../../services/v1/betService.js";
import { io } from "../../../socket/index.js";

const router = express.Router();

route(router, "post", "/revert", async (req, res) => {
  try {
    const marketId = req.body.marketId;

    const market = await Market.findById(marketId).populate("typeId");
    const marketType = market.typeId.name;
    // market.winnerRunnerId = null;
    // await market.save();
    // await User.findByIdAndUpdate("65268d34ad28b75dd7d4df1d", { $set: { balance: 5000, userPl: 0, exposure: 0 } });
    // await Bet.deleteMany({ marketId: market._id });

    const userBets = await Bet.aggregate([
      {
        $match: {
          marketId: new mongoose.Types.ObjectId(marketId),
          betResultStatus: { $ne: BET_RESULT_STATUS.RUNNING },
        },
      },
      {
        $group: {
          _id: "$userId",
        },
      },
    ]);

    const userIds = userBets.map((userBet) => userBet._id);

    for (const userId of userIds) {
      const bets = await Bet.find({ userId, marketId, betResultStatus: { $ne: BET_RESULT_STATUS.RUNNING } });

      if (marketType === BET_CATEGORIES.MATCH_ODDS) {
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

        const user = await User.findById(userId);
        let userPl = user.userPl;
        let userBalance = user.balance;

        console.log(userPl);
        for (const bet of bets) {
          userPl = bet.betResultStatus === BET_RESULT_STATUS.WON ? userPl - bet.betPl : userPl + Math.abs(bet.betPl);
          userBalance =
            bet.betResultStatus === BET_RESULT_STATUS.WON ? userBalance - bet.betPl : userBalance + Math.abs(bet.betPl);

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

          // console.log(bet);
          // console.log(userPl);
          bet.betResultStatus = BET_RESULT_STATUS.RUNNING;
          bet.betPl = 0;
          await bet.save();

          const userBetsAndPls = await betService.fetchAllUserBetsAndPls({ eventId: bet.eventId, userId });
          io.userBet.emit(`event:bet:${userId}`, userBetsAndPls);
        }

        const plDiff = userPl - user.userPl;
        const losingPotential = Math.min(...Object.values(runners).map((runner) => runner.pl));
        // console.log("before", "exposure", user.exposure, "userPl", user.userPl, "balance", user.balance);
        user.exposure += Math.abs(losingPotential);
        user.userPl = userPl;
        user.balance = userBalance;
        // console.log("after", "exposure", user.exposure, "userPl", user.userPl, "balance", user.balance);

        const parentUser = await User.findById(user.parentId);
        // console.log(
        //   "before",
        //   "exposure",
        //   parentUser.exposure,
        //   "userPl",
        //   parentUser.userPl,
        //   "balance",
        //   parentUser.balance
        // );
        parentUser.balance = parentUser.balance + plDiff;
        parentUser.userPl = parentUser.userPl + plDiff;
        // console.log(
        //   "after",
        //   "exposure",
        //   parentUser.exposure,
        //   "userPl",
        //   parentUser.userPl,
        //   "balance",
        //   parentUser.balance
        // );
        // console.log(plDiff);

        const updatedUser = await user.save();
        const userDetails = getTrimmedUser(updatedUser);
        io.user.emit(`user:${userId}`, userDetails);

        const updatedParentUser = await parentUser.save();
        const parentUserDetails = getTrimmedUser(updatedParentUser);
        io.user.emit(`user:${parentUserDetails._id}`, parentUserDetails);
      }
    }

    // const temp = {};

    // for (const bet of bets) {
    // bet.betResultStatus = BET_RESULT_STATUS.WON;
    // await bet.save();
    // }

    res.send("reverted");
  } catch (e) {
    console.log(e);
    res.send(e.message);
  }
});

export default router;
