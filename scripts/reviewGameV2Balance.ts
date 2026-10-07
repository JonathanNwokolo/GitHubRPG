import snapshot from "@/game-v2/balance-snapshot-v24-evolution-experimental.json";
import { ACHIEVEMENT_CATALOG_V2, ARTIFACTS, reviewV2Invariants, SCHOOLS, TITLE_CATALOG_V2 } from "@/game-v2";

function unique(values: readonly string[]): boolean { return new Set(values).size === values.length; }
const checks: Array<[string, boolean]> = [
  ["46 invariants declared", snapshot.invariants === 46],
  ["22 schools", SCHOOLS.length === 22], ["22 artifacts", ARTIFACTS.length === 22],
  ["54 achievements", ACHIEVEMENT_CATALOG_V2.length === 54], ["achievement ids unique", unique(ACHIEVEMENT_CATALOG_V2.map((item) => item.id))],
  ["31 migrated achievements", ACHIEVEMENT_CATALOG_V2.filter((item) => item.origin === "v1").length === 31], ["23 new achievements", ACHIEVEMENT_CATALOG_V2.filter((item) => item.origin === "v2").length === 23], ["6 secret achievements", ACHIEVEMENT_CATALOG_V2.filter((item) => item.secret).length === 6],
  ["40 titles", TITLE_CATALOG_V2.length === 40], ["title ids unique", unique(TITLE_CATALOG_V2.map((item) => item.id))], ["27 migrated titles", TITLE_CATALOG_V2.filter((item) => item.origin === "v1").length === 27], ["13 new titles", TITLE_CATALOG_V2.filter((item) => item.origin === "v2").length === 13],
];
const invariants = reviewV2Invariants();
checks.push(["46 executable invariants", invariants.length === 46]);
for (const invariant of invariants) checks.push([`invariant ${invariant.number}: ${invariant.name}`, invariant.passed]);
for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
