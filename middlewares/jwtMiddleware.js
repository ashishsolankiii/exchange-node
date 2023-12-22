import passport from "passport";
import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";
import { appConfig } from "../config/app.js";

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: appConfig.JWT_SECRET,
    },
    (jwtPayload, done) => {
      return done(null, jwtPayload);
    }
  )
);

export default passport.authenticate('jwt', { session: false });
