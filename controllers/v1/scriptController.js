import marketService from "../../services/v1/marketService.js";

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

export default {
  getMatchOdds,
  getFencyPrice,
  getBookmakerPrice
};
