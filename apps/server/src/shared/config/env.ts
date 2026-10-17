import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),
  CLIENT_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // JWT Secrets (with safe fallback for local dev)
  JWT_SECRET: z
    .string()
    .default("super-secret-access-key-change-in-production"),
  JWT_REFRESH_SECRET: z
    .string()
    .default("super-secret-refresh-key-change-in-production"),

  // Cloudinary Config (Optional in local dev)
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),

  // OAuth Credentials (Optional)
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
  GOOGLE_CLIENT_ID: z.string().optional().default(""),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

const parseEnv = (): Env => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ [Config]: Fatal error - Invalid environment configuration:");
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".") || "root"}: ${issue.message}`);
    });
    process.exit(1);
  }

  return result.data;
};

export const env = parseEnv();

