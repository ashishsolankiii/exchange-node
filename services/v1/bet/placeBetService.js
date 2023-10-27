import { getTrimmedUser } from "../../../lib/io-guards/auth.js";
import Bet, { BET_ORDER_STATUS, BET_ORDER_TYPE, BET_RESULT_STATUS } from "../../../models/v1/Bet.js";
import { BET_CATEGORIES } from "../../../models/v1/BetCategory.js";
import Competition from "../../../models/v1/Competition.js";
import Event from "../../../models/v1/Event.js";
import Market from "../../../models/v1/Market.js";
import MarketRunner, { RUNNER_STATUS } from "../../../models/v1/MarketRunner.js";
import Sport from "../../../models/v1/Sport.js";
import User, { USER_ROLE } from "../../../models/v1/User.js";
import { io } from "../../../socket/index.js";
import marketService from "../marketService.js";
import betPlSerice from "./betPlService.js";
import runningBetService from "./runningBetService.js";

/**
 * Validate and Calcualtes potential win and loss for below markets
 * 1. Fancy
 * 2. Fancy1
 */
async function calculateFancyPotientialPl(params) {
  const { marketType, marketOdds, runnerSelectionId, odds, stake, isBack } = params;

  const [selectedRunner] = marketOdds;

  if (!selectedRunner || Number(selectedRunner.SelectionId) !== Number(runnerSelectionId)) {
    throw new Error("Selected fancy not found or inactive!");
  }

  const backPrices = [];
  const layPrices = [];

  const maxRunners = 3;

  if (marketType.name === BET_CATEGORIES.FANCY) {
    for (let i = 1; i <= maxRunners; i++) {
      backPrices.push(selectedRunner[`BackSize${i}`]?.toFixed(3) || 0);
      layPrices.push(selectedRunner[`LaySize${i}`]?.toFixed(3) || 0);
    }
  } else if (marketType.name === BET_CATEGORIES.FANCY1) {
    for (let i = 1; i <= maxRunners; i++) {
      backPrices.push(selectedRunner[`BackPrice${i}`]?.toFixed(3) || 0);
      layPrices.push(selectedRunner[`LayPrice${i}`]?.toFixed(3) || 0);
    }
  }

  if (isBack) {
    if (!backPrices.includes(odds.toFixed(3))) {
      throw new Error("Bet not confirmed, Odds changed!");
    }
  } else {
    if (!layPrices.includes(odds.toFixed(3))) {
      throw new Error("Bet not confirmed, Odds changed!");
    }
  }

  let potentialWin = 0;
  let potentialLoss = 0;

  if (marketType.name === BET_CATEGORIES.FANCY) {
    potentialWin = isBack ? stake * (odds / 100) : stake;
    potentialLoss = isBack ? -stake : -(stake * (odds / 100));
  } else if (marketType.name === BET_CATEGORIES.FANCY1) {
    potentialWin = isBack ? stake * odds - stake : stake;
    potentialLoss = isBack ? -stake : -(stake * odds - stake);
  }

  return { potentialWin, potentialLoss };
}

// Calcualtes Fancy PL
async function calculateFancyPl(params) {
  const { user, market } = params;

  const { potentialWin, potentialLoss } = await calculateFancyPotientialPl(params);

  const mockBet = new Bet({ ...params, potentialWin, potentialLoss });

  const [currentPl, newPl] = await Promise.all([
    betPlSerice.fetchRunningSingleRunnerOddPl({ marketId: market._id, userId: user._id }),
    betPlSerice.fetchRunningSingleRunnerOddPl({ marketId: market._id, userId: user._id, mockBet }),
  ]);

  const exposureInUse = Math.abs(currentPl);
  const requiredExposure = Math.abs(newPl);

  const newExposure = user.exposure - exposureInUse + requiredExposure;

  return { potentialWin, potentialLoss, newExposure };
}

