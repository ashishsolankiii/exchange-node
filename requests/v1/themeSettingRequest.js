import { isValidObjectId } from "mongoose";
import Yup from "yup";

async function updateThemeSettingRequest(req) {
  const validationSchema = Yup.object().shape({
    userId: Yup.string().required().test("userId", "Given userId is not valid!", isValidObjectId),
    facebookLink: Yup.string(),
    twitterLink: Yup.string(),
    instagramLink: Yup.string(),
    telegramLink: Yup.string(),
    youtubeLink: Yup.string(),
    whatsappLink: Yup.string(),
    blogLink: Yup.string(),
    footerMessage: Yup.string(),
    news: Yup.string(),
    supportNumber: Yup.string(),
    forgotPasswordLink: Yup.string(),
    depositePopupNumber: Yup.string(),
    welcomeMessage: Yup.string(),
    welcomeMessageMobile: Yup.string(),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function getThemeSettingByCurrencyAndDomainRequest(req) {
  const validationSchema = Yup.object().shape({
    countryName: Yup.string(),
    domainUrl: Yup.string(),
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  updateThemeSettingRequest,
  getThemeSettingByCurrencyAndDomainRequest,
};
