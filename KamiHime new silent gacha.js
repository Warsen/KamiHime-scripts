// ==UserScript==
// @name         KamiHime new silent gacha
// @namespace    http://tampermonkey.net/
// @version      04.05.2018
// @description  auto gacha in Kamihime game
// @author       You
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/list/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/list/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==


//to use script without errors deactivate auto start script, activate this script and go to weapon inventory
//look into console for progress -  F12, console

function start(){
	if (has(cc, "director", "_runningScene", "_seekWidgetByName") && has(kh, "createInstance")){
		if (location.hash.startsWith("#!gacha/ga_004")){
			setTimeout(getGachaInfo,1000);
		} else if (location.hash.startsWith("#!/li_002")){
			setTimeout(saleWeapons,1000);
		} else {
            console.log(" Go to weapon inventory from main page to start normal gacha sequence");
        }
	} else {
		console.log('waiting for page');
		setTimeout(start,2000);
	}
}

function getGachaInfo(){
    kh.createInstance("apiAGacha").getCategory("normal").then(function(e) {var normalGachaInfo = e.body;drawGacha(normalGachaInfo);}.bind(this));
}

function drawGacha(normalGachaInfo){
//    console.log(normalGachaInfo);
    if (normalGachaInfo.is_max_weapon_or_summon) {
        console.log("Inventory is full, go to sell");
        kh.createInstance("router").navigate("list/li_002");
        return;
    }
    if (has(normalGachaInfo,"groups",1) && normalGachaInfo.groups[1].enabled){
        if (normalGachaInfo.groups[1].gacha_count !== 10) {
            console.log("Less then 10 items in gacha, go to sell");
            kh.createInstance("router").navigate("list/li_002");
            return;
        }
        kh.createInstance("apiAGacha").playGacha("normal",normalGachaInfo.groups[1].gacha_id).then(function(e) {var info = e.body;console.log(info.obtained_info);
                                                                                                                getGachaInfo();
                                                                                                               }.bind(this));
        return;
    } else if (has(normalGachaInfo,"groups",0) && normalGachaInfo.groups[0].enabled){
        kh.createInstance("apiAGacha").playGacha("normal",normalGachaInfo.groups[0].gacha_id).then(function(e) {var info = e.body;console.log(info.obtained_info);
                                                                                                                getGachaInfo();
                                                                                                               }.bind(this));
        return;
    } else {
        console.log("All normal gacha attempts were used, stop script");
        return;
    }
}

function saleWeapons(){
     kh.createInstance("apiAWeapons").getRecommendSellableList().then(function(e) {var sellList = e.body;
                                                                                   if (sellList.max_record_count ===0) {console.log("No weapons to sell, go to eidolons");
                                                                                                                        saleEidolons();}
                                                                                   else {
                                                                                       console.log(sellList);
                                                                                       var ids = [];
                                                                                       sellList.data.forEach(function(item){ids.push(item.a_weapon_id);});
                                                                                       kh.createInstance("apiAWeapons").sell(ids).then(function(e) {saleWeapons();}.bind(this));
                                                                                   }}.bind(this));
}

function saleEidolons(){
     kh.createInstance("apiASummons").getRecommendSellableList().then(function(e) {var sellList = e.body;
                                                                                   if (sellList.max_record_count ===0) {console.log("No eidolons to sell, go to gacha");
                                                                                                                        kh.createInstance("router").navigate("gacha/ga_004");}
                                                                                   else {
                                                                                       console.log(sellList);
                                                                                       var ids = [];
                                                                                       sellList.data.forEach(function(item){ids.push(item.a_summon_id);});
                                                                                       kh.createInstance("apiASummons").sell(ids).then(function(e) {saleEidolons();}.bind(this));
                                                                                   }}.bind(this));
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
