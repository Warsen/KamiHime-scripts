// ==UserScript==
// @name         KamiHime battle smart auto
// @namespace    http://tampermonkey.net/
// @version      10.01.2018
// @description  full auto in battle in Kamihime game
// @author       You
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/battle/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

var autoBattle = true; //set to false to end turns manually
var callForHelp = true; // call for help during your raids
var useBurstAbilitesOnNormalGauge = true; //use (true) or not (false) burst and attack abilities during normal gauge on bosses
//New!
var strongEnemyHP = 300000;//HP for Enemy. Script will use all debuffs and damage skills if enemy has more HP than this.

var turnNumber;
var battleWorld;

function waitStart(){//wait to push buttons
    battleWorld = kh.createInstance("battleWorld");
    if (has(battleWorld, "battleUI", "CenterPanel", "_visibleButton")){
        var visibleButton = battleWorld.battleUI.CenterPanel._visibleButton;// ATTACK: 0, REVIVE: 1, NEXT: 2, NONE: 3
        if (visibleButton!==3 && has(battleWorld, "turn", "turnNumber")) {
            turnNumber = battleWorld.turn.turnNumber;
            doOnce();
        } else {
            setTimeout(waitStart,500);
        }
    } else {
        setTimeout(waitStart,1000);
    }
}

function doOnce(){//do once at battle start
    //resolve helpers
    setTimeout(resolveRescue,30000);//wait before call help
    //get potion from stamps
	if (!hasSuperPotion()){setTimeout(getPotion,5000);}
    //prepare for circle
    var turnStage = 1;
    doTurn(turnStage);
}

function doTurn(stage) {
    var timeout = 500;
    var visibleButton = 9;// not real value
    battleWorld = kh.createInstance("battleWorld");
	if (has(battleWorld, "battleUI", "CenterPanel", "_visibleButton")){
        visibleButton = battleWorld.battleUI.CenterPanel._visibleButton;// ATTACK: 0, REVIVE: 1, NEXT: 2, NONE: 3
        clearWaitFinish();
        if (has(battleWorld, "turn","turnNumber")){
            var currentTurn = battleWorld.turn.turnNumber;
//            console.log('turn ' + currentTurn + ", stage " + stage + ", button " + visibleButton);
            if (turnNumber!==currentTurn) { //it is next turn, reset stage
                stage=1;
                turnNumber=currentTurn;
            }
        }
    }

    switch(visibleButton) {
        case 1: //REVIVE
			setTimeout(gotoHome,300000);//go to home page after 5 min
			return;
//            stage = 99; //last stage, do nothing
//            autoBattle = false;
//            timeout = 10000;
//            break;
        case 2: //NEXT
            stage = 99; //last stage, do nothing
            timeout = 3000;
            if (autoBattle) {
                setTimeout(doNext,1000);
                timeout = 3000;
                turnNumber=-1;
            }
            break;
        case 3: //NONE - must wait
            timeout = 500;
            break;
        case 0: //ATTACK - can do actions
            //set target to enemy if none
            if (battleWorld.getTarget()==-1) { setTarget(); }
            switch(stage) {
                case 1:
                    //do summon
                    var doneSummon = doSummon();
                    stage=stage+1;
                    if (doneSummon) {timeout=6000;} else {timeout=0;}
                    break;
                case 2:
                    //do heals
                    var doneHeal = doAbility("green");
                    if (doneHeal) {
                        timeout=2000;
                    } else {
                        stage=stage+1;
                        timeout=0;
                    }
                    break;
                case 3:
                    //do buffs
                    var doneBuff = doAbility("yellow");
                    if (doneBuff) {
                        timeout=2000;
                    } else {
                        stage=stage+1;
                        timeout=0;
                    }
                    break;
                case 4:
                    //do debuffs
                    var doneDebuff = doAbility("blue");
                    if (doneDebuff) {
                        timeout=2000;
                    } else {
                        stage=stage+1;
                        timeout=0;
                    }
                    break;
                case 5:
                    //do damage
                    var doneDamage = doAbility("red");
                    if (doneDamage) {
                        timeout=2000;
                    } else {
                        stage=stage+1;
                        timeout=0;
                    }
                    break;
                case 6:
                    //switch burst off while enemy has gauge and not in rage
					var burstMustBeOff = !useBurstAbilitesOnNormalGauge && enemyHasGauge() && !enemyRaged() && !enemyStunned();
					var burstOn = battleWorld.battleUI.isFlgUseSpecialAttack();
                    if (burstOn === burstMustBeOff) {
						battleWorld.battleUI.BurstButton._widget._releaseUpEvent();
                        timeout=500;
                    } else {
                        stage=stage+1;
                        timeout=0;
                    }
                    break;
                default:
                    if (autoBattle) {
                        doAttack();
                        timeout = 5000;
                    } else {
                        timeout = 3000;
                    }
            }
            break;
        default:
    }
    setTimeout(doTurn.bind(null, stage),timeout);
}

