import Favourite from "../../models/v1/Favourite.js";

const addRemoveFavourite = async ({ ...reqBody }) => {
  try {
    const favourite = await Favourite.findOne({ userId: reqBody.userId, eventId: reqBody.eventId });

    if (favourite) {
      favourite.deleteOne()

      return favourite;
    }
    else {
      const newFavouriteObj = {
        userId: reqBody.userId,
        eventId: reqBody.eventId,
      };
      const newfavourite = await Favourite.create(newFavouriteObj);

      return newfavourite;
    }

  } catch (e) {
    return e;
  }
};

export default {
  addRemoveFavourite,
};