import { APP_MODULES } from "../../models/v1/AppModule.js";
import { USER_ROLE } from "../../models/v1/User.js";
import defaultStaticModules from "./defaultStaticModules.js";

// NOTE: These permissions are not stored in the database.
const permissions = [
  {
    key: defaultStaticModules.DASHBOARD,
    allowClonedUser: true,
    userRoles: [
      USER_ROLE.SYSTEM_OWNER,
      USER_ROLE.SUPER_ADMIN,
      USER_ROLE.ADMIN,
      USER_ROLE.SUPER_MASTER,
      USER_ROLE.MASTER,
      USER_ROLE.AGENT,
    ],
  },
  {
    key: APP_MODULES.ACCOUNT_MODULE,
    allowClonedUser: false,
    userRoles: [
      USER_ROLE.SYSTEM_OWNER,
      USER_ROLE.SUPER_ADMIN,
      USER_ROLE.ADMIN,
      USER_ROLE.SUPER_MASTER,
      USER_ROLE.MASTER,
    ],
  },
  {
    key: APP_MODULES.USER_MODULE,
    allowClonedUser: false,
    userRoles: [
      USER_ROLE.SYSTEM_OWNER,
      USER_ROLE.SUPER_ADMIN,
      USER_ROLE.ADMIN,
      USER_ROLE.SUPER_MASTER,
      USER_ROLE.MASTER,
      USER_ROLE.AGENT,
    ],
  },
  {
    key: defaultStaticModules.MULTI_LOGIN,
    allowClonedUser: false,
    userRoles: [USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.SUPER_MASTER, USER_ROLE.MASTER, USER_ROLE.AGENT],
  },
  {
    key: defaultStaticModules.CURRENCIES,
    allowClonedUser: false,
    userRoles: [USER_ROLE.SYSTEM_OWNER],
  },
  {
    key: defaultStaticModules.SPORTS,
    allowClonedUser: false,
    userRoles: [USER_ROLE.SYSTEM_OWNER],
  },
  {
    key: defaultStaticModules.COMPETITIONS,
    allowClonedUser: false,
    userRoles: [USER_ROLE.SYSTEM_OWNER],
  },
  {
    key: defaultStaticModules.EVENTS,
    allowClonedUser: false,
    userRoles: [USER_ROLE.SYSTEM_OWNER],
  },
  {
    key: defaultStaticModules.ADD_EVENT,
    allowClonedUser: false,
    userRoles: [USER_ROLE.SYSTEM_OWNER],
  },
  {
    key: APP_MODULES.THEME_USER_MODULE,
    allowClonedUser: false,
    userRoles: [USER_ROLE.SUPER_ADMIN],
  },
  {
    key: APP_MODULES.TRANSACTION_PANEL_USER_MODULE,
    allowClonedUser: false,
    userRoles: [USER_ROLE.MASTER],
  },
  {
    key: APP_MODULES.BANK_MODULE,
    allowClonedUser: false,
    userRoles: [
      USER_ROLE.SYSTEM_OWNER,
      USER_ROLE.SUPER_ADMIN,
      USER_ROLE.ADMIN,
      USER_ROLE.SUPER_MASTER,
      USER_ROLE.MASTER,
      USER_ROLE.AGENT,
    ],
  },
  {
    key: APP_MODULES.REPORT_MODULE,
    allowClonedUser: false,
    userRoles: [
      USER_ROLE.SYSTEM_OWNER,
      USER_ROLE.SUPER_ADMIN,
      USER_ROLE.ADMIN,
      USER_ROLE.SUPER_MASTER,
      USER_ROLE.MASTER,
      USER_ROLE.AGENT,
    ],
  },
  {
    key: defaultStaticModules.CASINO,
    allowClonedUser: false,
    userRoles: [USER_ROLE.SYSTEM_OWNER],
  },
  {
    key: defaultStaticModules.CASINO_GAME,
    allowClonedUser: false,
    userRoles: [USER_ROLE.SYSTEM_OWNER],
  },
];

export default permissions;
