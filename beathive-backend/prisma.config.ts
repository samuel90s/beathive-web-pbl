import "dotenv/config";
import { defineConfig } from "@prisma/config";

export default defineConfig({
  datasource: {
    url: "postgresql://postgres:admin@localhost:5432/beathive_db",
  },
});