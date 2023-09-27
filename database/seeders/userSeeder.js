//Import Users module
import { encryptPassword } from "../../lib/io-guards/auth.js";
import Currency from "../../models/v1/Currency.js";
import User, { USER_ROLE } from "../../models/v1/User.js";

export default async function userSeeder() {
  const seeder = {
    name: "System Owner User",
    hasSeeded: false,
    error: "",
  };

  try {
    //check if there is any user with role "system_owner"
    const superOwner = await User.findOne({ role: USER_ROLE.SYSTEM_OWNER });
    if (!superOwner) {
      //Get inr currency id
      const inrCurrency = await Currency.findOne({ name: "inr" });

      //Encrypt Password
      const encryptedPassword = await encryptPassword("123456");

      //Create Object for user
      const user = {
        currencyId: inrCurrency._id,
        username: "system_owner",
        password: encryptedPassword,
        fullName: "System Owner",
        role: USER_ROLE.SYSTEM_OWNER,
        creditPoints: 1000000,
        balance: 1000000,
      };

      //Create Default System Owner
      await User.create(user);
      seeder.hasSeeded = true;
    }
  } catch (e) {
    seeder.error = e.message;
  }

  return seeder;
}
