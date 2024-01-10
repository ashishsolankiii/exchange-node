import Bet, { BET_ORDER_STATUS, BET_ORDER_TYPE, BET_RESULT_STATUS } from "../../../models/v1/Bet.js";
import User from "../../../models/v1/User.js";

// Place new bet
async function createBet({ ...reqBody }) {

  const {
    userId,
    calculateExposure,
    betInfo,
    runners
  } = reqBody;

  const user = await User.findById(userId);
  if (!(user && user.role === USER_ROLE.USER && user.isActive && !user.isBetLock)) {
    throw new Error("Invalid request.");
  }
  const newExposure = user.exposure + Math.abs(calculateExposure);
  if (user.balance < Math.abs(newExposure)) {
    throw new Error("Insufficient balance.");
  } else if (newExposure > user.exposureLimit) {
    throw new Error("Exposure limit reached.");
  }

  const metadata = {
    betInfo: betInfo,
    runners: runners
  }
  const newBetObj = {
    userId: userId,
    // marketId: market._id,
    // eventId: event._id,
    odds: betInfo.requestedOdds,
    runnerScore: betInfo.roundId,
    stake: betInfo.reqStake,
    isBack: betInfo.isBack,
    betOrderType: BET_ORDER_TYPE.MARKET,
    betOrderStatus: BET_ORDER_STATUS.PLACED,
    betResultStatus: BET_RESULT_STATUS.RUNNING,
    // deviceInfo,
    // ipAddress,
    // runnerId: runner._id,
    // potentialWin,
    // potentialLoss,
    // casinoGameId,
    // apiDistributorId,
    metaData: metadata
  };

  user.exposure = newExposure < 0 ? 0 : newExposure;

  const [newBet] = await Promise.all([
    Bet.create(newBetObj),
    user.save(),
  ]);

  return newBet;
}

export default {
  createBet,
};
