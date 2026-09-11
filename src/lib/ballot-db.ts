import "server-only";
import { neon } from "@neondatabase/serverless";
import { directorySuggestions, normalizeName, presetCandidates, type CandidateRecord, type Submission } from "@/lib/ballot";

type CandidateKind = "preset" | "suggestion";
type SqlClient = ReturnType<typeof neon>;

let client: SqlClient | null = null;
let schemaPromise: Promise<void> | null = null;

function sqlClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL chưa được cấu hình.");
  client ??= neon(connectionString);
  return client;
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    familyName: parts.slice(0, -1).join(" "),
    givenName: parts.at(-1) ?? fullName,
  };
}

function seedRecords(names: string[]): CandidateRecord[] {
  return names.map((fullName, index) => {
    const split = splitName(fullName);
    return { stt: index + 1, fullName, familyName: split.familyName, givenName: split.givenName, birthYear: null };
  });
}

async function initializeSchema() {
  const sql = sqlClient();
  await sql`
    CREATE TABLE IF NOT EXISTS ballots (
      id TEXT PRIMARY KEY,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS ballot_selections (
      ballot_id TEXT NOT NULL REFERENCES ballots(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      candidate_name VARCHAR(150) NOT NULL,
      PRIMARY KEY (ballot_id, position)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS ballot_candidates (
      kind VARCHAR(20) NOT NULL CHECK (kind IN ('preset', 'suggestion')),
      stt INTEGER NOT NULL,
      full_name VARCHAR(150) NOT NULL,
      normalized_name VARCHAR(150) NOT NULL,
      family_name VARCHAR(150) NOT NULL DEFAULT '',
      given_name VARCHAR(80) NOT NULL DEFAULT '',
      birth_year INTEGER,
      PRIMARY KEY (kind, normalized_name)
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS hidden_candidates (
      normalized_name VARCHAR(150) PRIMARY KEY,
      candidate_name VARCHAR(150) NOT NULL,
      hidden_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS ballot_selections_name_idx ON ballot_selections (candidate_name)`;
  await seedCandidateKind("preset", seedRecords(presetCandidates));
  await seedCandidateKind("suggestion", seedRecords(directorySuggestions));
}

