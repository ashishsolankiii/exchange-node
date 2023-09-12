import CryptoJS from "crypto-js";
import mongoose from "mongoose";
import { appConfig } from "../../config/app.js";
import ArrayProto from "../../lib/helpers/array-proto.js";
import defaultPermissions from "../../lib/permissions/defaultPermissions.js";
import defaultStaticModules from "../../lib/permissions/defaultStaticModules.js";
import defaultStaticPermissions from "../../lib/permissions/defaultStaticPermissions.js";
import AppModule, { APP_MODULES } from "../../models/v1/AppModule.js";
import Permission from "../../models/v1/Permission.js";
import User, { USER_ROLE } from "../../models/v1/User.js";

const encryptModules = (modulesObj) => {
  const modules = JSON.stringify(modulesObj);
  const encryptedModules = CryptoJS.AES.encrypt(modules, appConfig.PERMISSIONS_AES_SECRET).toString();
  return encryptedModules;
};

const fetchAppModules = () => {
  try {
    const encryptedModules = encryptModules({ ...APP_MODULES, ...defaultStaticModules });
    return encryptedModules;
  } catch (e) {
    throw new Error(e.message);
  }
};

const existingUserPermissions = async ({ userId }) => {
  try {
    const permissions = await Permission.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      { $unwind: "$modules" },
      {
        $project: {
          moduleId: "$modules.moduleId",
          isActive: "$modules.isActive",
          subModules: "$modules.subModules",
        },
      },
      {
        $lookup: {
          from: "app_modules",
          localField: "moduleId",
          foreignField: "_id",
          as: "appModule",
        },
      },
      {
        $unwind: "$appModule",
      },
      {
        $addFields: {
          key: "$appModule.key",
          name: "$appModule.name",
        },
      },
      {
        $unset: "appModule",
      },
      {
        $unwind: "$subModules",
      },
      {
        $lookup: {
          from: "app_modules",
          localField: "subModules.moduleId",
          foreignField: "_id",
          as: "subModules.appModule",
        },
      },
      {
        $unwind: "$subModules.appModule",
      },
      {
        $addFields: {
          "subModules.key": "$subModules.appModule.key",
          "subModules.name": "$subModules.appModule.name",
        },
      },
      {
        $unset: "subModules.appModule",
      },
      {
        $group: {
          _id: "$moduleId",
          key: { $first: "$key" },
          name: { $first: "$name" },
          isActive: { $first: "$isActive" },
          subModules: { $push: "$subModules" },
        },
      },
      { $sort: { name: 1 } },
    ]);

    return permissions;
  } catch (e) {
    throw new Error(e.message);
  }
};

const generateUserDefaultPermissions = async ({ userId }) => {
  try {
    const userPermission = {
      userId: userId,
      modules: [],
    };

    for (const permission of defaultPermissions) {
      const module = await AppModule.findOne({ key: permission.key });
      if (!module) {
        throw new Error(`Module with key ${permission.key} not found`);
      }

      const currentModule = {
        moduleId: module._id,
        isActive: permission.active,
        subModules: [],
      };

      if (permission.subModules?.length) {
        for (const subModule of permission.subModules) {
          const subModuleModule = await AppModule.findOne({ key: subModule.key });
          if (!subModuleModule) {
            throw new Error(`Module with key ${subModule.key} not found`);
          }

          currentModule.subModules.push({
            moduleId: subModuleModule._id,
            isActive: subModule.active,
          });
        }
      }

      userPermission.modules.push(currentModule);
    }

    if (userPermission.modules.length) {
      await Permission.create(userPermission);
    }
  } catch (e) {
    throw new Error(e.message);
  }
};

const fetchDefaultUserPermissions = async (encrypt = true) => {
  const allDefaultPermissions = [];
  const modulePromises = [];

  for (const permission of defaultPermissions) {
    modulePromises.push(AppModule.findOne({ key: permission.key }));
  }

  const modules = await Promise.all(modulePromises);

  for (let i = 0; i < modules.length; i++) {
    const module = modules[i];
    if (!module) {
      continue;
    }

    const currentModule = {
      _id: module._id,
      key: module.key,
      name: module.name,
      isActive: defaultPermissions[i].active,
      subModules: [],
    };

    if (defaultPermissions[i].subModules?.length) {
      const subModulePromises = [];
      for (const subModule of defaultPermissions[i].subModules) {
        subModulePromises.push(AppModule.findOne({ key: subModule.key }));
      }

      const subModules = await Promise.all(subModulePromises);

      for (let j = 0; j < subModules.length; j++) {
        const subModuleModule = subModules[j];
        if (!subModuleModule) {
          continue;
        }

        currentModule.subModules.push({
          _id: subModuleModule._id,
          key: subModuleModule.key,
          name: subModuleModule.name,
          isActive: defaultPermissions[i].subModules[j].active,
        });
      }
    }

    allDefaultPermissions.push(currentModule);
  }

  const sortedPermissions = new ArrayProto(allDefaultPermissions).sortByKeyAsc({
    key: "name",
    stringVal: true,
  });

  if (encrypt) {
    const encryptedPermissions = encryptModules(sortedPermissions);
    return encryptedPermissions;
  }

  return sortedPermissions;
};

