import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const strategyUrl = new URL("../rline-workbench/modules/views/rline-strategy.js", import.meta.url);

test("monthly SOP presents the two source timelines with traceable week nodes", async () => {
  const strategy = await readFile(strategyUrl, "utf8");

  for (const label of ["月课日常运营", "首月完课活动", "加人期", "W1", "W2", "W3", "W4", "首月魔法变装秀", "限定装扮挑战"]) {
    assert.match(strategy, new RegExp(label));
  }
  assert.match(strategy, /QG53mjyd80RMX42QtwNGDR0XV6zbX04v/);
  assert.match(strategy, /lyQod3RxJK3KbwD2ildPgRpwJkb4Mw9r/);
});