function resolveRescue(){
     //call helpers doRescue or doCancel
    var participants = 0;
    if (has(battleWorld, "raidInfo", "_raidInfo", "participants", "current")){
        participants = battleWorld.raidInfo._raidInfo.participants.current;
    }
//    console.log('counted participants ' + participants);
    if (callForHelp && participants===1) {
        doRescue();
    } else {
        doCancel();
    }
}

function getPotion(){
    var myStamps = cc.director._runningScene._seekWidgetByName("btn_stamp");
        if( myStamps && myStamps !== "null" && myStamps !== "undefined" ){
        myStamps._releaseUpEvent();
        setTimeout(doStamp,3000);
     }
}

function doStamp(){
    var myStamp = cc.director._runningScene._seekWidgetByName("stamp_1");
    if( myStamp && myStamp !== "null" && myStamp !== "undefined" ){
        myStamp._releaseUpEvent();
    }
}

function checkAtkBtn(){
   var myAttack = cc.director._runningScene._seekWidgetByName("btn_attack");
    if( myAttack && myAttack !== "null" && myAttack !== "undefined" ){
        if (myAttack.enabled){
            return true;
        }
    } else { return false; }
}

function checkNextBtn(){
    var myNext = cc.director._runningScene._seekWidgetByName("btn_next");
    if( myNext && myNext !== "null" && myNext !== "undefined" ){
        if (myNext.enabled){
            return true;
        }
    } else { return false; }
}

function doRescue() { //rescue button in helpers
    var myRescue = cc.director._runningScene._seekWidgetByName("btn_request_rescue");
    if( myRescue && myRescue !== "null" && myRescue !== "undefined" ){
        myRescue._releaseUpEvent();
        setTimeout(doOK,5000);
    }
}

function doCancel() { //cancel button in helpers
    var myRescue = cc.director._runningScene._seekWidgetByName("btn_request_rescue");
    if( myRescue && myRescue !== "null" && myRescue !== "undefined" ){
        var myCancel = myRescue._parent._seekWidgetByName("btn_cancel");
        if( myCancel && myCancel !== "null" && myCancel !== "undefined" ){
            myCancel._releaseUpEvent();
        }
    }
}

function doOK() { //ok button
   var myOK = cc.director._runningScene._seekWidgetByName("blue_btn");
    if( myOK && myOK !== "null" && myOK !== "undefined" ){
    myOK._releaseUpEvent();
    }
}

function doNext() { //ok button
   var myNext = cc.director._runningScene._seekWidgetByName("btn_next");
    if( myNext && myNext !== "null" && myNext !== "undefined" ){
        if (myNext.enabled) {
            myNext._releaseUpEvent();
        }
    }
}

