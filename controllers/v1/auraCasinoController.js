import { appConfig } from "../../config/app.js";
import { auraConfig } from "../../config/aura.js";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import LoggedInUser from "../../models/v1/LoggedInUser.js";
import User from "../../models/v1/User.js";

// Gets the user data.
const getUserData = async (req, res) => {
  const reqUserId = req.user._id;

  const operatorId = req.body.operatorId;

  const token = req.body.token;

  const domain = appConfig.AURA_WHITELISTED_DOMAIN;

  const user = await User.findById(reqUserId, {
    username: 1,
    balance: 1,
    exposure: 1,
  });

  const response = {
    operatorId: operatorId,
    userId: `${user._id}|${domain}`,
    username: user.username,
    playerAuthTokenLaunch: token,
    token: token,
    balance: user.balance,
    exposure: user.exposure,
    currency: auraConfig.currency,
    language: auraConfig.language,
    timestamp: Date.now(),
    clientIP: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
    VIP: auraConfig.vip,
    errorCode: auraConfig.successCode,
    errorDescription: auraConfig.successMessage,
  };

  res.json(response);
};

const getExposure = async (req, res) => {
  try {
    // req.body = {
    //   "token": "P7kAWwQSC7RuD8ef",
    //   "gameId": "67564",
    //   "matchName": "Poker",
    //   "roundId": "356523",
    //   "marketId": "5da469781a1728460775f391",
    //   "marketType": "plain",
    //   "userId": "5d96edcaa7c48200116f1c51",
    //   "calculateExposure": -1220.0000000000002,
    //   "betInfo": {
    //     "gameId": "67564",
    //     "marketId": "5da469781a1728460775f391",
    //     "runnerId": "66776",
    //     "runnerName": "Player A",
    //     "reqStake": 2000,
    //     "requestedOdds": "1.61",
    //     "pnl": 1220.0000000000002,
    //     "liability": 0,
    //     "status": "OPEN",
    //     "isBack": false,
    //     "roundId": "356523",
    //     "pl": 0,
    //     "orderId": "5da469d41a1728460775f3c2"
    //   },
    //   "runners": [
    //     {
    //       "cards": [
    //         "H13",
    //         "D7"
    //       ],
    //       "type": "plain",
    //       "back": [
    //         {
    //           "price": "1.57",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "1.56",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "1.55",
    //           "size": "15000"
    //         }
    //       ],
    //       "lay": [
    //         {
    //           "price": "1.61",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "1.62",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "1.63",
    //           "size": "15000"
    //         }
    //       ],
    //       "id": "66776",
    //       "name": "Player A",
    //       "sortPriority": 1,
    //       "pl": -1220.0000000000002,
    //       "status": "ACTIVE"
    //     },
    //     {
    //       "cards": [
    //         "C8",
    //         "H5"
    //       ],
    //       "type": "plain",
    //       "back": [
    //         {
    //           "price": "2.64",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "2.62",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "2.6",
    //           "size": "15000"
    //         }
    //       ],
    //       "lay": [
    //         {
    //           "price": "2.74",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "2.76",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "2.78",
    //           "size": "15000"
    //         }
    //       ],
    //       "id": "66777",
    //       "name": "Player B",
    //       "sortPriority": 2,
    //       "pl": 2000,
    //       "status": "ACTIVE"
    //     }
    //   ]
    // }
    const reqUserId = req.body.userId;

    const user = await User.findById(reqUserId, {
      username: 1,
      balance: 1,
      exposure: 1,
    });

    const response = {
      status: auraConfig.successCode,
      Message: "Exposure insert Successfully...",
      wallet: user.balance,
      exposure: user.exposure,
    };

    res.json(response);
  } catch (e) {
    const response = {
      status: auraConfig.errorCode,
      message: e.message,
    };
    res.json(response);
  }
};

