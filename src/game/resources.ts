import { RESOURCES } from "./constants";
import type { RPGResources, RPGStats } from "./types";

/**
 * HP / MP are RPG flavor derived from the character. There is no combat in V1,
 * so both are always full, and they never feed back into XP or level.
 *   maxHp = 100 + 4*level + 2*experience + 2*consistency
 *   maxMp =  50 + 3*level + 2*versatility + 2*activity
 */
export function calculateResources(level: number, stats: RPGStats): RPGResources {
  const hp = RESOURCES.hp;
  const mp = RESOURCES.mp;
  const maxHp =
    hp.base + level * hp.perLevel + stats.experience * hp.perExperience + stats.consistency * hp.perConsistency;
  const maxMp =
    mp.base + level * mp.perLevel + stats.versatility * mp.perVersatility + stats.activity * mp.perActivity;
  return { hp: maxHp, maxHp, mp: maxMp, maxMp };
}