// Calcualtes Match Odds PL
async function calculateMatchOddPl(params) {
  const { marketOdds, user, market, runnerSelectionId, marketType, stake, isBack } = params;
  let { odds } = params;

  const [{ matchOdds }] = marketOdds;

  const selectedRunner = matchOdds.find((rnr) => Number(rnr.selectionId) === runnerSelectionId);
  if (!(selectedRunner && selectedRunner.status === "ACTIVE")) {
    throw new Error("Selected runner not found or inactive!");
  }

  if (isBack) {
    const oddPrices = selectedRunner.back.map((o) => o.price.toFixed(3));
    if (!oddPrices.includes(odds.toFixed(3))) {
      throw new Error("Bet not confirmed, Odds changed!");
    }
  } else {
    const layPrices = selectedRunner.lay.map((o) => o.price.toFixed(3));
    if (!layPrices.includes(odds.toFixed(3))) {
      throw new Error("Bet not confirmed, Odds changed!");
    }
  }

  // NOTE - Odds are different for BOOKMAKER
  odds = marketType.name === BET_CATEGORIES.BOOKMAKER ? odds / 100 + 1 : odds;

  const potentialWin = isBack ? stake * odds - stake : stake;
  const potentialLoss = isBack ? -stake : -(stake * odds - stake);

  const mockBet = new Bet({ ...params, potentialWin, potentialLoss });

  const [currentPls, newPls] = await Promise.all([
    betPlSerice.fetchRunningMultiRunnerOddPl({ marketId: market._id, userId: user._id }),
    betPlSerice.fetchRunningMultiRunnerOddPl({ marketId: market._id, userId: user._id, mockBet }),
  ]);

  const exposureInUse = currentPls.length ? Math.abs(Math.min(...currentPls.map((runner) => runner?.pl || 0))) : 0;
  const requiredExposure = newPls.length ? Math.abs(Math.min(...newPls.map((runner) => runner?.pl || 0))) : 0;

  const newExposure = user.exposure - exposureInUse + requiredExposure;

  return { potentialWin, potentialLoss, newExposure };
}

// Validate and process request body
async function processPlaceBetRequest({ user: loggedInUser, marketTypeFns, ...reqBody }) {
  const {
    marketId,
    eventId,
    runnerId,
    odds: reqOdds,
    stake: reqStake,
    runnerScore: reqRunnerScore = 0,
    runnerSelectionId: reqRunnerSelectionId,
    betOrderType,
  } = reqBody;

  // Normalize request body
  const odds = Number(reqOdds);
  const stake = Number(reqStake);
  const runnerScore = Number(reqRunnerScore);
  const runnerSelectionId = Number(reqRunnerSelectionId);

  // Validate Market and Market Type
  const market = await Market.findById(marketId).populate("typeId");
  const marketType = market?.typeId || {};

  if (!(marketType && marketType?.name)) {
    throw new Error("Market type not found.");
  }
  if (!market) {
    throw new Error("Market closed.");
    // TODO : Check if market is open
    // } else if (moment(moment(market.startDate).format("YYYY-MM-DD").isAfter(moment()))) {
    //   throw new Error("Failed to place bet.");
  } else if (market.maxStake > 0 && market.minStake > 0) {
    if (stake < market.minStake || stake > market.maxStake) {
      throw new Error("Invalid stake.");
    }
  } else if (market.winnerRunnerId) {
    throw new Error("Winner declared.");
  }

  /**
   * Get Market Odds
   *
   * NOTE: This function is placed here because,
   * we need to get the market odds as soon as possible
   * to avoid any odds change while processing bet.
   */
  const param = marketTypeFns[marketType.name].marketOddParam;
  const marketOdds = await marketTypeFns[marketType.name].getMarketOdds(param);
  if (!marketOdds) {
    throw new Error("Market not found.");
  }

  // Get resources: user, sport, competition, event, runner
  const resources = await Promise.allSettled([
    User.findById(loggedInUser._id),
    Sport.findById(market.sportId),
    Competition.findById(market.competitionId),
    Event.findById(eventId),
    MarketRunner.findById(runnerId),
  ]);

  const rejected = resources.find((result) => result.status === "rejected");
  if (rejected) {
    throw new Error("Failed to place bet.");
  }

  const [user, sport, competition, event, runner] = resources.map((result) => result.value);

  // Validate user
  if (!(user && user.role === USER_ROLE.USER && user.isActive && !user.isBetLock)) {
    throw new Error("Invalid request.");
  }

  // Validate sport
  if (!(sport && sport.isActive)) {
    throw new Error("Sport closed.");
  }

  // Validate competition
  if (!(competition && competition.isActive)) {
    throw new Error("Competition closed.");
  }

  // Validate event
  if (!(event && event.isActive)) {
    throw new Error("Event closed.");
  } else if (event.betLock) {
    throw new Error("Failed to place bet.");
  } else if (stake < event.minStake || stake > event.maxStake) {
    throw new Error("Invalid stake.");
  }

  // Validate runner
  if (!runner || (runner?.status && runner.status !== RUNNER_STATUS.ACTIVE)) {
    throw new Error("Selected fancy not found or inactive!");
  } else if (Number(runner.max > 0) && Number(runner.min) > 0) {
    if (Number(stake) < Number(runner.min) || Number(stake) > Number(runner.max)) {
      throw new Error("Invalid stake.");
    }
  }

  // Validate Bet Order Type : market | limit
  if (!Object.values(BET_ORDER_TYPE).includes(betOrderType)) {
    throw new Error("Invalid order.");
  }

  return {
    ...reqBody,
    marketOdds,
    user,
    event,
    market,
    marketType,
    runner,
    odds,
    stake,
    runnerSelectionId,
    runnerScore,
  };
}