const fetchUserPermissions = async ({ userId }) => {
  try {
    let permissions = await existingUserPermissions({ userId });

    if (permissions.length === 0) {
      await generateUserDefaultPermissions({ userId });
      permissions = await existingUserPermissions({ userId });
    }

    const encryptedPermissions = encryptModules(permissions);

    return encryptedPermissions;
  } catch (e) {
    throw new Error(e.message);
  }
};

const fetchUserActivePermissions = async ({ userId }) => {
  try {
    const user = await User.findById(userId, { username: 1, cloneParentId: 1, role: 1 });
    if (!user) {
      throw new Error("User not found!");
    }

    let activePermissions = [];

    if (user.cloneParentId) {
      const existingPermissions = await existingUserPermissions({ userId });

      activePermissions = existingPermissions.flatMap((permission) => {
        if (!permission.isActive) {
          return [];
        }
        const activeSubModules = permission.subModules?.filter((subModule) => subModule.isActive) ?? [];
        return [permission, ...activeSubModules].map((module) => module.key);
      });
    } else {
      activePermissions = defaultPermissions.flatMap((permission) => {
        const subModules = permission.subModules ?? [];
        return [permission, ...subModules].map((module) => module.key);
      });
    }

    let availableModules = activePermissions;

    const staticPermissions = defaultStaticPermissions
      .filter((permission) => permission.userRoles.includes(user.role))
      .filter((permission) => !activePermissions.includes(permission.key))
      .map((permission) => permission.key);

    const masterModules = [
      APP_MODULES.TRANSACTION_PANEL_USER_MODULE,
      APP_MODULES.TRANSACTION_PANEL_USER_CREATE,
      APP_MODULES.TRANSACTION_PANEL_USER_UPDATE,
      APP_MODULES.TRANSACTION_PANEL_USER_DELETE,
    ];

    const superAdminModules = [
      APP_MODULES.THEME_USER_MODULE,
      APP_MODULES.THEME_USER_CREATE,
      APP_MODULES.THEME_USER_UPDATE,
      APP_MODULES.THEME_USER_DELETE,
    ];

    if (user.cloneParentId) {
      const clonedUserStaticPermissions = defaultStaticPermissions
        .filter((permission) => permission.allowClonedUser === true)
        .map((permission) => permission.key);
      console.log(clonedUserStaticPermissions);
      availableModules.push(...clonedUserStaticPermissions);
    } else {
      availableModules.push(...staticPermissions);
    }

    if (![USER_ROLE.MASTER].includes(user.role)) {
      availableModules = availableModules.filter((module) => !masterModules.includes(module));
    }

    if (![USER_ROLE.SUPER_ADMIN].includes(user.role)) {
      availableModules = availableModules.filter((module) => !superAdminModules.includes(module));
    }

    const encryptedPermissions = encryptModules(availableModules);

    return encryptedPermissions;
  } catch (e) {
    throw new Error(e.message);
  }
};

const setUserPermissions = async ({ userId, moduleIds }) => {
  try {
    const newPermissions = [];
    const [defaultPermissions, existingPermissions] = await Promise.all([
      fetchDefaultUserPermissions(false),
      Permission.findOne({ userId }),
    ]);

    for (const permission of defaultPermissions) {
      const currentModule = {
        moduleId: permission._id,
        isActive: moduleIds.includes(permission._id.toString()),
        subModules: [],
      };

      if (permission.subModules?.length) {
        for (const subModule of permission.subModules) {
          currentModule.subModules.push({
            moduleId: subModule._id,
            isActive: moduleIds.includes(subModule._id.toString()),
          });
        }
      }

      newPermissions.push(currentModule);
    }

    if (newPermissions.length) {
      if (existingPermissions) {
        existingPermissions.modules = newPermissions;
        await existingPermissions.save();
      } else {
        await Permission.create({ userId, modules: newPermissions });
      }
    }

    return true;
  } catch (e) {
    throw new Error(e.message);
  }
};

export default {
  fetchAppModules,
  fetchDefaultUserPermissions,
  fetchUserPermissions,
  fetchUserActivePermissions,
  setUserPermissions,
};
