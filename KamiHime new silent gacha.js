// ==UserScript==
// @name         KamiHime new silent gacha
// @namespace    http://tampermonkey.net/
// @version      11.05.2018
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
var sell_R_Eidolons = false;

var firstBatch;

function start(){
	if (has(cc, "director", "_runningScene", "_seekWidgetByName") && has(kh, "createInstance")){
		if (location.hash.startsWith("#!gacha/ga_004")){
            firstBatch = true;
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
        if (firstBatch) {
            console.log("Inventory is full, clear it and start script again. Stop script");
            return;
        }
        console.log("Inventory is full, go to sell");
        kh.createInstance("router").navigate("list/li_002");
        return;
    }
    if (has(normalGachaInfo,"groups",1) && normalGachaInfo.groups[1].enabled){
        if (normalGachaInfo.groups[1].gacha_count !== 10) {
            if (firstBatch) {
                console.log("Inventory is near full limit, clear it and start script again. Stop script");
                return;
            }
            console.log("Less then 10 items in gacha, go to sell");
            kh.createInstance("router").navigate("list/li_002");
            return;
        }
        kh.createInstance("apiAGacha").playGacha("normal",normalGachaInfo.groups[1].gacha_id).then(function(e) {var info = e.body;console.log(info.obtained_info);
                                                                                                                firstBatch = false;
                                                                                                                getGachaInfo();
                                                                                                               }.bind(this));
        return;
    } else if (has(normalGachaInfo,"groups",0) && normalGachaInfo.groups[0].enabled){
        kh.createInstance("apiAGacha").playGacha("normal",normalGachaInfo.groups[0].gacha_id).then(function(e) {var info = e.body;console.log(info.obtained_info);
                                                                                                                firstBatch = false;
                                                                                                                getGachaInfo();
                                                                                                               }.bind(this));
        return;
    } else {
        if (firstBatch) {
            console.log("All normal gacha attempts were used, stop script");
            return;
        } else {
            console.log("All normal gacha attempts were used, go to last sell");
            kh.createInstance("router").navigate("list/li_002");
            return;
        }
    }
}

function saleWeapons(){
     kh.createInstance("apiAWeapons").getList(0,500).then(function(e) {var list = e.body;
                                                                       var sellList = [];
                                                                       var ids = [];
                                                                       list.data.forEach(function(item){
                                                                           {if (item.rare === "N" && item.bonus === 0 && !item.is_equipped && !item.is_locked) {
                                                                               ids.push(item.a_weapon_id);
                                                                               sellList.push(item);
                                                                           }}
                                                                       });
                                                                       if (ids.length ===0) {console.log("No weapons to sell, go to eidolons");
                                                                                             saleEidolons();}
                                                                       else {
                                                                           console.log(sellList);
                                                                           kh.createInstance("apiAWeapons").sell(ids).then(function(e) {saleEidolons();}.bind(this));
                                                                       }}.bind(this));
}

function saleEidolons(){
     kh.createInstance("apiASummons").getList(0,500).then(function(e) {var list = e.body;
                                                                       var sellList = [];
                                                                       var ids = [];
                                                                       list.data.forEach(function(item){
                                                                           {if (item.can_sell && item.bonus === 0 && (item.rare === "N" || (sell_R_Eidolons && item.rare === "R"))) {
                                                                               ids.push(item.a_summon_id);
                                                                               sellList.push(item);
                                                                           }}
                                                                       });
                                                                       if (ids.length ===0) {console.log("No eidolons to sell, go to gacha");
                                                                                             kh.createInstance("router").navigate("gacha/ga_004");}
                                                                       else {
                                                                           console.log(sellList);
                                                                           kh.createInstance("apiASummons").sell(ids).then(function(e) {kh.createInstance("router").navigate("gacha/ga_004");}.bind(this));
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