// Place new bet
async function createBet({ user: loggedInUser, ...reqBody }) {
  const marketTypeFns = {
    [BET_CATEGORIES.MATCH_ODDS]: {
      calculatePl: calculateMatchOddPl, // Main function to calculate potential win and loss
      getMarketOdds: marketService.getMatchOdds, // Market data
      marketOddParam: reqBody.apiMarketId, // Market data parameters
    },
    [BET_CATEGORIES.BOOKMAKER]: {
      calculatePl: calculateMatchOddPl, // Main function to calculate potential win and loss
      getMarketOdds: marketService.getBookmakerPrice, // Market data
      marketOddParam: reqBody.apiMarketId, // Market data parameters
    },
    [BET_CATEGORIES.FANCY]: {
      calculatePl: calculateFancyPl, // Main function to calculate potential win and loss
      getMarketOdds: marketService.getFencyPriceByRunner, // Market data
      marketOddParam: reqBody.runnerId, // Market data parameters
    },
    [BET_CATEGORIES.FANCY1]: {
      calculatePl: calculateFancyPl, // Main function to calculate potential win and loss
      getMarketOdds: marketService.getFencyPriceByRunner, // Market data
      marketOddParam: reqBody.runnerId, // Market data parameters
    },
  };

  const processedReq = await processPlaceBetRequest({
    user: loggedInUser,
    marketTypeFns,
    ...reqBody,
  });

  const {
    user,
    event,
    market,
    marketType,
    runner,
    odds,
    stake,
    runnerScore,
    isBack,
    betOrderType,
    deviceInfo,
    ipAddress,
  } = processedReq;

  const { potentialWin, potentialLoss, newExposure } = await marketTypeFns[marketType.name].calculatePl(processedReq);

  if (user.balance < Math.abs(newExposure)) {
    throw new Error("Insufficient balance.");
  } else if (newExposure > user.exposureLimit) {
    throw new Error("Exposure limit reached.");
  }

  const newBetObj = {
    userId: user._id,
    marketId: market._id,
    eventId: event._id,
    odds,
    runnerScore,
    stake,
    isBack,
    betOrderType,
    betOrderStatus: BET_ORDER_STATUS.PLACED,
    betResultStatus: BET_RESULT_STATUS.RUNNING,
    deviceInfo,
    ipAddress,
    runnerId: runner._id,
    potentialWin,
    potentialLoss,
  };

  user.exposure = newExposure < 0 ? 0 : newExposure;

  const [newBet, updatedUser, userBetsAndPls] = await Promise.all([
    Bet.create(newBetObj),
    user.save(),
    runningBetService.fetchAllUserBetsAndPls({ eventId: event._id, userId: user._id }),
  ]);

  // Emit data to user
  io.userBet.emit(`event:bet:${user._id}`, userBetsAndPls);
  io.user.emit(`user:${user._id}`, getTrimmedUser(updatedUser));

  return newBet;
}

export default {
  createBet,
};
