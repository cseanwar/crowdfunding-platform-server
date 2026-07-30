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
  {
    title: "AI-Powered Crop Disease Detector",
    story: "A mobile app that uses computer vision to detect crop diseases in real-time, helping small farmers save their harvests without expensive consultants.",
    category: "Technology",
    goal: 35000,
    minContribution: 5,
    deadline: new Date("2027-02-28"),
    reward: "Early beta access + personalized farm report",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800&q=80",
    raised: 15800,
    status: "approved",
    createdAt: new Date("2026-04-05"),
  },
  {
    title: "The Last Library — A Graphic Novel",
    story: "A dystopian graphic novel about a librarian who preserves banned books in an underground bunker. Hand-illustrated in ink and watercolor.",
    category: "Film",
    goal: 18000,
    minContribution: 10,
    deadline: new Date("2026-10-15"),
    reward: "Signed print + name in the credits",
    image: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80",
    raised: 14200,
    status: "approved",
    createdAt: new Date("2026-03-20"),
  },
  {
    title: "Portable Wind Turbine for Disaster Relief",
    story: "A collapsible, lightweight wind turbine that two people can carry and deploy in under 30 minutes. Designed for emergency response teams.",
    category: "Technology",
    goal: 60000,
    minContribution: 20,
    deadline: new Date("2027-07-01"),
    reward: "Behind-the-scenes build diary",
    image: "https://images.unsplash.com/photo-1466611653917-95079337c7c4?w=800&q=80",
    raised: 9800,
    status: "approved",
    createdAt: new Date("2026-05-01"),
  },
  {
    title: "Reviving the Coral Reefs of Palawan",
    story: "An underwater reforestation project using 3D-printed reef structures seeded with live coral fragments. Aiming to restore 5 hectares of reef.",
    category: "Environment",
    goal: 45000,
    minContribution: 10,
    deadline: new Date("2027-08-20"),
    reward: "Live dive-stream access + adoption certificate",
    image: "https://images.unsplash.com/photo-1546026423-cc4642628d2b?w=800&q=80",
    raised: 23400,
    status: "approved",
    createdAt: new Date("2026-04-12"),
  },
  {
    title: "Zero-Waste Fermentation Kitchen",
    story: "Opening a community kitchen that transforms local food waste into fermented products — kimchi, kombucha, miso, and more — with free workshops.",
    category: "Design",
    goal: 22000,
    minContribution: 5,
    deadline: new Date("2026-09-30"),
    reward: "Fermentation starter kit + recipe book",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&q=80",
    raised: 17100,
    status: "approved",
    createdAt: new Date("2026-04-28"),
  },
  {
    title: "Street Art Mural Festival — Downtown Revival",
    story: "Bringing 20 international muralists to transform blank walls in the downtown core into a massive open-air gallery. Three-day festival with live painting.",
    category: "Design",
    goal: 28000,
    minContribution: 5,
    deadline: new Date("2026-11-01"),
    reward: "Limited edition festival poster",
    image: "https://images.unsplash.com/photo-1561214115-f2f134cc4912?w=800&q=80",
    raised: 20300,
    status: "approved",
    createdAt: new Date("2026-05-15"),
  },
  {
    title: "Children's Book: The Engine That Wanted to Fly",
    story: "A beautifully illustrated 48-page children's book about a little steam engine who dreams of flying. Written by an award-winning educator.",
    category: "Education",
    goal: 12000,
    minContribution: 5,
    deadline: new Date("2026-08-15"),
    reward: "Signed copy + bookmark set",
    image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
    raised: 10900,
    status: "approved",
    createdAt: new Date("2026-05-20"),
  },
  {
    title: "Recording Debut Album: 'Tides of Nowhere'",
    story: "An indie-folk duo's debut album recorded in a coastal chapel. Analog tape, vintage mics, and a string quartet. Limited vinyl pressing included.",
    category: "Music",
    goal: 15000,
    minContribution: 10,
    deadline: new Date("2026-10-01"),
    reward: "Vinyl LP + digital download + lyric zine",
    image: "https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=800&q=80",
    raised: 12700,
    status: "approved",
    createdAt: new Date("2026-06-01"),
  },
  {
    title: "Neighborhood Tool Library & Repair Cafe",
    story: "A community space where neighbors can borrow tools, learn repairs, and keep items out of landfills. Starting with 200+ tools and monthly workshops.",
    category: "Education",
    goal: 16000,
    minContribution: 5,
    deadline: new Date("2026-12-01"),
    reward: "Founding member card + free workshop pass",
    image: "https://images.unsplash.com/photo-1581147036324-7b16e1012806?w=800&q=80",
    raised: 7500,
    status: "approved",
    createdAt: new Date("2026-06-10"),
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
