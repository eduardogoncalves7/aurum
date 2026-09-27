import { getPool } from "@/lib/db";
import { getPublicConfig, PublicConfig } from "@/lib/config";

const keys: Record<keyof PublicConfig, string> = {
  whatsappDestination: "whatsappDestination", address: "address", instagram: "instagram", phone: "phone", hours: "hours",
};

export async function readSiteSettings(): Promise<PublicConfig> {
  const defaults = getPublicConfig();
  try {
    const { rows } = await getPool().query("SELECT chave, valor FROM site_settings");
    const result = { ...defaults };
    for (const [key, dbKey] of Object.entries(keys) as [keyof PublicConfig, string][]) {
      const row = rows.find((item) => item.chave === dbKey);
      if (row) result[key] = row.valor;
    }
    return result;
  } catch { return defaults; }
}

export async function writeSiteSettings(values: PublicConfig): Promise<PublicConfig> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const [key, dbKey] of Object.entries(keys) as [keyof PublicConfig, string][]) {
      await client.query("INSERT INTO site_settings (chave,valor) VALUES ($1,$2) ON CONFLICT (chave) DO UPDATE SET valor=EXCLUDED.valor, atualizado_em=now()", [dbKey, String(values[key]).trim()]);
    }
    await client.query("COMMIT");
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
  return readSiteSettings();
}