function doAttack() { //attack button
   var myAttack = cc.director._runningScene._seekWidgetByName("btn_attack");
    if( myAttack && myAttack !== "null" && myAttack !== "undefined" ){
        if (myAttack.enabled){
            myAttack._releaseUpEvent();
        }
    }
}

function doAutoButton() { //auto button
   var myAuto = cc.director._runningScene._seekWidgetByName("btn_auto");
    if( myAuto && myAuto !== "null" && myAuto !== "undefined" ){
    myAuto._releaseUpEvent();
    }
}

function doSummon(){
    var ban = cc.director._runningScene._seekWidgetByName("banfilter_summon");
    if (!has(battleWorld, "battleUI", "SummonPanelGroup", "panelList"))  { console.log('banfilter'); return false; }
    var panelList = battleWorld.battleUI.SummonPanelGroup.panelList;
	var i, summonID = -1, len = panelList.length, summon_ui_name, summon_ui, summonData;
	if (has(ban, "visible") && ban.visible) {
		return false;
	}
	for (i=0;i<len;i++) {
		if (!has(panelList, i, "turn")) {
//          no data from server, emergency reload
			console.log('no data from server, will reload if not in anothers raid');
			if (!(has(battleWorld, "raidInfo", "_raidInfo", "participants", "current") && battleWorld.raidInfo._raidInfo.participants.current > 1)){
				location.reload();
				stage=99;
				return false;
			}
		}
		if (has(panelList, i, "turn") && has(panelList, i, "locked") && panelList[i].turn===0 && !panelList[i].locked) {
//        console.log('check eidolon ' + i + ", turn " + panelList[i].turn + ", locked " + panelList[i].locked);
//        check recover Eidolons
			if (has(battleWorld,"summonList",i,"model","attributes","name") && battleWorld.summonList[i].model.attributes.name==="Behemoth"){
				if (needRecover()){
					summonID = i; // always summon Behemoth if available and need to recover statuses
				}
			} else if (summonID===-1){
				summonID = i; // summon only first available eidolon
			}
		}
	}
//  summon eidolon
	if (summonID>-1) {
		summon_ui_name = "battlecard_summon_ui_" + summonID;
		summon_ui = cc.director._runningScene._seekWidgetByName(summon_ui_name);
		if( summon_ui && summon_ui !== "null" && summon_ui !== "undefined" ){
			summon_ui._children[0]._releaseUpEvent();
			var myOK = cc.director._runningScene._seekWidgetByName("a_q_001_summongo_ok");
			if( myOK && myOK !== "null" && myOK !== "undefined" ){
				if (myOK._visible){
//                  console.log('trying to call eidolon ' + i);
					myOK._releaseUpEvent();
					return true;
				} else {
					var cancel = cc.director._runningScene._seekWidgetByName("a_q_001_summongo_cancel");
					cancel._releaseUpEvent();
					return false;
				}
			}
		}
	}
    return false;
}

