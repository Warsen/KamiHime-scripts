// ==UserScript==
// @name         Kamihime Battle Speed Up
// @namespace    https://github.com/Warsen/KamiHime-scripts
// @version      0.1
// @description  Sets custom battle speed settings.
// @author       Warsen
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

var optionNormalSpeed = 1.6;
var optionFastSpeed = 4.0;

async function khLoadingAsync()
{
	// Wait for the game to finish loading.
	while (!has(kh, "PlayerGameConfig", "prototype", "BATTLE_SPEED_SETTINGS") || !has(cc, "director", "_runningScene", "isRaid")) {
		await delay(100);
	}

	kh.PlayerGameConfig.prototype.BATTLE_SPEED_SETTINGS.normal = optionNormalSpeed;

	if (cc.director._runningScene.isRaid())
	{
		let khBattleWorld = kh.createInstance("battleWorld");
		while (!has(khBattleWorld, "raidInfo", "_raidInfo")) {
			await delay(100);
		}
		if (khBattleWorld.raidInfo._raidInfo.participants.current == 1)
		{
			// By the time this code is reached, it's too late and we need a reload.
			await delay(3000);
			kh.PlayerGameConfig.prototype.BATTLE_SPEED_SETTINGS.quick = optionFastSpeed;
			khBattleWorld.reloadBattle();
		}
	}
	else
	{
		kh.PlayerGameConfig.prototype.BATTLE_SPEED_SETTINGS.quick = optionFastSpeed;
	}
}

function delay(duration)
{
	return new Promise(resolve => setTimeout(resolve, duration));
}
function has(obj)
{
	if (obj !== Object(obj)) return false;
	for (let i = 1; i < arguments.length; i++)
	{
		let prop = arguments[i];
		if ((prop in obj) && obj[prop] !== null && obj[prop] !== 'undefined') {
			obj = obj[prop];
		} else {
			return false;
		}
	}
	return true;
}

khLoadingAsync();
