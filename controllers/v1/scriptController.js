import marketService from "../../services/v1/marketService.js";
import { importExcel } from '../../lib/helpers/excel-utility.js';
import Bet, { BET_TYPE } from "../../models/v1/Bet.js";

const getMatchOdds = async (req, res) => {
  try {
    const allData = await marketService.getMatchOdds(req.body.markeId);
    res.status(200).json({ message: "Match odds get successfully!", data: allData });
  } catch (e) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const getFencyPrice = async (req, res) => {
  try {
    const allData = await marketService.getFencyPrice(req.body.eventId);
    res.status(200).json({ message: "Fency get successfully!", data: allData });
  } catch (e) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const getBookmakerPrice = async (req, res) => {
  try {
    const allData = await marketService.getBookmakerPrice(req.body.markeId);
    res.status(200).json({ message: "Bookmaker get successfully!", data: allData });
  } catch (e) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const getLiveScore = async (req, res) => {
  try {
    const allData = await marketService.liveScore(req.body.eventId);
    res.status(200).json({ message: "Live score get successfully!", data: allData });
  } catch (e) {
    res.status(500).json({ error: "An error occurred" });
  }
};

const importExcelSheet = async (req, res) => {
  try {
    const fileData = req.files.file.data; // Assuming the file is sent as base64 in the request body
    console.log(fileData);
    // Convert base64 to buffer
    const fileBuffer = Buffer.from(fileData, 'base64');

    // Process the Excel file and get the data
    const data = importExcel(fileBuffer);

    res.status(200).json({ message: "Excel data get successfully.", data: data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Error processing Excel file' });
  }
};

const updateBetType = async (req, res) => {
  try {
    let allBet = await Bet.find();
    let allBetIds = allBet.map((item) => item._id);
    await Bet.updateMany({ _id: { $in: allBetIds } }, { betType: BET_TYPE.SPORTS });
    res.status(200).json({ message: "Bet type update in bet module." });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export default {
  getMatchOdds,
  getFencyPrice,
  getBookmakerPrice,
  getLiveScore,
  importExcelSheet,
  updateBetType
};