function checkAbilityNeeded(color,type,name,char){
	var abilitiesNotNeededByName = ["King of Flies","Misty MoonLight","Mega Therion","Zombie Powder","Charis Ring"];
    var abilitiesNotNeeded = [55,16];//55 - rampaging, 16 - buff with debuff
	var abilitiesAlwaysUse = [1,41,17];//41 - Burst Gauge↑ self, 17 - Burst Gauge↑ All, 1 - Refills Burst Gauge
	var abilitiesStackableByName = ["Golden Age","Fury","Meginjord","Sun Spread","Raizu and Fight","Crimson Fury","Crimson Eruption","Nymph's Dance","Adverse Wind","Book of Raziel"];
	var abilitiesForBossByName = ["Outrage","Vicissitudes of Fortune","Lovesick","Lovely Concert","Hero's Sword",
								  "Mental Abberation","Chaos Inferno","Deep Attraction","Aqua Drowning","Death Swords","Soul Reaper",
								  "Wind of Lovesickness","Immolation","Blackout","Love Perfume","Evil Eye's Curse","Black Shroud","Putrify",
								 "Chaotic Fog","Walpurgis Night","Cursed Undead","Enchanting Harp","To Catch a Thief","Berserker","Icicle Prison",
								 "Striking Thunder Blast","Blitz Donner","Moonbeam Arrow","Mutsuru Sakuya","Admiration of Wei"];//always use if enemy with gauge else do not use
	var abilitiesDebuffEnemy = [25,53,49,45,44,34,43,50];//25 - DEF↓, 53 - ATK↓, 49 - ATK↓, 45 - Dizziness to an enemy, 34 - Chain attack rate↓, 43 - Enemy's max Overdrive Meter↑
	var abilitiesEnemyBuffedByName = ["Alfrodull","Sugary Crush"];
    var abilitiesEnemyBuffed = [56];
    var abilitiesDuringStunByName = ["Finish Impact","Current of Despair","Dragon Blood","Dragon Buster","Epic of a Military Hero","Paralyzer","Curse+","Enuma Elis","Plasma Bind"];
    var abilitiesDuringStun = [39];//39 - Extends stun on enemy
    var abilitiesDuringRageByName = ["Hydro Burst","Land of Ire","Quell Riot"];
    var abilitiesDuringRage = [46,35,57];//46 - enemy's Mode Gauge↓, 35 - x DMG to raging enemies, 57 - Mode Gauge reduction
    var abilitiesReduceActiveDotByName = ["Otherworldy Call"];
    var abilitiesReduceActiveDot = [54];
    var abilitiesDefenceType1 = [3];
    var abilitiesDefenceType2 = [];
    var abilitiesDefenceType3 = [];
    var abilitiesAttackType1ByName = ["Valkyrie Assault"];
    var abilitiesAttackType1 = [15];
    var abilitiesAttackType2 = [];
    var abilitiesAttackType3 = [];
    var abilitiesAbilityDMGType = [32];
    var abilitiesDoubleAttackType1 = [5];//for All
    var abilitiesDoubleAttackType2 = [10];//single buff
    var abilitiesDoubleAttackType3 = [];
	var abilitiesHealAndRecoverByName = ["Sunlight Furnace"];
	var abilitiesRecover = [19];
	var abilitiesPreventNegativeAffliction  = [8];
	var abilitiesRevive = [23];
	var abilitiesHealAlly = [21];
	var abilitiesHealSelf = [24];
	var abilitiesRegeneration = [22];
	var abilitiesOnEnemySpecialAttack = [28,14,11,7,6];//28 - Intercept, 14 - Nullify, 11 - Damage or Res Cut, 7 - Cuts DMG, 6 - Reflect
    var need;

	if (abilityNameInList(name,abilitiesNotNeededByName))        return false;
	if (abilitiesNotNeeded.indexOf(type)>-1)                     return false;
	if (abilitiesAlwaysUse.indexOf(type)>-1)                     return true;
	if (abilityNameInList(name,abilitiesStackableByName))        return true;

	if (abilityNameInList(name,abilitiesHealAndRecoverByName))   return needRecover() || needHeal();
 	if (abilitiesHealSelf.indexOf(type)>-1)                      return needHeal(char);
    if (color=="green" && abilitiesRecover.indexOf(type)===-1 &&
		abilitiesRevive.indexOf(type)===-1)                      return needHeal();
    if (abilitiesRecover.indexOf(type)>-1)                       return needRecover();

	if (abilityNameInList(name,abilitiesReduceActiveDotByName))  return (enemyHasGauge() || enemyIsStrong()) && enemyHasActiveDot();
	if (abilityNameInList(name,abilitiesForBossByName))          return enemyHasGauge() || enemyIsStrong();
	if (abilityNameInList(name,abilitiesEnemyBuffedByName))      return enemyIsBuffed();
	if (abilityNameInList(name,abilitiesDuringRageByName))       return enemyRaged() || (color==="red" && enemyIsStrong());
	if (abilityNameInList(name,abilitiesDuringStunByName))       return enemyStunned() || (color==="red" && enemyIsStrong());

	if (abilitiesDebuffEnemy.indexOf(type)>-1)                   return enemyHasGauge() || enemyIsStrong();
    if (abilitiesDuringStun.indexOf(type)>-1)                    return enemyStunned() || (color==="red" && enemyIsStrong());
    if (abilitiesDuringRage.indexOf(type)>-1)                    return enemyRaged() || (color==="red" && enemyIsStrong());
    if (abilitiesEnemyBuffed.indexOf(type)>-1)                   return enemyIsBuffed();
    if (abilitiesReduceActiveDot.indexOf(type)>-1)               return (enemyHasGauge() || enemyIsStrong()) && enemyHasActiveDot();
    if (abilitiesOnEnemySpecialAttack.indexOf(type)>-1)          return ((enemyHasGauge() && !enemyStunned()) || enemyIsStrong()) && enemyHasMaxActiveDots();
	if (abilitiesAttackType1.indexOf(type)>-1)                   return hasStatus(6);
    if (abilitiesAttackType2.indexOf(type)>-1)                   return hasStatus(7);
    if (abilitiesAttackType3.indexOf(type)>-1)                   return hasStatus(40001);
    if (abilitiesDefenceType1.indexOf(type)>-1)                  return hasStatus(14);
    if (abilitiesDefenceType2.indexOf(type)>-1)                  return hasStatus(15);
    if (abilitiesDefenceType3.indexOf(type)>-1)                  return hasStatus(40003);
    if (abilitiesAbilityDMGType.indexOf(type)>-1)                return hasStatus(19);
    if (abilitiesDoubleAttackType1.indexOf(type)>-1)             return hasStatus(23);
    if (abilitiesDoubleAttackType3.indexOf(type)>-1)             return hasStatus(40005);
    if (abilitiesPreventNegativeAffliction.indexOf(type)>-1)     return hasStatus(47);
	if (color==="red" && !useBurstAbilitesOnNormalGauge)         return !enemyHasGauge() || enemyRaged() || enemyStunned();

	return true;
}

