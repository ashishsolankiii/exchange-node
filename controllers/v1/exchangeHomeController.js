import exchangeHomeService from "../../services/v1/exchangeHomeService.js";

// Get sports list
const getSportsList = async (req, res) => {
  const sprtsList = await exchangeHomeService.sportsList();

  res.status(200).json({ success: true, data: sprtsList });
};

// Sport wise match list

const getSportWiseTodayEvent = async (req, res) => {
  const { sportId = null } = req.body;
  if (!sportId) {
    throw new Error("sportId is required");
  }
  const matchList = await exchangeHomeService.sportWiseMatchList(sportId);

  res.status(200).json({ success: true, data: matchList });
};

export default {
  getSportsList,
  getSportWiseTodayEvent,
};
