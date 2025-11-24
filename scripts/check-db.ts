import { config } from "dotenv";
config({ path: ".env.local" });
import { MongoClient } from "mongodb";

function resolveMongoUri(): string {
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim().length > 0) {
    return process.env.MONGODB_URI;
  }
  const host = process.env.MONGODB_HOST || "localhost";
  const port = process.env.PORT_MONGODB || "27017";
  const user = process.env.MONGODB_USERNAME || process.env.MONGODB_USER || "";
  const pass = process.env.MONGODB_PASSWORD || process.env.MONGODB_PASS || "";
  const auth = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : "";
  return `mongodb://${auth}${host}:${port}`;
}

async function checkConnection() {
  const uri = resolveMongoUri();
  console.log(`Attempting to connect to: ${uri.replace(/:([^:@]+)@/, ":****@")}`); // Mask password

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

  try {
    console.log("Connecting...");
    await client.connect();
    console.log("✅ Connection successful!");
    await client.close();
    process.exit(0);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("❌ Connection failed:", error.message);
    } else {
      console.error("❌ Connection failed:", String(error));
    }
    process.exit(1);
  }
}

checkConnection();