function abilityNameInList(name,abilities){
	for (var i=0;i<abilities.length;i++){
		if (name.startsWith(abilities[i])){
			return true;
		}
	}
	return false;
}

function enemyStunned(){
    var target = battleWorld.getTarget();
    if (has(battleWorld,"enemyStatusBarList",target,"_modeGaugeTextStun","_visible")){
        if (battleWorld.enemyStatusBarList[target]._modeGaugeTextStun._visible){
            return true;
        }
    }
    return false;
}

function enemyRaged(){
    var target = battleWorld.getTarget();
    if (has(battleWorld,"enemyStatusBarList",target,"_modeGaugeTextRaging","_visible")){
        if (battleWorld.enemyStatusBarList[target]._modeGaugeTextRaging._visible){
            return true;
        }
    }
    return false;
}

function enemyHasGauge(){
    var target = battleWorld.getTarget();
    if (has(battleWorld,"enemyStatusBarList",target,"_modeGaugeBase","_visible")){
        if (battleWorld.enemyStatusBarList[target]._modeGaugeBase._visible){
            return true;
        }
    }
    return false;
}

function enemyHasActiveDot(){
    var target = battleWorld.getTarget();
    if (has(battleWorld,"enemyStatusBarList",target,"_chargeTurnDotsActiveCount")){
        if (battleWorld.enemyStatusBarList[target]._chargeTurnDotsActiveCount > 0){
            return true;
        }
    }
    return false;
}

function enemyIsStrong(){
    var target = battleWorld.getTarget();
    if (has(battleWorld,"enemyList",target,"hp")){
        if (battleWorld.enemyList[target].hp >= strongEnemyHP){
            return true;
        }
    }
    return false;
}

