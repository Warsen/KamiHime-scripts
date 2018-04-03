// ==UserScript==
// @name         KamiHime auto gacha
// @namespace    http://tampermonkey.net/
// @version      03.04.2018
// @description  auto gacha in Kamihime game
// @author       You
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/list/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/list/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

function start(){//wait to push buttons
	if (has(cc, "director", "_runningScene", "_seekWidgetByName")){
		if (location.hash.startsWith("#!gacha/ga_004")){
			setTimeout(next,3000);
		} else {
			setTimeout(next,1000);
		}
	} else {
		console.log('waiting for page');
		setTimeout(start,2000);
	}
}

function next(){
//	console.log(location.hash);
	if (location.hash.startsWith("#!gacha/ga_ani")) {
		var buttonSkip = cc.director._runningScene._seekWidgetByName("btn_skip");
		if (buttonSkip && buttonSkip !== "null" && buttonSkip !== "undefined" && buttonSkip._visible) {
			push_button(buttonSkip,2000);
		} else {
			start();
		}
	} else if (location.hash.startsWith("#!gacha/ga_010")) {
		let button = cc.director._runningScene._seekWidgetByName("btn_bottom_gacha");
		if (button && button !== "null" && button !== "undefined") {
			if (button._clickedFileName !== ""){
				push_button(cc.director._runningScene._seekWidgetByName("btn_top_gacha"));
			} else {
				gotoWeapon();
			}
		} else {
			setTimeout(start,1000);
		}
	} else if (location.hash.startsWith("#!gacha/ga_004")) {
		let button = cc.director._runningScene._seekWidgetByName("btn_bottom_gacha");
		if (button && button !== "null" && button !== "undefined") {
			if (button._clickedFileName !== ""){
				push_button(cc.director._runningScene._seekWidgetByName("btn_top_gacha"));
			} else {
				console.log('stop script - no more batch gacha');
//				return; // stop
			}
		} else {
			setTimeout(start,1000);
		}
	} else if (location.hash.startsWith("#!gacha/ga_011") || location.hash.startsWith("#!gacha/ga_012")) {
		gotoWeapon();
	} else if (location.hash.startsWith("#!/li_008")) {
		var sellSummonOK = cc.director._runningScene.seekWidgetByPath("blue_btn");
		var sellSummonRecommend = cc.director._runningScene.seekWidgetByPath("tab_1_node").seekWidgetByPath("btn_recommended");
		var sellSummonNone = cc.director._runningScene.popups.popupNonOffer;
		if (sellSummonOK && sellSummonOK !== "null" && sellSummonOK !== "undefined" && sellSummonOK._visible){
			push_button(sellSummonOK);
		} else if (sellSummonNone && sellSummonNone !== "null" && sellSummonNone !== "undefined" && sellSummonNone._running) {
//			return; // stop
			gotoGacha();
		} else if (sellSummonRecommend && sellSummonRecommend !== "null" && sellSummonRecommend !== "undefined" && sellSummonRecommend._visible) {
			push_button(sellSummonRecommend);
		}
	} else if (location.hash.startsWith("#!/li_007")) {
		var sellWeaponOK = cc.director._runningScene.seekWidgetByPath("blue_btn");
		var sellWeaponRecommend = cc.director._runningScene.seekWidgetByPath("tab_0_node").seekWidgetByPath("btn_recommended");
		var sellWeaponNone = cc.director._runningScene.popups.popupNonOffer;
		if (sellWeaponOK && sellWeaponOK !== "null" && sellWeaponOK !== "undefined" && sellWeaponOK._visible){
			push_button(sellWeaponOK);
		} else if (sellWeaponNone && sellWeaponNone !== "null" && sellWeaponNone !== "undefined" && sellWeaponNone._running) {
//			return; // stop
			gotoEidolon();
		} else if (sellWeaponRecommend && sellWeaponRecommend !== "null" && sellWeaponRecommend !== "undefined" && sellWeaponRecommend._visible) {
			push_button(sellWeaponRecommend);
		}
	} else {
		setTimeout(gotoGacha,5000);
	}
}

function gotoWeapon(){
	kh.createInstance("router").navigate("list/li_007", {li_007_008:{direction: "tab_0"}});
	setTimeout(start,1000);
}

function gotoEidolon(){
	kh.createInstance("router").navigate("list/li_008", {li_007_008:{direction: "tab_1"}});
	setTimeout(start,1000);
}

function gotoGacha(){
	kh.createInstance("router").navigate("gacha/ga_004");
	setTimeout(start,5000);
}


function push_button(button,timeout){
	timeout = timeout || 1000;
	if( button && button !== "null" && button !== "undefined" && button._visible){
		setTimeout(push.bind(null, button),1000);
	} else {
		console.log('no button');
		setTimeout(next,timeout);
	}
}

function push(obj){
//	console.log('pushing ' + obj);
	obj._releaseUpEvent();
	setTimeout(start,1000);
}

function has(obj) {
	var prop;
	if (obj !== Object(obj)) {
		return false;
	}
	for (i = 1; i < arguments.length; i++) {
		prop = arguments[i];
		if ((prop in obj) && obj[prop] !== null && obj[prop] !== 'undefined') {
			obj = obj[prop];
		} else {
			return false;
		}
	}
	return true;
}

start();
