import { drizzle } from "drizzle-orm/mysql2"; // Hoặc postgres-js / libsql tùy DB bạn dùng
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL chưa được cấu hình.");
  }

  console.log("⏳ Đang tiến hành sync DB Schema...");
  
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  const db = drizzle(connection);

  // Đường dẫn tới thư mục chứa các file .sql do drizzle-kit generate ra
  await migrate(db, { migrationsFolder: "./drizzle" });

  console.log("✅ Sync DB thành công!");
  await connection.end();
  process.exit(0);
}

runMigration().catch((err) => {
  console.error("❌ Lỗi Migration:", err);
  process.exit(1);
});
