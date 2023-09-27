import Currency from "../../models/v1/Currency.js";

export default async function currencySeeder() {
  const seeder = {
    name: "Default Currency has been seeded!",
    hasSeeded: false,
    error: "",
  };

  try {
    const checkCurrency = await Currency.findOne({ name: "inr" });

    if (!checkCurrency) {
      await Currency.create({ name: "inr", countryName: "IN" });
      seeder.hasSeeded = true;
    }
  } catch (e) {
    seeder.error = e.message;
  }

  return seeder;
}
