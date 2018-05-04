# KamiHime-scripts
Content scripts for browser game KamiHime Project.

Use Tampermonkey for Chrome or Greasemonkey for Firefox (not tested).
Initially created for personal use. Change parameters in "KamiHime quests auto start" script if you want and use them.

Please keep in mind:

Scripts were created with intention to automate tedious and time consuming actions of player by emulating this actions. 
Script can and do only what player can. I especially was cautios to not burden game server with frequent requests.
Please follow these rules if you want to modify my scripts.

Please be noted that you will violate Nutaku rules by using scripts. But they cannot distinguish between actions of a player or the scripts.
In my view uses of scripts are justified as they can keep interest in game but save time for rest of life.

Description of scripts:

"KamiHime nutaku site ignore error.js" Reloads page if it is maintenance time and when is "error" page in game. You can want to always enable this script.

"KamiHime quests auto start.js" Starts any quest in main game, can join raids. Joins unfinished quests automatically. You need to change parameters in script for it to work. You can choose party for quest and try to find summon helper by eidolon name. You can have settings for different nutaku IDs, read script carefully and use examples.

"KamiHime battle smart auto.js" Works during battle. Uses abilities and summons. It plays better then auto from game but you cannot play battle manually! Enable this script only when it's needed.

"KamiHime auto gacha.js" is obsolete.

"KamiHime new silent gacha.js" Script for auto use Gem gacha. It will draw 10 batches or single draw, when inventory is full it will sell N (without +) weapons and eidolons (can sell R eidolons), repeat. Stops when there is no place in inventory or used all day's draws. 
You need to go to weapon inventory for script to work.

"KamiHime battle speed up.js" You can set speed up factor for animation in battle, it's working if you set fast animation in game menu.
