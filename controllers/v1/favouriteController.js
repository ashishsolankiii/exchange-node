import favouriteRequest from "../../requests/v1/favouriteRequest.js"
import favouriteService from "../../services/v1/favouriteService.js";

const addRemoveFavourite = async (req, res) => {

  const { body } = await favouriteRequest.addRemoveFavouriteRequest(req);

  const favourite = await favouriteService.addRemoveFavourite({ ...body });

  res.status(201).json({ success: true, data: favourite });
};

export default {
  addRemoveFavourite
};