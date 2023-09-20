import { APP_MODULES } from "../../models/v1/AppModule.js";

const permissions = [
  // Account Permissions
  {
    key: APP_MODULES.ACCOUNT_MODULE,
    active: false,
    subModules: [
      {
        key: APP_MODULES.ACCOUNT_CREATE,
        active: false,
      },
      {
        key: APP_MODULES.ACCOUNT_UPDATE,
        active: false,
      },
      // {
      //   key: APP_MODULES.ACCOUNT_DELETE,
      //   active: false,
      // },
      {
        key: APP_MODULES.ACCOUNT_DEPOSIT,
        active: false,
      },
      {
        key: APP_MODULES.ACCOUNT_WITHDRAW,
        active: false,
      },
    ],
  },

  // User Permission
  {
    key: APP_MODULES.USER_MODULE,
    active: false,
    subModules: [
      {
        key: APP_MODULES.USER_CREATE,
        active: false,
      },
      {
        key: APP_MODULES.USER_UPDATE,
        active: false,
      },
      // {
      //   key: APP_MODULES.USER_DELETE,
      //   active: false,
      // },
      {
        key: APP_MODULES.USER_STATUS_UPDATE,
        active: false,
      },
      {
        key: APP_MODULES.USER_BET_UPDATE,
        active: false,
      },
    ],
  },

  // Theme User Permissions
  {
    key: APP_MODULES.THEME_USER_MODULE,
    active: false,
    subModules: [
      {
        key: APP_MODULES.THEME_USER_CREATE,
        active: false,
      },
      {
        key: APP_MODULES.THEME_USER_UPDATE,
        active: false,
      },
      {
        key: APP_MODULES.THEME_USER_DELETE,
        active: false,
      },
    ],
  },

  // Transaction Panel User Permissions
  // {
  //   key: APP_MODULES.TRANSACTION_PANEL_USER_MODULE,
  //   active: false,
  //   subModules: [
  //     {
  //       key: APP_MODULES.TRANSACTION_PANEL_USER_CREATE,
  //       active: false,
  //     },
  //     {
  //       key: APP_MODULES.TRANSACTION_PANEL_USER_UPDATE,
  //       active: false,
  //     },
  //     {
  //       key: APP_MODULES.TRANSACTION_PANEL_USER_DELETE,
  //       active: false,
  //     },
  //   ],
  // },

  // Bank Permission
  {
    key: APP_MODULES.BANK_MODULE,
    active: false,
    subModules: [
      {
        key: APP_MODULES.BANK_DEPOSIT,
        active: false,
      },
      {
        key: APP_MODULES.BANK_WITHDRAW,
        active: false,
      },
    ],
  },

  // Report Permission
  {
    key: APP_MODULES.REPORT_MODULE,
    active: false,
    subModules: [
      {
        key: APP_MODULES.REPORT_ACCOUNT_STATEMENT,
        active: false,
      },
      {
        key: APP_MODULES.REPORT_USER_HISTORY,
        active: false,
      },
    ],
  },

  // Event Bet Permission
  {
    key: APP_MODULES.EVENT_BET_MODULE,
    active: false,
  },
];

export default permissions;
