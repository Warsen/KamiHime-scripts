// ==UserScript==
// @name         Kamihime Auto Start Battle
// @namespace    https://github.com/Warsen/KamiHime-scripts
// @version      0.2
// @description  Automatically starts your battle with Auto Ability On.
// @author       Warsen
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

let khRunningScene;
let khBattleWorld;
let khAutoScenarioHandler;
let khRouter;

async function khLoadingAsync()
{
	// Wait for the game to load.
	while (!has(cc, "director", "_runningScene", "_questInfo") || !has(kh, "createInstance")) {
		await delay(1000);
	}
	kh.env.sendErrorLog = false;

	// Create instances of the various APIs.
	khRunningScene = cc.director._runningScene;
	khBattleWorld = kh.createInstance("battleWorld");
	khRouter = kh.createInstance("router");

	// Wait until the button is available and no longer invisible.
	while (!has(khBattleWorld, "battleUI", "CenterPanel", "_visibleButton")
		|| khBattleWorld.battleUI.CenterPanel._visibleButton == 3)
	{
		await delay(500);
	}

	// If this is a raid battle, There will be a help request popup.
	let helpRequestPopup = khRunningScene._children.find(a => a.hasOwnProperty("_loggingInfo") && a._loggingInfo.resourceName == "battle_ui_rescueconfirm_popup");
	if (helpRequestPopup)
	{
		if (khBattleWorld.raidInfo._raidInfo.participants.current <= 3 && khBattleWorld.enemyList[0]._avatarData.level >= 50)
		{
			khBattleWorld.backendAPI.postHelpRequest(
				helpRequestPopup.buttonStatus.toAll.selected && helpRequestPopup.buttonStatus.toAll.button.isTouchEnabled(),
				helpRequestPopup.buttonStatus.toFriends.selected && helpRequestPopup.buttonStatus.toFriends.button.isTouchEnabled(),
				helpRequestPopup.buttonStatus.toUnion.selected && helpRequestPopup.buttonStatus.toUnion.button.isTouchEnabled(),
				khRunningScene._questInfo._questType
			);
			console.log("Help Request Sent");
		}
		helpRequestPopup.dismiss();
	}

	switch (khBattleWorld.battleUI.CenterPanel._visibleButton)
	{
		case 0:
			khAutoScenarioHandler = kh.createInstance("autoScenarioHandler");
			if (!khAutoScenarioHandler.isEnabled())
			{
				while (khAutoScenarioHandler._stateHandler._state.STATE < 2)
				{
					khAutoScenarioHandler.moveToNextState();
				}
				khBattleWorld.battleUI.AttackButton.simulateAttack();
			}
			break;
		case 1:
			if (khRunningScene.getQuestType() == "event_union_demon_raid")
			{
				setTimeout(scriptGoToMyPage, 0);
			}
			else
			{
				setTimeout(scriptGoToMyPage, 60000); // 1 minute
			}
			break;
		case 2:
			khBattleWorld.endBattle();
			break;
	}
}

function scriptGoToMyPage()
{
	khRouter.navigate("mypage");
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
