/**
 * Agrégat de revenus du mois courant — cron quotidien 02:00 UTC.
 *
 * La Cloud Function faisait ~45 lignes : lecture des transactions, regroupement
 * en mémoire par ligne de métier, puis `db.batch()` d'écriture. En SQL, c'est
 * UNE instruction. Idempotente : rejouée, elle converge vers le même état.
 */
import type { Env } from "../auth/context";

export async function aggregateRevenue(env: Env): Promise<number> {
  const now = new Date();
  const monthStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const period = now.toISOString().slice(0, 7); // AAAA-MM

  const res = await env.DB.prepare(
    `INSERT INTO revenue_reports
       (id, period, date, line_of_business, gross_revenue, fees, commissions,
        net_revenue, transactions_count, new_customers, churned_customers, created_at)
     SELECT ?1 || '_' || line_of_business, 'monthly', ?1, line_of_business,
            COALESCE(sum(amount), 0), COALESCE(sum(fees), 0), 0,
            COALESCE(sum(net_amount), 0), count(*), 0, 0, ?2
       FROM transactions
      WHERE status = 'completed' AND created_at >= ?3
      GROUP BY line_of_business
     ON CONFLICT(id) DO UPDATE SET
       gross_revenue = excluded.gross_revenue,
       fees = excluded.fees,
       net_revenue = excluded.net_revenue,
       transactions_count = excluded.transactions_count`,
  )
    .bind(period, Date.now(), monthStart)
    .run();

  return res.meta.changes ?? 0;
}
