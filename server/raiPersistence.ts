import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { loadRaiEnvironment } from "./env.js";
import type { RaiChatRequest, RaiChatResponse } from "./raiChatService.js";

type LibraryItemInput = {
  name: string;
  type: "image" | "file" | "report" | "spreadsheet" | "insight";
  source: "upload" | "rai";
  metadata?: Record<string, unknown>;
  tenantId?: string;
  branchId?: string;
};

let sqlClient: NeonQueryFunction<false, false> | undefined;

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export async function persistRaiChatExchange(
  request: RaiChatRequest,
  response: RaiChatResponse
): Promise<string | undefined> {
  const sql = getSqlClient();
  if (!sql) {
    return undefined;
  }

  const tenantId = normalizeScope(request.tenantId, "demo-tenant");
  const branchId = normalizeScope(request.branchIds?.[0], "main-branch");
  const sessionId = await resolveSessionId(sql, {
    requestedSessionId: request.sessionId,
    tenantId,
    branchId,
    title: createSessionTitle(request.message)
  });

  await sql`
    INSERT INTO rai_chat_messages (session_id, role, content)
    VALUES (${sessionId}, 'user', ${request.message})
  `;

  await sql`
    INSERT INTO rai_chat_messages (
      session_id,
      role,
      content,
      report,
      orchestration_mode,
      model
    )
    VALUES (
      ${sessionId},
      'assistant',
      ${response.assistantText},
      ${JSON.stringify(response.report)}::jsonb,
      ${response.orchestrationMode},
      ${response.model ?? null}
    )
  `;

  await sql`
    UPDATE rai_chat_sessions
    SET updated_at = now()
    WHERE id = ${sessionId}
  `;

  await audit(sql, {
    tenantId,
    branchId,
    action: "chat.exchange.persisted",
    targetType: "chat_session",
    targetId: sessionId,
    metadata: {
      toolName: response.report.toolName,
      orchestrationMode: response.orchestrationMode
    }
  });

  return sessionId;
}

export async function listLibraryItems(tenantId = "demo-tenant") {
  const sql = getSqlClient();
  if (!sql) {
    return [];
  }

  return sql`
    SELECT id, name, type, source, metadata, created_at
    FROM rai_library_items
    WHERE tenant_id = ${normalizeScope(tenantId, "demo-tenant")}
    ORDER BY created_at DESC
    LIMIT 100
  `;
}

export async function saveLibraryItem(item: LibraryItemInput) {
  const sql = getSqlClient();
  if (!sql) {
    return undefined;
  }

  const tenantId = normalizeScope(item.tenantId, "demo-tenant");
  const branchId = normalizeScope(item.branchId, "main-branch");
  const [saved] = await sql`
    INSERT INTO rai_library_items (tenant_id, branch_id, name, type, source, metadata)
    VALUES (
      ${tenantId},
      ${branchId},
      ${item.name},
      ${item.type},
      ${item.source},
      ${JSON.stringify(item.metadata ?? {})}::jsonb
    )
    RETURNING id, name, type, source, metadata, created_at
  `;

  await audit(sql, {
    tenantId,
    branchId,
    action: "library.item.saved",
    targetType: "library_item",
    targetId: String((saved as { id?: unknown }).id ?? ""),
    metadata: { name: item.name, type: item.type, source: item.source }
  });

  return saved;
}

function getSqlClient(): NeonQueryFunction<false, false> | undefined {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    return undefined;
  }

  sqlClient ??= neon(databaseUrl);
  return sqlClient;
}

function getDatabaseUrl(): string | undefined {
  loadRaiEnvironment();
  return process.env.POSTGRES_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL_NON_POOLING;
}

async function resolveSessionId(
  sql: NeonQueryFunction<false, false>,
  input: {
    requestedSessionId?: string;
    tenantId: string;
    branchId: string;
    title: string;
  }
): Promise<string> {
  if (input.requestedSessionId) {
    const existing = await sql`
      SELECT id
      FROM rai_chat_sessions
      WHERE id = ${input.requestedSessionId}
        AND tenant_id = ${input.tenantId}
        AND archived_at IS NULL
      LIMIT 1
    `;

    if (existing[0]) {
      return String((existing[0] as { id: string }).id);
    }
  }

  const [session] = await sql`
    INSERT INTO rai_chat_sessions (tenant_id, branch_id, title)
    VALUES (${input.tenantId}, ${input.branchId}, ${input.title})
    RETURNING id
  `;
  return String((session as { id: string }).id);
}

async function audit(
  sql: NeonQueryFunction<false, false>,
  event: {
    tenantId: string;
    branchId: string;
    action: string;
    targetType: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
  }
) {
  await sql`
    INSERT INTO rai_audit_events (
      tenant_id,
      branch_id,
      action,
      target_type,
      target_id,
      metadata
    )
    VALUES (
      ${event.tenantId},
      ${event.branchId},
      ${event.action},
      ${event.targetType},
      ${event.targetId ?? null},
      ${JSON.stringify(event.metadata ?? {})}::jsonb
    )
  `;
}

function normalizeScope(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed || fallback;
}

function createSessionTitle(message: string): string {
  const title = message.trim().replace(/\s+/g, " ");
  return title.length > 80 ? `${title.slice(0, 77)}...` : title || "New Rai chat";
}
