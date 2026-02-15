import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const PARTICIPANT_CAP_SQL = path.resolve(
  __dirname,
  "../../supabase/migrations/003_participant_cap_trigger.sql"
);

describe("participants cap migration", () => {
  it("defines BEFORE INSERT trigger and rejects 4th participant", () => {
    const sql = readFileSync(PARTICIPANT_CAP_SQL, "utf8");

    expect(sql).toContain("create trigger participants_max_three_trigger");
    expect(sql).toContain("before insert on public.participants");
    expect(sql).toContain("if participant_count >= 3 then");
    expect(sql).toContain("maximum of 3 participants");
  });
});
