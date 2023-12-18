import bodyParser from "body-parser";
import express from "express";
import fileUpload from "express-fileupload";
import { createServer } from "http";
import moment from "moment";
import cron from "node-cron";
import { appConfig } from "./config/app.js";
import cronController from "./controllers/v1/cronController.js";
import dbConnection from "./database/connect.js";
import { settleHandshake } from "./lib/io-guards/encryption.js";
import corsMiddleware from "./middlewares/corsMiddleware.js";
import encryptResponseInterceptor from "./middlewares/encryptionMiddleware.js";
import loggerMiddleware from "./middlewares/loggerMiddleware.js";
import apiRoutes from "./routes/apiRoutes.js";
import { initSocket } from "./socket/index.js";
import expressSession from "express-session";
import passport from 'passport';
import User from "./models/v1/User.js";



// import cookieParser from 'cookie-parser';


const app = express();
const server = createServer(app);
// app.use(expressSession({ secret: 'your-secret-key', resave: true, saveUninitialized: true }));
app.use(
  expressSession({
    secret: 'your-secret-key', // Change this to a secure key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, maxAge: 60000 }, // Session expires after 1 minute (adjust as needed)
  })
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
// app.use(cookieParser());
app.use(
  fileUpload({
    safeFileNames: true,
    preserveExtension: true,
    parseNested: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());


// Serialize user to store in the session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from the session
passport.deserializeUser((_id, done) => {
  const user = User.findById(_id);
  done(null, user);
});

app.get('/total-users', (req, res) => {
  if (!req.sessionStore) {
    res.status(500).send('Session store not available.');
    return;
  }

  // Get all active sessions
  req.sessionStore.all((err, sessions) => {
    // console.log(sessions);
    if (err) {
      res.status(500).send('Error fetching sessions');
      return;
    }

    // Count unique users from active sessions
    let activeUsers = [];
    Object.values(sessions).forEach((sess) => {

      if (sess.users) {
        console.log(sess.users);
        console.log(Object.keys(sess.users));
        activeUsers = Object.keys(sess.users);
      }
    });

    res.json({ totalUsers: activeUsers.length });
  });
});

// app.get('/total-users1', (req, res) => {
//   let totalUsers = 0;
//   if (req.cookies.users) {
//     const users = JSON.parse(req.cookies.users);
//     totalUsers = users;
//   }

//   res.json({ totalUsers });
// });

// app.get('/logout', (req, res) => {
//   const userId = req.cookies.userId;

//   // Parse the JSON array of users from the cookie
//   const users = JSON.parse(req.cookies.users || '[]');

//   // Remove the logged-out user from the array
//   const updatedUsers = users.filter(user => user.id !== '650d793bb0da7546fd62a0a8');

//   // Set the updated cookie with the filtered array
//   res.cookie('users', JSON.stringify(updatedUsers), { maxAge: 30 * 60 * 1000 }); // Expires in 30 minutes

//   res.json({ message: 'Logout successful' });
// });

app.use(corsMiddleware);
app.use(loggerMiddleware);

app.use("/handshake", settleHandshake);

app.use("/api", encryptResponseInterceptor, apiRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Hello from CA Exchange API!",
    metadata: {
      utc_time: moment().utc().format("DD-MM-YYYY HH:mm:ss z"),
      server_time: moment().format("DD-MM-YYYY HH:mm:ss"),
    },
  });
});

dbConnection();

initSocket(server);

// Cron Job for sync market
cron.schedule("0 2 * * *", async function () {
  // For market sync data

  await Promise.all([cronController.syncDetail(),
  cronController.getActiveEvent(),
  cronController.completeCompetition()]);
});

// Cron Job for live event
cron.schedule("* * * * *", async function () {
  // For market sync data
  await cronController.getLiveEvent();

});

server.listen(appConfig.PORT, () => {
  console.log(`Server running on port: ${appConfig.PORT}`);
});
