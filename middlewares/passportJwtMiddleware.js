import passport from "passport";
import { Strategy as JwtStrategy } from "passport-jwt";
import { appConfig } from "../config/app.js";

const extractFromCookie = (req) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies["jwt"];
  }
  return token;
};

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: extractFromCookie,
      secretOrKey: appConfig.JWT_SECRET,
    },
    (jwtPayload, done) => {
      return done(null, jwtPayload);
    }
  )
);

export default passport.authenticate("jwt", { session: false });
