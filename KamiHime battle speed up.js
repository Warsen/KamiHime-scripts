// ==UserScript==
// @name         KamiHime battle speed up
// @namespace    http://tampermonkey.net/
// @description  change speed up factor of animation in KamiHime battles
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

var speedUpAnimationBy = 4;//speed up animation by x times, in game fast is 1.6
var playSafe = true;//in raids speed up only in union demon raids, do not provoke other players

function waitStart(){
	if (kh && kh.createInstance && cc && cc.director && cc.director._runningScene && cc.director._runningScene.isRaid) {
		var conf = kh.createInstance("playerGameConfig");
		if (conf.BATTLE_SPEED_SETTINGS.quick !== speedUpAnimationBy &&
            (!playSafe || (!cc.director._runningScene.isRaid() || cc.director._runningScene.getQuestType() === "event_union_demon_raid"))
           ){
			conf.BATTLE_SPEED_SETTINGS.quick = speedUpAnimationBy;
			kh.createInstance("battleWorld").reloadBattle();
		}
	} else {
		setTimeout(waitStart,500);
	}
}

setTimeout(waitStart,3000);
