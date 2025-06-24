// import { config } from "dotenv";
// import { drizzle } from "drizzle-orm/postgres-js";
// import postgres from "postgres";
// import { equipment } from "../src/server/db/schema.js";
// import { type EquipmentCategory, type MultilingualName } from "../src/types.js";

// // Load environment variables
// config();

// // Direct database connection for seeding
// const connectionString = process.env.DATABASE_URL;
// if (!connectionString) {
//     throw new Error("DATABASE_URL environment variable is required");
// }

// const client = postgres(connectionString);
// const db = drizzle(client);

// const equipmentData = {
//     core_equipment: [
//         "equipment.items.slide",
//         "equipment.items.swing",
//         "equipment.items.seesaw",
//         "equipment.items.climbing_frame",
//         "equipment.items.sandbox",
//         "equipment.items.multi_play_system"
//     ],
//     climbing_and_movement: [
//         "equipment.items.monkey_bars",
//         "equipment.items.aparola",
//         "equipment.items.climbing_wall",
//         "equipment.items.rope_climber",
//         "equipment.items.balance_beam",
//         "equipment.items.stepping_stones",
//         "equipment.items.fireman_pole"
//     ],
//     imaginative_and_themed: [
//         "equipment.items.playhouse",
//         "equipment.items.play_car",
//         "equipment.items.play_train",
//         "equipment.items.play_boat",
//         "equipment.items.tunnel"
//     ],
//     spinning_and_motion: [
//         "equipment.items.merry_go_round",
//         "equipment.items.spinner_bowl",
//         "equipment.items.spinner"
//     ],
//     fitness_and_obstacle: [
//         "equipment.items.pull_up_bar",
//         "equipment.items.outdoor_gym",
//         "equipment.items.obstacle_course",
//         "equipment.items.zip_line"
//     ],
//     toddler_friendly: [
//         "equipment.items.baby_swing",
//         "equipment.items.small_slide",
//         "equipment.items.rocking_animal",
//         "equipment.items.soft_play_area"
//     ],
//     additional_common_equipment: [
//         "equipment.items.trampoline",
//         "equipment.items.jumping_pillow",
//         "equipment.items.basketball_hoop",
//         "equipment.items.football_goal"
//     ]
// };

// async function seedEquipment() {
//     console.log("🌱 Starting equipment seeding...");

//     try {
//         // Clear existing equipment data
//         console.log("🧹 Clearing existing equipment data...");
//         await db.delete(equipment);

//         // Insert all equipment data
//         const equipmentInserts: Array<{
//             name: MultilingualName;
//             category: EquipmentCategory;
//         }> = [];

//         for (const [category, items] of Object.entries(equipmentData)) {
//             for (const item of items) {
//                 equipmentInserts.push({
//                     name: {
//                         is: item, // Use the translation key as Icelandic name for now
//                         en: undefined,
//                         pl: undefined,
//                     },
//                     category: category as EquipmentCategory,
//                 });
//             }
//         }

//         console.log(`📦 Inserting ${equipmentInserts.length} equipment items...`);
//         await db.insert(equipment).values(equipmentInserts);

//         console.log("✅ Equipment seeding completed successfully!");

//         // Log summary
//         const summary = Object.entries(equipmentData).map(([category, items]) =>
//             `  ${category}: ${items.length} items`
//         ).join('\n');

//         console.log("📊 Summary:");
//         console.log(summary);

//     } catch (error) {
//         console.error("❌ Error seeding equipment:", error);
//         throw error;
//     } finally {
//         await client.end();
//     }
// }

// // Run the seeder if this file is executed directly
// if (import.meta.url === `file://${process.argv[1]}`) {
//     seedEquipment()
//         .then(() => {
//             console.log("🎉 Seeding complete!");
//             process.exit(0);
//         })
//         .catch((error) => {
//             console.error("💥 Seeding failed:", error);
//             process.exit(1);
//         });
// }

// export { seedEquipment }; 