function enemyHasMaxActiveDots(){
    var target = battleWorld.getTarget();
    if (has(battleWorld,"enemyStatusBarList",target,"_chargeTurnDotsActiveCount")){
        if (battleWorld.enemyStatusBarList[target]._chargeTurnDotsActiveCount === battleWorld.enemyStatusBarList[target]._chargeTurnDotsCount){
            return true;
        }
    }
    return false;
}

function hasStatus(abilityID){
    if (has(battleWorld,"battleStatus","_partyMembers")){
        var charStats = battleWorld.battleStatus._partyMembers;
        var len = charStats.length;
        if (len>5) {len=5;}
        for (var i=0;i<len;i++) {
            if (has(charStats, i , "status_effects")){
                if (charStats[i].hp!==0){
                    var haveStatus = false;
                    for (var j=0;j<charStats[i].status_effects.length;j++) {
                        if (charStats[i].status_effects[j].id===abilityID){
                            haveStatus = true;
                        }
                    }
                    if (!haveStatus) {return true;}
                }
            }
        }
        return false;
    } else {
        return true;
    }
}

function enemyIsBuffed(){
	var abilityID=[5,6,7,9,13,14,15,19,21,23,24,27,78,84];
	var target = battleWorld.getTarget();
    if (has(battleWorld,"battleStatus","_enemies", target, "status_effects")){
		var charStats = battleWorld.battleStatus._enemies[target].status_effects;
			var haveStatus = false;
			for (var j=0;j<charStats.length;j++) {
				if (abilityID.indexOf(charStats[j].id)>-1){
					haveStatus = true;
				}
			}
//		console.log('check enemy status ' + haveStatus);
			return haveStatus;
	} else if (has(battleWorld,"enemyStatusBarList", target, "_statusEffectIconHandler","_iconList")){
		var statuses = battleWorld.enemyStatusBarList["0"]._statusEffectIconHandler._iconList;
		console.log('check enemy status in status bar');
		for (var i=0;i<statuses.length;i++){
			if (has(statuses,i,"_statusEffect","_id") && abilityID.indexOf(statuses[i]._statusEffect._id)>-1){
				return true;
			}
			if (i===(statuses.length-1) && !has(statuses,i,"_statusEffect","_id")){// if less then 8 statuses
				return false;
			}
		}
	} else {
		return true;
	}
}

function needHeal(char){
    if (has(battleWorld, "characterPanelList")){
        var charStats = battleWorld.characterPanelList;
        var len = charStats.length;
        for (var i=0;i<len;i++) {
            if (has(charStats, i ,"_avatarData", "hp") && (char === undefined || char === i)){
                charHP = charStats[i]._avatarData.hp;
                charMaxHp = charStats[i]._avatarData.hpmax;
                if (charHP!==0 && (charHP/charMaxHp)<0.7){//if 70% of hp then heal
                    return true;
                }
            }
        }
    }
    return false;
}

function needRecover(){//has bad affinity like poison ect.
	var badStatuses = [54,55,56,57,58,59,60,61,62,63,64,65,69,89,134];
    if (has(battleWorld, "characterPanelList")){
        var charStats = battleWorld.characterPanelList;
        var len = charStats.length;
        if (len>5) {len=5;}
		for (var i=0;i<len;i++) {
			for (var j=0;j<badStatuses.length;j++){
				if (has(battleWorld,"statusEffectList",badStatuses[j],"_characters",i,0)){
					return true;
				}
			}
		}
	}
    return false;
}

