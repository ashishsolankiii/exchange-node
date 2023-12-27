import { isValidObjectId } from "mongoose";
import Yup from "yup";

async function userLoginRequest(req) {
  const validationSchema = Yup.object().shape({
    username: Yup.string().required(),
    password: Yup.string().required(),
    ipAddress: Yup.string().nullable(true),
    description: Yup.string().nullable(true),
    city: Yup.string().nullable(true),
    country: Yup.string().nullable(true),
    platform: Yup.string().nullable(true)
  });

  await validationSchema.validate(req.body);

  return req;
}

async function userRegisterRequest(req) {
  req.body.username = req.body.username?.trim();
  req.body.password = req.body.password?.trim();

  const validationSchema = Yup.object().shape({
    username: Yup.string().required(),

    password: Yup.string().required(),

    confirmPassword: Yup.string()
      .oneOf([Yup.ref("password")], "Passwords must match")
      .required(),

    fullName: Yup.string().required(),

    currencyId: Yup.string()
      .required()
      .test("currencyId", "Invalid currencyId!", isValidObjectId),

    mobileNumber: Yup.string().length(10).required(),

    domainUrl: Yup.string().nullable(true),
  });

  await validationSchema.validate(req.body);

  return req;
}

async function userResetPasswordRequest(req) {
  const validationSchema = Yup.object().shape({
    userId: Yup.string().required(),
    oldPassword: Yup.string().required(),
    newPassword: Yup.string().required(),
    isForceChangePassword: Yup.string().required(),
  });

  await validationSchema.validate(req.body);

  return req;
}

export default {
  userLoginRequest,
  userRegisterRequest,
  userResetPasswordRequest,
};
