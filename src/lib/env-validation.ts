export function validateEnv() {
  const missingVariables: string[] = [];

  const requiredVariables = [
    "TURSO_DATABASE_URL",
    "NEXTAUTH_SECRET",
    "SESSION_SECRET",
  ];

  for (const envVar of requiredVariables) {
    if (!process.env[envVar]) {
      missingVariables.push(envVar);
    }
  }

  if (missingVariables.length > 0) {
    throw new Error(`Variabel environment wajib berikut tidak ditemukan: ${missingVariables.join(", ")}`);
  }
}
