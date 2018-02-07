// ==UserScript==
// @name         KamiHime battle speed up
// @namespace    http://tampermonkey.net/
// @description  change speed up factor of animation in KamiHime battles
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

var speedUpAnimationBy = 8;//speed up animation by x times, in game fast is 1.6

function waitStart(){
	if (kh && kh.createInstance) {
		var conf = kh.createInstance("playerGameConfig");
		conf.BATTLE_SPEED_SETTINGS.quick = speedUpAnimationBy;
	} else {
		setTimeout(waitStart,2000);
	}
}

setTimeout(waitStart,5000);