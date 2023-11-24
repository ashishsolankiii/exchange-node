import exchangeHomeService from "../../services/v1/exchangeHomeService.js";
import transferTypeRequest from "../../requests/v1/transferTypeRequest.js";
import transferTypeService from "../../services/v1/transferTypeService.js";

// Get sports list
const getSportsList = async (req, res) => {
  const sprtsList = await exchangeHomeService.sportsList();

  res.status(200).json({ success: true, data: sprtsList });
};

// Sport wise match list

const getSportWiseTodayEvent = async (req, res) => {
  const { sportId = null, type, userId } = req.body;

  if (type == 'favourite') {
    if (!userId) {
      throw new Error("userId is required!");
    }
  }

  const matchList = await exchangeHomeService.sportWiseMatchList(sportId, type, userId);

  res.status(200).json({ success: true, data: matchList });
};

// Get all transferTypes for frontend
const getTransferType = async (req, res) => {
  const { body } = await transferTypeRequest.transferTypeListingRequest(req);

  const transferTypes = await transferTypeService.fetchAllTransferType({ ...body });

  return res.status(200).json({ success: true, data: transferTypes });
};


export default {
  getSportsList,
  getSportWiseTodayEvent,
  getTransferType
};