const getResult = async (req, res) => {
  try {
    // req.body = {
    //   "result": [
    //     {
    //       "Type": "main",
    //       "winnerId": 66778,
    //       "remoteUpdate": false,
    //       "flag": true,
    //       "transactionId": "",
    //       "_id": "5f1ebf5258908441f7afa188",
    //       "marketId": "5f1ebf363aafa31ad9659875",
    //       "userId": "yyyyyyyyyyyyyyyyyyyy",
    //       "__v": 0,
    //       "createdAt": "2020-07-27T11:49:38.119Z",
    //       "downpl": 109.75999999999999,
    //       "gameId": "98789",
    //       "marketRunner": [
    //         {
    //           "cards": [

    //           ],
    //           "id": "66778",
    //           "name": "7Up",
    //           "sortPriority": 1,
    //           "status": "WINNER"
    //         },
    //         {
    //           "cards": [

    //           ],
    //           "id": "66779",
    //           "name": "7",
    //           "sortPriority": 2,
    //           "status": "LOSER"
    //         },
    //         {
    //           "cards": [

    //           ],
    //           "id": "66780",
    //           "name": "7Down",
    //           "sortPriority": 3,
    //           "status": "LOSER"
    //         }
    //       ],
    //       "operatorId": "xxxx",
    //       "roundId": "3620822",
    //       "systemUserId": "5f0af1edfa291f12ada1c825",
    //       "updatedAt": "2020-07-27T11:49:38.119Z",
    //       "userName": "yyyyyyyyyyyyyyyyyyyy",
    //       "orders": [
    //         {
    //           "orderId": "5f1ebf47bd57fc2e50286b72",
    //           "status": "WON",
    //           "downPl": 109.75999999999999
    //         }
    //       ]
    //     }
    //   ],
    //   "runners": [
    //     {
    //       "cards": [

    //       ],
    //       "type": "main",
    //       "back": [
    //         {
    //           "price": "1.98",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "1.98",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "1.98",
    //           "size": "15000"
    //         }
    //       ],
    //       "lay": [

    //       ],
    //       "id": "66778",
    //       "name": "7Up",
    //       "sortPriority": 1,
    //       "pl": 0,
    //       "status": "WINNER"
    //     },
    //     {
    //       "cards": [

    //       ],
    //       "type": "main",
    //       "back": [
    //         {
    //           "price": "11.5",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "11.5",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "11.5",
    //           "size": "15000"
    //         }
    //       ],
    //       "lay": [

    //       ],
    //       "id": "66779",
    //       "name": "7",
    //       "sortPriority": 2,
    //       "pl": 0,
    //       "status": "LOSER"
    //     },
    //     {
    //       "cards": [

    //       ],
    //       "type": "main",
    //       "back": [
    //         {
    //           "price": "1.98",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "1.98",
    //           "size": "15000"
    //         },
    //         {
    //           "price": "1.98",
    //           "size": "15000"
    //         }
    //       ],
    //       "lay": [

    //       ],
    //       "id": "66780",
    //       "name": "7Down",
    //       "sortPriority": 3,
    //       "pl": 0,
    //       "status": "LOSER"
    //     }
    //   ],
    //   "betvoid": false,
    //   "roundId": "3620822",
    //   "market": {
    //     "createdBy": "sevenud",
    //     "marketHeader": "Match odds",
    //     "roundId": "3620822",
    //     "indexCard": [
    //       "H12"
    //     ],
    //     "hash": "",
    //     "salt": "",
    //     "_id": "5f1ebf363aafa31ad9659875",
    //     "gameId": "98789",
    //     "marketRunner": [
    //       {
    //         "cards": [

    //         ],
    //         "type": "main",
    //         "back": [
    //           {
    //             "price": "1.98",
    //             "size": "15000"
    //           },
    //           {
    //             "price": "1.98",
    //             "size": "15000"
    //           },
    //           {
    //             "price": "1.98",
    //             "size": "15000"
    //           }
    //         ],
    //         "lay": [

    //         ],
    //         "id": "66778",
    //         "name": "7Up",
    //         "sortPriority": 1,
    //         "pl": 0,
    //         "status": "WINNER"
    //       },
    //       {
    //         "cards": [

    //         ],
    //         "type": "main",
    //         "back": [
    //           {
    //             "price": "11.5",
    //             "size": "15000"
    //           },
    //           {
    //             "price": "11.5",
    //             "size": "15000"
    //           },
    //           {
    //             "price": "11.5",
    //             "size": "15000"
    //           }
    //         ],
    //         "lay": [

    //         ],
    //         "id": "66779",
    //         "name": "7",
    //         "sortPriority": 2,
    //         "pl": 0,
    //         "status": "LOSER"
    //       },
    //       {
    //         "cards": [

    //         ],
    //         "type": "main",
    //         "back": [
    //           {
    //             "price": "1.98",
    //             "size": "15000"
    //           },
    //           {
    //             "price": "1.98",
    //             "size": "15000"
    //           },
    //           {
    //             "price": "1.98",
    //             "size": "15000"
    //           }
    //         ],
    //         "lay": [

    //         ],
    //         "id": "66780",
    //         "name": "7Down",
    //         "sortPriority": 3,
    //         "pl": 0,
    //         "status": "LOSER"
    //       }
    //     ],
    //     "gameType": "Dice",
    //     "gameSubType": "Dice",
    //     "runnerType": "main",
    //     "stage": 0,
    //     "timer": 0,
    //     "createdAt": "2020-07-27T11:49:10.769Z",
    //     "updatedAt": "2020-07-27T11:49:37.992Z",
    //     "__v": 0,
    //     "marketValidity": 1595850585,
    //     "status": "CLOSED"
    //   }
    // }

    const reqUserId = req.body.result[0]?.userId;

    const user = await User.findById(reqUserId, {
      username: 1,
      balance: 1,
      exposure: 1,
    });

    const response = {
      Error: auraConfig.successCode,
      result: [
        {
          wallet: user.balance,
          exposure: user.exposure,
          userId: user._id,
        },
      ],
      message: "Users profit/loss updated..",
    };

    res.json(response);
  } catch (e) {
    const response = {
      status: auraConfig.errorCode,
      message: e.message,
    };
    res.json(response);
  }
};

const getLaunchUrl = async (req, res) => {
  try {
    const loggedInUser = await LoggedInUser.findOne({ userId: req.user._id });

    if (!loggedInUser) {
      throw new Error("User not found!");
    }

    const mobileUrl = `https://m2.fawk.app/#/splash-screen/${loggedInUser.token}/${appConfig.AURA_OPERATOR_ID}`;

    const desktopUrl = `https://d2.fawk.app/#/splash-screen/${loggedInUser.token}/${appConfig.AURA_OPERATOR_ID}`;

    const data = {
      mobileUrl,
      desktopUrl,
    };

    res.status(200).json({ success: true, data });
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

export default {
  getUserData,
  getExposure,
  getResult,
  getLaunchUrl,
};
