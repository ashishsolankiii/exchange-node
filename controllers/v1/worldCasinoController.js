// Balance
const balance = async (req, res) => {
  // req.body = {
  //   "partnerKey": "6yhUl8mtfTZQcyhfIY22nXVRVHGKz21G2sBXfUmDv+nPy9S5N9n5MEy9honjNzP/xFQ+xxxxxxx=",
  //   "userId": "xx",
  //   "timestamp": "1628773197932"
  // }
  const { partnerKey, userId, timestamp } = req.body;

  const response = {
    "partnerKey": partnerKey,
    "timestamp": timestamp,
    "userId": userId,
    "balance": 9815.18,
    "status": {
      "code": "SUCCESS",
      "message": "Balance get successfully."
    }
  };

  res.json(response);
};

// Debit
const debit = async (req, res) => {
  // req.body = 
  // {
  //   "partnerKey": "6yhUl8mtfTZQcyhfIY22nXVRVHGKz21G2sBXfUmDv+nPy9S5N9n5MEy9honjNzP/xFQ+XXXXXXX=",
  //   "user": {
  //       "id": "XX",
  //       "currency": "INR"
  //   },
  //   "gameData": {
  //       "providerCode": "SN",
  //       "providerTransactionId": "25406",
  //       "gameCode": "VTP",
  //       "description": "bet",
  //       "providerRoundId": "2449691"
  //   },
  //   "transactionData": {
  //       "id": "249",
  //       "amount": 500.00,
  //       "referenceId": ""
  //   },
  //   "timestamp": "1628764434278"
  // }
  const { partnerKey, user, gameData, transactionData, timestamp } = req.body;

  const response = {
    "partnerKey": partnerKey,
    "timestamp": timestamp,
    "userId": user.id,
    "balance": 9100.18,
    "status": {
      "code": "SUCCESS",
      "message": "Debit Successfully,"
    }
  }

  res.json(response);
};

// Credit
const credit = async (req, res) => {
  // req.body = 
  // {
  //     "partnerKey": "6yhUl8mtfTZQcyhfIY22nXVRVHGKz21G2sBXfUmDv+nPy9S5N9n5MEy9honjNzP/xFQ+XXXXXXX=",
  //     "timestamp": "1628521562165",
  //     "gameData": {
  //         "providerRoundId": "235689",
  //         "gameCode": "TP",
  //         "providerCode": "SN",
  //         "providerTransactionId": "9685320",
  //         "description": "win"
  //     },
  //     "user": {
  //         "id": "xx",
  //         "currency": "INR"
  //     },
  //     "transactionData": {
  //         "id": "125",
  //         "referenceId": "",
  //         "amount": 200.0
  //     }
  // }
  const { partnerKey, user, gameData, transactionData, timestamp } = req.body;

  const response = {
    "partnerKey": partnerKey,
    "timestamp": timestamp,
    "userId": user.id,
    "balance": 9815.18,
    "status": {
      "code": "SUCCESS",
      "message": "Credit Successfully."
    }
  }

  res.json(response);
};


export default {
  balance,
  debit,
  credit
};
