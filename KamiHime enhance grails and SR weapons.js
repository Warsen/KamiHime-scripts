// ==UserScript==
// @name         KamiHime enhance grails and SR weapons
// @namespace    http://tampermonkey.net/
// @version      24.05.2018
// @description  enhance SR weapons to 4 skill level, R grails to 3 skill level, SR grails to 5 skill level
// @author       You
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

//script uses unlocked SR weapons and enhance them to 4 skill level

function start(){
	if (has(cc, "director", "_runningScene", "_seekWidgetByName") && has(kh, "createInstance")){
			setTimeout(getWeaponInfo,1000);
	} else {
		console.log('waiting for page');
		setTimeout(start,2000);
	}
}

function getWeaponInfo(){
    kh.createInstance("apiAWeapons").getList(0,500).then(function(e) {prepare(e.body);}.bind(this));
}

function prepare(weaponInfo){
    console.log(weaponInfo);
    var toEnhance = [];
    var fodder = [];
    var grailsR = [];
    weaponInfo.data.forEach(function(item){
        if (item.rare === "R" && item.bonus === 0 && item.level === 1 && !item.is_equipped && !item.is_locked && item.attack > 100) {
            fodder.push(item.a_weapon_id);
        }
        if (item.rare === "SR" && item.bonus === 0 && item.level < 15 && !item.is_equipped && !item.is_locked && item.attack >= 150) {
            toEnhance.push(item.a_weapon_id);
        }
        if (item.rare === "R" && item.bonus === 0 && item.level < 8 && !item.is_equipped && !item.is_locked && item.name === "Arcane Grail") {
            grailsR.push(item.a_weapon_id);
        }
    });
    console.log(fodder);
    console.log(toEnhance);

    if (toEnhance.length > 0 && fodder.length > 5) {
        kh.createInstance("apiAWeapons").get(toEnhance[0]).then(function(e) {enhance(e.body,fodder);}.bind(this));
        toEnhance.shift();
    } else if (grailsR.length > 0 && fodder.length > 2){
        kh.createInstance("apiAWeapons").get(grailsR[0]).then(function(e) {enhance(e.body,fodder);}.bind(this));
    } else {
        console.log("No materials to perform enhance, stop");
    }
}

function enhance(weapon,fodder){
    console.log(weapon);
    var tempFodder = [];
    var skillLVL = weapon.skills[0].level;
    var maxSkillLevel = 4;
    if (weapon.name === "Arcane Grail") maxSkillLevel = 3;
    if (weapon.name === "False Grail Yaldabaoth") maxSkillLevel = 5;
    if (skillLVL < maxSkillLevel) {
        if (weapon.name === "Arcane Grail") {
            tempFodder.push(fodder.pop());
        } else {
            for (let i=0; i<skillLVL; i++){
                tempFodder.push(fodder.pop());
            }
        }
        console.log(tempFodder);
        kh.createInstance("apiAWeapons").enhance(weapon.a_weapon_id,tempFodder).then(function(e) {enhance(e.body.weapon,fodder);}.bind(this));
    } else {
        getWeaponInfo();
    }
}

function has(obj) {
	var prop;
	if (obj !== Object(obj)) {
		return false;
	}
	for (let i = 1; i < arguments.length; i++) {
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
