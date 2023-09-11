import { APP_MODULES } from "../../models/v1/AppModule.js";

const modules = [
  // Account Permissions
  {
    name: "Account Module",
    key: APP_MODULES.ACCOUNT_MODULE,
  },
  {
    name: "Create",
    key: APP_MODULES.ACCOUNT_CREATE,
  },
  {
    name: "Update",
    key: APP_MODULES.ACCOUNT_UPDATE,
  },
  {
    name: "Delete",
    key: APP_MODULES.ACCOUNT_DELETE,
  },
  {
    name: "Deposit",
    key: APP_MODULES.ACCOUNT_DEPOSIT,
  },
  {
    name: "Withdraw",
    key: APP_MODULES.ACCOUNT_WITHDRAW,
  },

  // User Permission
  {
    name: "User Module",
    key: APP_MODULES.USER_MODULE,
  },
  {
    name: "Create",
    key: APP_MODULES.USER_CREATE,
  },
  {
    name: "Update",
    key: APP_MODULES.USER_UPDATE,
  },
  {
    name: "Delete",
    key: APP_MODULES.USER_DELETE,
  },
  {
    name: "Status Update",
    key: APP_MODULES.USER_STATUS_UPDATE,
  },
  {
    name: "Bet Update",
    key: APP_MODULES.USER_BET_UPDATE,
  },

  // Theme User Permissions
  {
    name: "Theme User Module",
    key: APP_MODULES.THEME_USER_MODULE,
  },
  {
    name: "Create",
    key: APP_MODULES.THEME_USER_CREATE,
  },
  {
    name: "Update",
    key: APP_MODULES.THEME_USER_UPDATE,
  },
  {
    name: "Delete",
    key: APP_MODULES.THEME_USER_DELETE,
  },

  // Transaction Panel User Permissions
  // {
  //   name: "Transaction Panel User Module",
  //   key: APP_MODULES.TRANSACTION_PANEL_USER_MODULE,
  // },
  // {
  //   name: "Create",
  //   key: APP_MODULES.TRANSACTION_PANEL_USER_CREATE,
  // },
  // {
  //   name: "Update",
  //   key: APP_MODULES.TRANSACTION_PANEL_USER_UPDATE,
  // },
  // {
  //   name: "Delete",
  //   key: APP_MODULES.TRANSACTION_PANEL_USER_DELETE,
  // },

  // Bank Permission
  {
    name: "Bank Module",
    key: APP_MODULES.BANK_MODULE,
  },
  {
    name: "Deposit",
    key: APP_MODULES.BANK_DEPOSIT,
  },
  {
    name: "Withdraw",
    key: APP_MODULES.BANK_WITHDRAW,
  },

  // Report Permissions
  {
    name: "Report Module",
    key: APP_MODULES.REPORT_MODULE,
  },
  {
    name: "Account Statement",
    key: APP_MODULES.REPORT_ACCOUNT_STATEMENT,
  },
  {
    name: "User History",
    key: APP_MODULES.REPORT_USER_HISTORY,
  },

  // Event Bet Permissions
  {
    name: "Event Bet Module",
    key: APP_MODULES.EVENT_BET_MODULE,
  },
];

export default modules;
