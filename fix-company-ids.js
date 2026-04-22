const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const mongoose = require("mongoose");
require("dotenv").config();

const BAJAJ_COMPANY_ID = "69de7345ce14ce836a33600b";

async function fixCompanyIds() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4 });
  console.log("Connected to MongoDB");

  const Risk = require("./models/Risk");
  const Asset = require("./models/Asset");
  const Control = require("./models/Control");
  const Treatment = require("./models/Treatment");

  // Fix risks - assign companyId to all records that don't have one
  const r1 = await Risk.updateMany(
    { $or: [{ companyId: null }, { companyId: { $exists: false } }] },
    { $set: { companyId: BAJAJ_COMPANY_ID } }
  );
  console.log(`✅ Risks updated: ${r1.modifiedCount}`);

  // Fix assets
  const r2 = await Asset.updateMany(
    { $or: [{ companyId: null }, { companyId: { $exists: false } }] },
    { $set: { companyId: BAJAJ_COMPANY_ID } }
  );
  console.log(`✅ Assets updated: ${r2.modifiedCount}`);

  // Fix controls
  const r3 = await Control.updateMany(
    { $or: [{ companyId: null }, { companyId: { $exists: false } }] },
    { $set: { companyId: BAJAJ_COMPANY_ID } }
  );
  console.log(`✅ Controls updated: ${r3.modifiedCount}`);

  // Fix treatments
  const r4 = await Treatment.updateMany(
    { $or: [{ companyId: null }, { companyId: { $exists: false } }] },
    { $set: { companyId: BAJAJ_COMPANY_ID } }
  );
  console.log(`✅ Treatments updated: ${r4.modifiedCount}`);

  // Verify
  const riskCount = await Risk.countDocuments({ companyId: BAJAJ_COMPANY_ID });
  const assetCount = await Asset.countDocuments({ companyId: BAJAJ_COMPANY_ID });
  const controlCount = await Control.countDocuments({ companyId: BAJAJ_COMPANY_ID });
  const treatmentCount = await Treatment.countDocuments({ companyId: BAJAJ_COMPANY_ID });
  
  console.log("\n📊 After fix - Bajaj company data:");
  console.log(`   Risks: ${riskCount}`);
  console.log(`   Assets: ${assetCount}`);
  console.log(`   Controls: ${controlCount}`);
  console.log(`   Treatments: ${treatmentCount}`);

  await mongoose.disconnect();
  process.exit(0);
}

fixCompanyIds().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
