import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { equipment } from "../src/server/db/schema.js";
import { type EquipmentCategory } from "../src/types.js";

// Load environment variables
config();

// Direct database connection for seeding
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

const client = postgres(connectionString);
const db = drizzle(client);

const equipmentData = {
    core_equipment: [
        { english: "Slide", icelandic: "Rennibraut" },
        { english: "Swing", icelandic: "Róla" },
        { english: "Seesaw", icelandic: "Vagga" },
        { english: "Climbing Frame / Jungle Gym", icelandic: "Klifurgrind / Klifurkastali" },
        { english: "Sandbox", icelandic: "Sandkassi" },
        { english: "Multi-Play System", icelandic: "Leiktækjakerfi / Margþætt leiktæki" }
    ],
    climbing_and_movement: [
        { english: "Monkey Bars", icelandic: "Armgangur" },
        { english: "Aparóla (swinging monkey bars)", icelandic: "Aparóla" },
        { english: "Climbing Wall", icelandic: "Klifurveggur" },
        { english: "Rope Climber / Climbing Net", icelandic: "Klifurnet" },
        { english: "Balance Beam", icelandic: "Jafnvægispallur" },
        { english: "Stepping Stones", icelandic: "Stígursteinar" },
        { english: "Fireman Pole", icelandic: "Brunastöng" }
    ],
    imaginative_and_themed: [
        { english: "Playhouse", icelandic: "Leikhús / Leikhúsbústaður" },
        { english: "Play Car", icelandic: "Leikbíl" },
        { english: "Play Train", icelandic: "Leiklest" },
        { english: "Play Boat / Viking Ship", icelandic: "Leikbátur / Víkingaskip" },
        { english: "Tunnel", icelandic: "Göng" }
    ],
    spinning_and_motion: [
        { english: "Merry-Go-Round", icelandic: "Hringekja" },
        { english: "Spinner Bowl / Spinning Top", icelandic: "Snúningsskál / Snúandi toppur" },
        { english: "Spinner", icelandic: "Snúari" }
    ],
    fitness_and_obstacle: [
        { english: "Pull-Up Bar", icelandic: "Upphífingastöng / Upphífingastangir" },
        { english: "Outdoor Gym Equipment", icelandic: "Útivistarþjálfunartæki / Útigymtæki" },
        { english: "Obstacle Course Elements", icelandic: "Hindrunabrautarhlutir" },
        { english: "Zip Line", icelandic: "Renningabraut" }
    ],
    toddler_friendly: [
        { english: "Baby Swing", icelandic: "Barnaróla" },
        { english: "Small Slide", icelandic: "Lítil rennibraut" },
        { english: "Rocking Animal / Spring Rider", icelandic: "Gungudýr / Gungufígúra" },
        { english: "Soft Play Area", icelandic: "Mjúkt leiksvæði" }
    ],
    additional_common_equipment: [
        { english: "Trampoline", icelandic: "Trampólín" },
        { english: "Jumping Pillow", icelandic: "Stökkpúði / Ærslabelgur" },
        { english: "Basketball Hoop", icelandic: "Körfuboltakarfa" },
        { english: "Football Goal", icelandic: "Fótboltamark" }
    ]
};

async function seedEquipment() {
    console.log("🌱 Starting equipment seeding...");

    try {
        // Clear existing equipment data
        console.log("🧹 Clearing existing equipment data...");
        await db.delete(equipment);

        // Insert all equipment data
        const equipmentInserts: Array<{
            nameEnglish: string;
            nameIcelandic: string;
            category: EquipmentCategory;
        }> = [];

        for (const [category, items] of Object.entries(equipmentData)) {
            for (const item of items) {
                equipmentInserts.push({
                    nameEnglish: item.english,
                    nameIcelandic: item.icelandic,
                    category: category as EquipmentCategory,
                });
            }
        }

        console.log(`📦 Inserting ${equipmentInserts.length} equipment items...`);
        await db.insert(equipment).values(equipmentInserts);

        console.log("✅ Equipment seeding completed successfully!");

        // Log summary
        const summary = Object.entries(equipmentData).map(([category, items]) =>
            `  ${category}: ${items.length} items`
        ).join('\n');

        console.log("📊 Summary:");
        console.log(summary);

    } catch (error) {
        console.error("❌ Error seeding equipment:", error);
        throw error;
    } finally {
        await client.end();
    }
}

// Run the seeder if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    seedEquipment()
        .then(() => {
            console.log("🎉 Seeding complete!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("💥 Seeding failed:", error);
            process.exit(1);
        });
}

export { seedEquipment }; 