function doAbility(color){
    if (!has(battleWorld, "characterAbilityList")){ console.log('WTF?! no ability list'); autoBattle = false; return false; }
    var abilities = battleWorld.characterAbilityList;
    var len = abilities.length;
    if (len>5) {len=5;}
    for (var i=0;i<len;i++) {
        if (has(battleWorld, "characterPanelList", i, "_avatarData", "hp")){
            charHP =  battleWorld.characterPanelList[i]._avatarData.hp;
        } else {
            charHP=0;
        }
        if ( has(abilities, i) && charHP!==0){
            var charAbilities = abilities[i];
            for (var j=0;j<charAbilities.length;j++) {
                if (has(charAbilities, j, "_abilityData")){
                    var charAbilitiesData = charAbilities[j]._abilityData;
                    if (has(charAbilitiesData, "color") && has(charAbilitiesData, "party_member_selectable") && has(charAbilitiesData, "is_banned") && has(charAbilitiesData, "ready") && has(charAbilitiesData, "type")){
                        var abilityColor = charAbilitiesData.color;
                        var party_member_selectable = charAbilitiesData.party_member_selectable;
                        var isBanned = charAbilitiesData.is_banned;
                        var abilityready = charAbilitiesData.ready;
//                       console.log(i+" "+j+ " " +abilityColor + " " + party_member_selectable + " " + isBanned + " " + abilityready);
                        if (abilityColor==color && isBanned===false && abilityready===true){
//							console.log('try ability '+ i + " " + j);
							var abilityNeeded = checkAbilityNeeded(abilityColor,charAbilitiesData.type,charAbilitiesData.name,i);
//							console.log('ability needed'+ abilityNeeded);
							if (party_member_selectable) {
								var partyTarget = getPartyTarget(charAbilitiesData.party_member_selectable_type);
								if (abilityNeeded && partyTarget>-1) {
									battleWorld._useAbility(i, j, partyTarget); //use ability
									return true;
								}
							} else {
 								if (abilityNeeded) {
									battleWorld._useAbility(i, j); //use ability
									return true;
								}
							}
						}
					} else {
//                        console.log('wrong ability data for ' + i + " " + j);
                    }
				}
            }
        }
    }
    return false;
}

function getPartyTarget(type){
	var i, charStats, minHP = 1, toHeal = 0;
	switch (type) {
		case "revive":
			if (has(battleWorld,"fallenList",0,"index")){
				return battleWorld.fallenList[0].index;
			}
			break;
		case "heal":
			if (has(battleWorld, "characterPanelList")){
				charStats = battleWorld.characterPanelList;
				for (i=0;i<charStats.length;i++) {
					if (has(charStats, i ,"_avatarData", "hp")){
						charHP = charStats[i]._avatarData.hp;
						charMaxHp = charStats[i]._avatarData.hpmax;
						if (charHP!==0 && (charHP/charMaxHp<minHP)){
							toHeal = i;
							minHP = charHP/charMaxHp;
						}
					}
				}
				return toHeal;
			}
			break;
		case "buff":
			if (has(battleWorld, "characterPanelList")){
				charStats = battleWorld.characterPanelList;
				for (i=0;i<charStats.length;i++) {
					if (has(charStats, i ,"_avatarData", "hp")){
						charHP = charStats[i]._avatarData.hp;
						if (charHP!==0){//if not dead
							return i;
						}
					}
				}
			}
			break;
		default:
	}
	return -1;
}

function setTarget(){
    var targetEnemy = -1, minDotsCount = 10, iDotsCount, enemy;
    if (has(battleWorld, "enemyStatusBarList")) {
        var enemies = battleWorld.enemyStatusBarList;
        for (var i=0;i<enemies.length;i++) {
            if (has(enemies, i, "_chargeTurnDotsCount" )){
                iDotsCount = enemies[i]._chargeTurnDotsCount;
                if (iDotsCount < minDotsCount){
                    targetEnemy = i;
                    minDotsCount = iDotsCount;
                }
            }
        }
        if (targetEnemy !== -1) {
            var enemy_hitbox = cc.director._runningScene._seekWidgetByName("enemy_hitbox_"+targetEnemy);
            if( enemy_hitbox && enemy_hitbox !== "null" && enemy_hitbox !== "undefined" ){
                enemies[targetEnemy]._targetEnemy(enemy_hitbox,2);
            }
        }
    }
}

