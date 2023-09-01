import mongoose from "mongoose";
import ErrorResponse from "../../lib/error-handling/error-response.js";
import UserStake from "../../models/v1/UserStake.js";

/**
 * Fetch Stake by Id from the database
 */
const fetchStakeById = async (user_id, stakeType) => {
  try {
    //Find User stake
    const stake = await UserStake.findOne({ userId: new mongoose.Types.ObjectId(user_id), stakeType: stakeType });

    return stake;
  } catch (e) {
    throw new Error(e);
  }
};

/**
 * create Stake in the database
 */
const addStake = async ({ userId, stakeType, inputValues }) => {
  try {
    const newStakeObj = {
      userId: userId,
      stakeType: stakeType,
      inputValues: inputValues,
    };

    const existingStake = await UserStake.findOne({
      userId: new mongoose.Types.ObjectId(userId),
      stakeType: stakeType,
    });

    if (existingStake) {
      throw new Error("Stake already exists.");
    }

    const newstake = await UserStake.create(newStakeObj);

    return newstake;
  } catch (e) {
    throw new Error(e);
  }
};

/**
 * update Stake in the database
 */
const modifyStake = async ({ _id, inputValues }) => {
  try {
    if (!_id) {
      throw new Error("Missing _id in the request body.");
    }

    const stake = await UserStake.findById(_id);

    if (!stake) {
      throw new Error("Stake not found.");
    }

    stake.inputValues = inputValues;
    await stake.save();

    return stake;
  } catch (e) {
    throw new ErrorResponse(e.message).status(200);
  }
};

const fetchUserStakes = async (user_id) => {
  try {
    const stakes = await UserStake.find({ userId: new mongoose.Types.ObjectId(user_id) }).select([
      "stakeType",
      "inputValues",
    ]);

    return stakes;
  } catch (e) {
    throw new Error(e);
  }
};

export default {
  fetchStakeById,
  addStake,
  modifyStake,
  fetchUserStakes,
};
