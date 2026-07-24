const { MongoClient } = require("mongodb");
require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME || "crowdfunding_db";

const campaigns = [
  {
    title: "Solar-Powered Water Purifier for Rural Communities",
    story: "Bringing clean drinking water to 10,000 households using solar distillation technology. Each unit can purify 500 liters per day with zero electricity.",
    category: "Technology",
    goal: 50000,
    minContribution: 10,
    deadline: new Date("2027-06-15"),
    reward: "Thank-you postcard from the community",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&q=80",
    raised: 42750,
    status: "approved",
    createdAt: new Date("2026-01-10"),
  },
  {
    title: "Urban Vertical Farm — Growing Food in the City",
    story: "Transforming an abandoned warehouse into a hydroponic vertical farm producing 5 tons of fresh vegetables monthly for local markets.",
    category: "Environment",
    goal: 75000,
    minContribution: 15,
    deadline: new Date("2027-03-01"),
    reward: "Weekly veggie box for 3 months",
    image: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800&q=80",
    raised: 38900,
    status: "approved",
    createdAt: new Date("2026-02-05"),
  },
  {
    title: "Handmade Eco-Friendly Furniture Collection",
    story: "A line of furniture crafted from reclaimed wood and sustainable materials. Each piece is hand-built by local artisans using traditional joinery.",
    category: "Design",
    goal: 25000,
    minContribution: 5,
    deadline: new Date("2026-12-20"),
    reward: "Miniature sample of the collection",
    image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80",
    raised: 31200,
    status: "approved",
    createdAt: new Date("2026-03-12"),
  },
  {
    title: "Indie Documentary: Voices of the Forgotten Coast",
    story: "A feature-length documentary exploring the lives of coastal communities facing rising sea levels. Filmed over 18 months across three continents.",
    category: "Film",
    goal: 40000,
    minContribution: 10,
    deadline: new Date("2027-05-01"),
    reward: "Digital download + credits in the film",
    image: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
    raised: 28500,
    status: "approved",
    createdAt: new Date("2026-01-22"),
  },
  {
    title: "Open-Source Learning Platform for Rural Students",
    story: "Building a free, offline-capable learning platform with AI-powered tutoring for students in areas with limited internet access.",
    category: "Education",
    goal: 30000,
    minContribution: 5,
    deadline: new Date("2027-04-10"),
    reward: "Early access + contributor badge",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800&q=80",
    raised: 22100,
    status: "approved",
    createdAt: new Date("2026-02-18"),
  },
  {
    title: "Community Music Studio & Youth Program",
    story: "Converting a vacant storefront into a fully equipped music studio offering free lessons and recording time for underprivileged youth.",
    category: "Music",
    goal: 20000,
    minContribution: 5,
    deadline: new Date("2026-11-30"),
    reward: "Name on the studio donor wall",
    image: "https://images.unsplash.com/photo-1519892300165-cb5542fb47c7?w=800&q=80",
    raised: 18750,
    status: "approved",
    createdAt: new Date("2026-03-01"),
  },
];

(async () => {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);

    // Find the first creator user (or any user) to use as the campaign creator
    let creatorUser = await db.collection("user").findOne({ role: "creator" });
    if (!creatorUser) {
      creatorUser = await db.collection("user").findOne({});
    }
    if (!creatorUser) {
      console.log("No users found in the database. Creating a fallback...");
      const result = await db.collection("user").insertOne({
        id: "user_seed_" + Date.now(),
        name: "Demo Creator",
        email: "demo@crowdfund.com",
        role: "creator",
        credits: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      creatorUser = await db.collection("user").findOne({ _id: result.insertedId });
    }

    const creatorId = creatorUser.id || String(creatorUser._id);
    const creatorName = creatorUser.name || "Demo Creator";
    const creatorEmail = creatorUser.email || "demo@crowdfund.com";

    // Check if campaigns already exist
    const existingCount = await db.collection("campaigns").countDocuments();
    if (existingCount > 0) {
      console.log(`${existingCount} campaigns already exist. Removing existing to re-seed...`);
      await db.collection("campaigns").deleteMany({});
    }

    const docs = campaigns.map((c) => ({
      ...c,
      creator: creatorId,
      creatorName,
      creatorEmail,
    }));

    const result = await db.collection("campaigns").insertMany(docs);
    console.log(`Inserted ${result.insertedCount} sample campaigns`);
    console.log(`Creator: ${creatorName} (${creatorEmail})`);

    const approved = await db.collection("campaigns").find({ status: "approved" }).sort({ raised: -1 }).toArray();
    console.log("\nTop Funded Campaigns:");
    approved.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.title} — ${c.raised} credits raised`);
    });

    await client.close();
    console.log("\nDone.");
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
})();
