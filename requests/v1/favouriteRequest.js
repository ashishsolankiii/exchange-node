import { isValidObjectId } from "mongoose";
import Yup from "yup";

async function addRemoveFavouriteRequest(req) {
  const validationSchema = Yup.object().shape({
    userId: Yup.string().required().test("userId", "Given userId is not valid!", isValidObjectId),
    eventId: Yup.string().required().test("eventId", "Given eventId is not valid!", isValidObjectId),
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  addRemoveFavouriteRequest
};