function hasSuperPotion(){
	if (has(battleWorld,"battleStatus","_cureItems",1,"count") && battleWorld.battleStatus._cureItems[1].count>0){
		return true;
	} else {
		return false;
	}
}

function clearWaitFinish(){
   var finishButton = cc.director._runningScene._seekWidgetByName("a_q_001_process_description_ok");
    if( finishButton && finishButton !== "null" && finishButton !== "undefined" ){
    finishButton._releaseUpEvent();
    }
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

function gotoHome(){
   kh.createInstance('router').navigate("mypage/my_001");
}

setTimeout(waitStart,5000);

/* Reference
battleStatusesByID = [
{5: "ATK↑, slot C"},
{6: "ATK↑, slot A"},
{7: "ATK↑, slot B"},
{9: "ATK↑, slot D, stackable"},
{10: "ATK↓, slot A"},
{11: "ATK↓, slot C"},
{12: "ATK↓, slot B"},
{13: "DEF↑, slot C"},
{14: "DEF↑, slot A"},
{15: "DEF↑, slot B"},
{16: "DEF↓, slot A"},
{17: "DEF↓, slot C"},
{18: "DEF↓, slot B"},
{19: "Ability DMG↑"},
{21: "Affliction RST↑"},
{22: "Affliction RST↓"},
{23: "Double Attack rate↑"},
{24: "Triple Attack rate↑"},
{27: "Next normal attack guaranteed to be Double Attack"},
{35: "HP recovered every turn"},
{36: "ATK↑ vs stuned"},
{37: "DMG taken↓"},
{38: "DMG taken↓+"},
{39: "Invincible"},
{40: "Intercept, Evades enemy normal attack & counterattacks"},
{41: "Reflect, Reflects DMG from enemy's normal attacks"},
{42: "Burst Gauge charge rate↑"},
{46: "? after Gauge down"},
{47: "Blocks 1 debuff"},
{52: "Overdrive Meter Max↑ +1"},
{53: "? after Overdrive reduction"},
{54: "Poisoned, Dark DMG each turn"},
{55: "Scorched, Fire DMG each turn"},
{56: "Putrefied, Physical DMG each turn"},
{57: "Drowned, Water DMG each turn"},
{60: "Blinded, Accuracy↓"},
{61: "Dizzy, Chance of losing attack turn"},
{62: "Paralysed, Unable to attack"},
{65: "Abilities Unusable"},
{67: "Time until Stun Mode removed↑"},
{68: "Total damage until Stun Mode removed increased"},
{69: "HP depleted at end of turn"},
{70: "Item drop rate↑"},
{71: "Becomes target of all single-unit attacks"},
{75: "Energy Drain, HP recovered with normal attack DMG"},
{76: "Mode Gauge reduction rate↑"},
{77: "? after Overdrive steal"},
{78: "Rampaging"},
{84: "Rage, ATK↑ on HP lost"},
{85: "Stealth, Unlikely to be target of attack"},
{87: "Lucky, Enemy attacks miss"},
{100: "ATK↓, slot X, Stackable"},
{101: "Fire ATK↑"},
{116: "Thunder RST↑"},
{134: "Covers in snow, freezing movements"},
{40001: "Summon, ATK↑"},
{40002: "Summon, ATK↓"},
{40003: "Summon, DEF↑"},
{40005: "Summon, Double Attack rate↑"},
{40007: "Summon, Double Attack rate↓"},
{40018: "Summon, Thunder Elemental RST increased"},
{50001: "Union buff, ATK↑"},
{50002: "Burst DMG↑"},
{50003: "Union buff, Double Attack rate↑"},
{50004: "Triple Attack rate↑"},
{50005: "Union buff, Max HP↑"},
{50006: "Union buff, Heal value & Heal limit↑"},
{50007: "Union buff, Affliction success rate↑"},
{50008: "Affliction RST↑"}
]
*/