export async function ensureSchema() {
  schemaPromise ??= initializeSchema().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

async function insertCandidateRecords(kind: CandidateKind, records: CandidateRecord[]) {
  const sql = sqlClient();
  const json = JSON.stringify(records.map((record, index) => ({
    stt: Number.isFinite(record.stt) ? record.stt : index + 1,
    fullName: record.fullName.replace(/\s+/g, " ").trim().toUpperCase(),
    normalizedName: normalizeName(record.fullName),
    familyName: record.familyName?.replace(/\s+/g, " ").trim() || "",
    givenName: record.givenName?.replace(/\s+/g, " ").trim() || "",
    birthYear: record.birthYear ?? null,
  })));

  return sql`
    INSERT INTO ballot_candidates (kind, stt, full_name, normalized_name, family_name, given_name, birth_year)
    SELECT ${kind}, data.stt, data."fullName", data."normalizedName", data."familyName", data."givenName", data."birthYear"
    FROM jsonb_to_recordset(${json}::jsonb) AS data(
      stt INTEGER,
      "fullName" TEXT,
      "normalizedName" TEXT,
      "familyName" TEXT,
      "givenName" TEXT,
      "birthYear" INTEGER
    )
    ON CONFLICT (kind, normalized_name) DO UPDATE SET
      stt = EXCLUDED.stt,
      full_name = EXCLUDED.full_name,
      family_name = EXCLUDED.family_name,
      given_name = EXCLUDED.given_name,
      birth_year = EXCLUDED.birth_year
  `;
}

async function seedCandidateKind(kind: CandidateKind, records: CandidateRecord[]) {
  const sql = sqlClient();
  const rows = await sql`SELECT COUNT(*)::INTEGER AS count FROM ballot_candidates WHERE kind = ${kind}` as Array<{ count: number }>;
  if (Number(rows[0]?.count ?? 0) === 0) await insertCandidateRecords(kind, records);
}

export async function getCandidateLists() {
  await ensureSchema();
  const sql = sqlClient();
  const rows = await sql`
    SELECT kind, stt, full_name, family_name, given_name, birth_year
    FROM ballot_candidates
    ORDER BY kind, stt, full_name
  ` as Array<{ kind: CandidateKind; stt: number; full_name: string; family_name: string; given_name: string; birth_year: number | null }>;

  const toRecord = (row: typeof rows[number]): CandidateRecord => ({
    stt: row.stt,
    fullName: row.full_name,
    familyName: row.family_name,
    givenName: row.given_name,
    birthYear: row.birth_year,
  });

  return {
    preset: rows.filter((row) => row.kind === "preset").map(toRecord),
    suggestion: rows.filter((row) => row.kind === "suggestion").map(toRecord),
  };
}

export async function createSubmission(candidates: string[]) {
  await ensureSchema();
  const sql = sqlClient();
  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const queries = [
    sql`INSERT INTO ballots (id, submitted_at) VALUES (${id}, ${submittedAt})`,
    ...candidates.map((candidate, index) => sql`
      INSERT INTO ballot_selections (ballot_id, position, candidate_name)
      VALUES (${id}, ${index + 1}, ${candidate})
    `),
  ];
  await sql.transaction(queries);
  return { id, submittedAt };
}

export async function getAdminData() {
  await ensureSchema();
  const sql = sqlClient();
  const [rawSubmissionRows, rawHiddenRows, candidateLists] = await Promise.all([
    sql`
      SELECT b.id, b.submitted_at,
        COALESCE(JSON_AGG(s.candidate_name ORDER BY s.position) FILTER (WHERE s.candidate_name IS NOT NULL), '[]'::json) AS candidates
      FROM ballots b
      LEFT JOIN ballot_selections s ON s.ballot_id = b.id
      GROUP BY b.id, b.submitted_at
      ORDER BY b.submitted_at DESC
    `,
    sql`SELECT candidate_name FROM hidden_candidates ORDER BY hidden_at DESC`,
    getCandidateLists(),
  ]);
  const submissionRows = rawSubmissionRows as Array<{ id: string; submitted_at: string | Date; candidates: string[] }>;
  const hiddenRows = rawHiddenRows as Array<{ candidate_name: string }>;

  const submissions: Submission[] = submissionRows.map((row) => ({
    id: row.id,
    submittedAt: new Date(row.submitted_at).toISOString(),
    candidates: row.candidates,
  }));

  return {
    submissions,
    hiddenCandidates: hiddenRows.map((row) => row.candidate_name),
    presetCandidates: candidateLists.preset,
    suggestionCandidates: candidateLists.suggestion,
  };
}

export async function replaceCandidateList(kind: CandidateKind, records: CandidateRecord[]) {
  await ensureSchema();
  const sql = sqlClient();
  const json = JSON.stringify(records.map((record, index) => ({
    stt: Number.isFinite(record.stt) ? record.stt : index + 1,
    fullName: record.fullName.replace(/\s+/g, " ").trim().toUpperCase(),
    normalizedName: normalizeName(record.fullName),
    familyName: record.familyName?.replace(/\s+/g, " ").trim() || "",
    givenName: record.givenName?.replace(/\s+/g, " ").trim() || "",
    birthYear: record.birthYear ?? null,
  })));

  await sql.transaction([
    sql`DELETE FROM ballot_candidates WHERE kind = ${kind}`,
    sql`
      INSERT INTO ballot_candidates (kind, stt, full_name, normalized_name, family_name, given_name, birth_year)
      SELECT ${kind}, data.stt, data."fullName", data."normalizedName", data."familyName", data."givenName", data."birthYear"
      FROM jsonb_to_recordset(${json}::jsonb) AS data(
        stt INTEGER,
        "fullName" TEXT,
        "normalizedName" TEXT,
        "familyName" TEXT,
        "givenName" TEXT,
        "birthYear" INTEGER
      )
    `,
  ]);
}

export async function hideCandidate(name: string) {
  await ensureSchema();
  const sql = sqlClient();
  await sql`
    INSERT INTO hidden_candidates (normalized_name, candidate_name)
    VALUES (${normalizeName(name)}, ${name})
    ON CONFLICT (normalized_name) DO UPDATE SET candidate_name = EXCLUDED.candidate_name, hidden_at = NOW()
  `;
}

export async function restoreCandidateFromRanking(name?: string) {
  await ensureSchema();
  const sql = sqlClient();
  if (name) await sql`DELETE FROM hidden_candidates WHERE normalized_name = ${normalizeName(name)}`;
  else await sql`DELETE FROM hidden_candidates`;
}
