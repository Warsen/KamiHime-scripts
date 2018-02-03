// ==UserScript==
// @name         KamiHime quests auto start
// @namespace    http://tampermonkey.net/
// @version      11.01.2018
// @description  Kamihime auto start quests
// @author       Brig from discord
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/scenario/*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/scenario/*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mi/app.html*
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/top/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/top/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

//Begin of info
var questCircleTime = 600000; //ms, time between page refresh to start new quest from priority list ect. It must be more then 30 seconds
var raidCircleTime = 30000; //ms, time between checks of raid requests when you have sufficient bp
var minBPforCheckingRaids = 3;//if have less then minBPforCheckingRaids bp, do not check raid requests
var consoleLog = true; //flag to log to console
var useElixirForRagnarok = false; //flag to use half elexir to start Ragnarok
//for info:
// list of quest types.
var questTypes = ["main","free","raid","daily","event_quest","event_raid","guerrilla","clearingWorlds","clearDailyMissionSPQuests"];
//list for raid IDs: 1 is fire 20 Ap, 2 - fire 30 AP; 3,4 - Water 20 and 30; 5,6 - Wind; 7,8 - Thunder; 9,10 - Light; 11,12 - Dark
var raidIDs = [{1:"fire20AP"},{2:"fire30AP"},{3:"water20AP"},{4:"water30AP"},{5:"wind20AP"},{6:"wind30AP"},{7:"thunder20AP"},{8:"thunder30AP"},{9:"light20AP"},{10:"light30AP"},{11:"dark20AP"},{12:"dark30AP"}];
//for event_quest_id: 1 - beginner, 2 - Standard, 3 - Expert, 4 - Expert Silver, 5 - Expert Gold, 6 - Ultimate
var eventQuestIDs = [{1:"beginner"},{2:"Standard"},{3:"Expert"},{4:"Ultimate"},{5:"Ragnarok"}];
//for event_raid_id:
var eventRaidIDs = [{1:"standard"},{2:"expert"},{3:"Ragnarok"}];
//for union_raid_id:
var unionRaidIDs = [{1:"lilum standard"},{2:"lilum expert"},{3:"demon expert"},{4:"demon ultimate"}];
//for sunday SP
var guerrillaIDs = [{1:"gem standard"},{2:"gem expert"},{3:"weapon standard"},{4:"weapon expert"},{5:"eidolon standard"},{6:"eidolon expert"}];
//for daily
var dailyIDs = [{1:"beginner"},{2:"standard"},{3:"expert"}];
//for accessory
var accessoryIDs = [{1:"rank1"},{2:"rank2"},{3:"rank3"},{4:"rank4"}];
//world IDs for main and free quests are from 1 for first world ect.
//elements
var elements = ["fire","water","wind","thunder","dark","light"];
//end of info

//begin of your parameters

//for script:
// decksForRecommendedElement is to choose your party depending of quest recommended element, overides current party
// Do NOT change names of elements, change letters. for fire set your fire team ect. Add or replace your nutaku ID and teams. only characters from "A" to "F"
var decksForRecommendedElement = [
    {nutakuID:2222222222,decks:{fire:"A", water:"A", wind:"A", thunder:"A", dark:"A", light:"A"}},
    {nutakuID:1111111111,decks:{fire:"E", water:"D", wind:"B", thunder:"C", dark:"F", light:"A"}}
];

//priority list to start quests
//your can get one quest in variable to use it in priority list. you can choose party to run with this quest and try to find summon by name from friends
var questRaidExample = {type:"raid", raid_id:5, party:"A", summonElement:"thunder", summon:"Anzu"};//summon raid 20 ap wind
var questMainExample = {type:"main", world:2, main_quest_id:6, episode:2, party:"A", summonElement:"thunder", summon:"Anzu"};//main quest from 2nd world number 5 episode 2 (numbering is shared through worlds)
var questFreeExample = {type:"free", world:1, free_quest_id:8, summonElement:"thunder", summon:"Anzu"};//free quest from 1st world number 8 from low
var questDailyExample = {type:"daily", daily_quest_id:1, party:"A", summonElement:"thunder", summon:"Anzu"};//beginner daily quest
var questEventQuestExample = {type:"event_quest", event_quest_id:4, party:"E", summonElement:"fire", summon:"Fafnir"};//ultimate event quest
var questEventRaidExample = {type:"event_raid", event_raid_id:3, party:"C", summonElement:"thunder", summon:"Anzu"};//blue expert
var questGuerrillaExample = {type:"guerrilla", guerrilla_quest_id:4, party:"A", summonElement:"thunder", summon:"Anzu"};//weapon expert quest
var questClearingWorlds = {type:"clearingWorlds"};//sequentially runs non-open quests
var questClearDailySPQuests = {type:"clearDailyMissionSPQuests"};//do beginner SP quests for daily mission
var questUnionRaidExample = {type:"event_union", union_raid_id:2, party:"F", summonElement:"dark", summon:"Apocalypse"};//Lilim Expert, choose 1 or 2, cannot start demon raid
var questEventStoryExample = {type:"event_story", event_story_id:4, party:"B", summonElement:"wind", summon:"Sleipnir"};// 1 - beginner, 2 - Standard, 3 - Expert, 4 - Ultimate
var questAccessoryExample = {type:"accessory", accessory_quest_id:2, summonElement:"wind", summon:"Sleipnir"};//accessory daily quest rank 2
// questsList is list of quests by your ID to start them automatically. If 1st quest is unavalable (like sunday SP or event SP or raid used 3 times) then try 2nd ect. If cannot start 1st with lack of AP then wait.
var questsList = [
    {nutakuID:2222222222,priorityList:[
        {type:"raid", raid_id:9, summonElement:"thunder", summon:"Anzu"},
        {type:"raid", raid_id:7, summonElement:"thunder", summon:"Anzu"},
        {type:"raid", raid_id:1, summonElement:"thunder", summon:"Anzu"},
        {type:"raid", raid_id:3, summonElement:"thunder", summon:"Anzu"},
        {type:"raid", raid_id:5, summonElement:"thunder", summon:"Anzu"},
        {type:"raid", raid_id:11, summonElement:"thunder", summon:"Anzu"},
//		{type:"daily", daily_quest_id:3, summonElement:"thunder", summon:"Anzu"},
//      {type:"clearDailyMissionSPQuests", party:"C", summonElement:"light", summon:"Hecatonchires"},
    ]},
    {nutakuID:1111111111,priorityList:[
//		{type:"accessory", accessory_quest_id:4, party:"C", summonElement:"thunder", summon:"Yggdrasil"},//accessory daily quest rank 2
//      {type:"guerrilla", guerrilla_quest_id:2, party:"B", summonElement:"wind", summon:"Sleipnir"},
        {type:"clearDailyMissionSPQuests", summonElement:"wind", summon:"Sleipnir"},
//      {type:"raid", raid_id:9, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:7, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:1, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:3, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:5, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:11, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:2, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:4, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:6, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:8, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:10, summonElement:"thunder", summon:"Anzu"},
//      {type:"raid", raid_id:12, summonElement:"thunder", summon:"Anzu"},
//		{type:"daily", daily_quest_id:3, summonElement:"wind", summon:"Sleipnir"},
//		{type:"main", world:5, main_quest_id:25, episode:3, summonElement:"thunder", summon:"Anzu"},
//		{type:"event_raid", event_raid_id:3, party:"C", summonElement:"thunder", summon:"Yggdrasil"},//ragnarok
//		{type:"event_raid", event_raid_id:2, party:"C", summonElement:"thunder", summon:"Yggdrasil"},//expert
//		{type:"event_raid", event_raid_id:1, party:"C", summonElement:"thunder", summon:"Yggdrasil"},//standart
//      {type:"event_quest", event_quest_id:5, party:"F", summonElement:"dark", summon:"Dullahan"},//seem don't need it, will remove in future, for event_quest_id: 1 - beginner, 2 - Standard, 3 - Expert, 4 - Ultimate, 5 - Ragnarok
//		{type:"event_story", event_story_id:4, party:"B", summonElement:"wind", summon:"Sleipnir"}, //for event, 1 - beginner, 2 - Standard, 3 - Expert, 4 - Ultimate
//		{type:"event_story", event_story_id:4, party:"C", summonElement:"thunder", summon:"Yggdrasil"}, //for new events 1 - beginner, 2 - Standard, 3 - Expert, 4 - Ultimate, 5 - Ragnarok
      {type:"event_union", union_raid_id:2, party:"B", summonElement:"wind", summon:"Sleipnir"},//Lilim , choose 1 or 2, demon raids starts from raidsFilterList
    ]},
];
//filter to join raids
//if you don't want to join common raids then filter out them with battle_bp or participants:0.
//if you don't have filters then script will join first available raid
var raidsFilterList = [
    {nutakuID:2222222222, //join only 3 bp raids
	 raidsFilter:[{participants:0}, //join raids with n and less participants and do not join if 0
				 ],
	 eventRaidsFilter:[{participants:0},//join event raids with n and less participants and not join if 0
					  ],
	 ragnarok:[{participants:0},//join ragnarok raid with n and less participants and do not join if 0
			   {from_bp:2} //check ragnarok raid from "from_bp" bp and use energy seed if needed to start it
			  ],
	 unionLilumRaidsFilter:[{participants:0},//join union lilum raids with n and less participants and do not join if 0
							{union_raid_id:[2]},//join union lilum raids. look at list of union raids IDs.
						   ],
	},
    {nutakuID:1111111111,
	 summon:"Behemoth", //you can specify only eidolon name, element will go from suggested element, then party will be chosen from "decksForRecommendedElement"
	 raidsFilter:[{participants:0}, //join raids with n and less participants and do not join if 0
//				  {battle_bp:10} //join raids with n bp. if not actual bp then will not join them
//				  {raid_id:[1,3,5,7,9,11]} //join raids. look at list of raids IDs
				 ],
	 eventRaidsFilter:[{participants:1},//join event raids with n and less participants and not join if 0
					   {event_raid_id:[2]},//join event raids. look at list of event raids IDs.
					  ],
	 ragnarok:[{participants:0},//join ragnarok raid with n and less participants and do not join if 0
			   {from_bp:2}, //check ragnarok raid from "from_bp" bp and use energy seed if needed to start it
//               {has_union_member:true}//join only union member raids
	 ],
	 unionLilumRaidsFilter:[{participants:0},//join union lilum raids with n and less participants and do not join if 0
					   {union_raid_id:[2]},//join union lilum raids. look at list of union raids IDs.
					  ],
// Demon raids filter is tricky. You cannot join raid where you have been from script. Script will join first raid that meet all requirements with less participants and then number. It will first check ultimates then expert if you specify both.
	 unionDemonRaidsFilter:[{participants:0},//join union demon raids with n and less participants, 0 will work!
					   {union_raid_id:[]},//join union demon raids. 4 - ultimate, 3 - expert. empty to not join them
//					   {union_raid_id:[4,3]},//join union demon raids. 4 - ultimate, 3 - expert. uncomment to work
					  ],
	}
];
//end of your parameters

var info = {}, questInfoCall, state, currentQuestType, currentRaidID, currentQuest, currentQuestID, currentParty, currentPartyID, currentSummon, currentSummonID, currentEpisode,
    priorityList, currentRecommendedElement, currentOwnRaid, currentFunction, currentEventQuestID, href, nextPriority = 0, currentQuestArea, currentEventRaidID, currentSummonElement,
	currentUnionRaidID;

function waitBeforeStart() {
    if (location.host == "cf.r.kamihimeproject.dmmgames.com"){
        href = "https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html";
    } else {
        href = "https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html";
    }
    if (location.pathname === "/front/cocos2d-proj/components-pc/scenario/app.html" ||//skip scenario
        location.pathname === "/front/cocos2d-proj/components-pc/mi/app.html" || //skip panel
        location.pathname === "/front/cocos2d-proj/components-pc/top/app.html"){//skip start
        refreshPage();
        return;
    }
    if (has(kh,"createInstance")) {
        if (location.hash.startsWith("#!quest/q_003_1")){
            setTimeout(refreshPage,10000);
            return;
        } else {
        getQuestInfo();
        }
    } else {
    setTimeout(waitBeforeStart,1000);
    }
}

function getQuestInfo(){//get player and quests info
    questInfoCall = kh.createInstance("apiAQuestInfo");
    if (has(questInfoCall,"get")){questInfoCall.get().then(function(e) {
            info.questInfo = e.body;
            kh.createInstance("apiAPlayers").getMeNumeric().then(function(f) {
                info.player = f.body;
                kh.createInstance("apiAPlayers").getQuestPoints().then(function(g) {
                    info.questPoints = g.body.quest_points;
                    checkQuestInfo(0);//goto checkQuestInfo
                }.bind(this));
            }.bind(this));
        }.bind(this));
    } else {
        setTimeout(waitBeforeStart,1000);
    }
}

function checkQuestInfo(stage){ //must do pending quests and raids
	switch(stage) {
		case 0:
			if (consoleLog) {console.log('players with ID: ' + info.player.dmm_id);}
			if (info.questInfo.in_progress.help_raid_ids.length > 0){//have unfinished joined raid  info.questInfo.in_progress.help_raid_ids[0]
				if (consoleLog) {console.log('have unfinished joined raid');}
				raidInProgress();
				break;
			};
		default:
			if (has(info,"questInfo","in_progress","own_raid")) {//have own unfinished raid
				if (consoleLog) {console.log('have own unfinished raid');}
				currentRaidID = info.questInfo.in_progress.own_raid.a_battle_id;
				currentQuestID = info.questInfo.in_progress.own_raid.a_quest_id;
				currentQuestType = "raid";
				currentOwnRaid = true;
				state={};
				raidStage();
			} else if (has(info,"questInfo","in_progress","own_quest")){//have unfinished quest
				currentQuestID = info.questInfo.in_progress.own_quest.a_quest_id;
				currentQuestType = info.questInfo.in_progress.own_quest.type;
				if (consoleLog) {console.log('have unfinished quest, type: ' + currentQuestType + ', id: ' + currentQuestID);}
				kh.createInstance("apiAQuests").getCurrentState(currentQuestID,currentQuestType).then(function(e) {state = e.body;nextStage();}.bind(this));
			} else if (info.questInfo.has_unverified) { // there is complited raid without gotten result
				if (consoleLog) {console.log('have unverified raid');}
				kh.createInstance("apiABattles").getUnverifiedList().then(function(e) {info.raidUnverifiedList = e.body;resolveUnverifiedRaid();}.bind(this));
			} else {
				nextPriority=0;
				checkPriorityList();
			}
	}
    setTimeout(refreshPage,questCircleTime);//refresh page
}

function resolveUnverifiedRaid(){
    if (has(info,"raidUnverifiedList","data","0","a_quest_id")){
        var a_battle_id = info.raidUnverifiedList.data[0].a_battle_id;
        var quest_type = info.raidUnverifiedList.data[0].quest_type;
        if (consoleLog) {console.log('get battle result ' + a_battle_id);}
        kh.createInstance("apiABattles").getBattleResult(a_battle_id,quest_type).then(function(e) {info.battleResult = e.body;showBattleResult();}.bind(this));
    } else {
        checkPriorityList();
    }
}

function showBattleResult(){
    if (consoleLog) {console.log('gained gems: ' + info.battleResult.gems_gained.total);}
    for (var i=0;i<info.battleResult.items_gained.length;i++){
        if (consoleLog) {console.log('gained ' + info.battleResult.items_gained[i].amount + ' item: ' + info.battleResult.items_gained[i].name);}
    }
    setTimeout(refreshPage,5000);
}

function checkPriorityList(){
    if (consoleLog) {console.log('start to check priority list, try ' + nextPriority);}
    var yourQuests = questsList.filter(function ( obj ) {  return obj.nutakuID == info.player.dmm_id;})[0];
    if (has(yourQuests,"priorityList",nextPriority)) {
        var quest = yourQuests.priorityList[nextPriority];
        nextPriority++;
        if (has(quest,"type")){
            switch(quest.type) {
                case "main":
                    if (has(quest,"main_quest_id") && has(quest,"world") && has(quest,"episode")){
                        currentQuestType = "main";
                        currentQuest = quest.main_quest_id;
                        currentQuestArea = quest.world;
                        currentEpisode = quest.episode;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start main quest, world: ' + currentQuestArea + ', main_quest_id: ' + currentQuest + ', episode: ' + (currentEpisode) + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
                        kh.createInstance("apiAWorlds").getAreas().then(function(e) {info.worlds = e.body;findQuest();}.bind(this)); // get worlds and start quest
                    } else {
                        if (consoleLog) {console.log('do not have world or main_quest_id or episode for free quest');}
                        checkPriorityList();
                    }
                    break;
                case "free":
                    if (has(quest,"free_quest_id") && has(quest,"world")){
                        currentQuestType = "free";
                        currentQuest = quest.free_quest_id;
                        currentQuestArea = quest.world;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start free quest, world: ' + currentQuestArea + ', free_quest_id: ' + currentQuest + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
                        kh.createInstance("apiAWorlds").getAreas().then(function(e) {info.worlds = e.body;findQuest();}.bind(this)); // get worlds and start quest
                    } else {
                        if (consoleLog) {console.log('do not have world or free_quest_id for free quest');}
                        checkPriorityList();
                    }
                    break;
                case "raid":
                    if (has(quest,"raid_id")){
                        currentQuestType = "raid";
                        currentRaidID = quest.raid_id;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start raid: ' + currentRaidID + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
                        kh.createInstance("apiAQuests").getListRaid().then(function(e) {info.raids = e.body;prepareRaid();}.bind(this));
                    } else {
                        if (consoleLog) {console.log('do not have raid_id for raid');}
                        checkPriorityList();
                    }
                    break;
                case "daily":
                   if (has(quest,"daily_quest_id")){
                        currentQuestType = "daily";
                        currentQuest = quest.daily_quest_id;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start daily quest: ' + currentQuest + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
                        kh.createInstance("apiAQuests").getListSpecialQuest().then(function(e) {info.special = e.body;startDaily();}.bind(this));
                    } else {
                        if (consoleLog) {console.log('do not have daily_quest_id for daily quest');}
                        checkPriorityList();
                    }
                    break;
                case "event_quest":
                    if (has(quest,"event_quest_id")){
                        currentQuestType = "event";
                        currentEventQuestID = quest.event_quest_id;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start event quest: ' + currentEventQuestID + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
                        kh.createInstance("apiAQuests").getListSpecialQuest().then(function(e) {info.special = e.body;startEventQuest();}.bind(this));
                    } else {
                        if (consoleLog) {console.log('do not have event_quest_id for event quest');}
                        checkPriorityList();
                    }
                    break;
                case "event_story":
                    if (has(quest,"event_story_id")){
                        currentQuestType = "event";
                        currentEventQuestID = quest.event_story_id;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start event story quest: ' + currentEventQuestID + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
						kh.createInstance("apiABanners").getMypageBanners().then(function(e) {info.banners = e.body;startEventStory();}.bind(this));
                    } else {
                        if (consoleLog) {console.log('do not have event_story_id for event story quest');}
                        checkPriorityList();
                    }
                    break;
                case "event_raid":
                    if (has(quest,"event_raid_id")){
                        currentQuestType = "event_raid";
                        currentEventRaidID = quest.event_raid_id;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start event raid: ' + currentEventRaidID + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
						kh.createInstance("apiABanners").getMypageBanners().then(function(e) {info.banners = e.body;findEventRaid();}.bind(this));
                    } else {
                        if (consoleLog) {console.log('do not have event_raid_id for event raid');}
                        checkPriorityList();
                    }
                    break;
                case "event_union":
                    if (has(quest,"union_raid_id")){
                        currentQuestType = "event_union_lilim_raid";
                        currentUnionRaidID = quest.union_raid_id;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start union raid: ' + currentUnionRaidID + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
						kh.createInstance("apiABanners").getMypageBanners().then(function(e) {info.banners = e.body;findUnionRaid();}.bind(this));
                    } else {
                        if (consoleLog) {console.log('do not have union_raid_id for union raid');}
                        checkPriorityList();
                    }
                    break;
				case "guerrilla":
                    if (has(quest,"guerrilla_quest_id")){
                        currentQuestType = "guerrilla";
                        currentQuest = quest.guerrilla_quest_id;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start guerrilla quest: ' + currentQuest + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
                        kh.createInstance("apiAQuests").getListSpecialQuest().then(function(e) {info.special = e.body;startGuerrilla();}.bind(this));
                    } else {
                        if (consoleLog) {console.log('do not have guerrilla_quest_id for guerrilla quest');}
                        checkPriorityList();
                    }
                    break;
                case "clearingWorlds":
                    currentQuestType = "main";
                    if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
					if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                    if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                    if (consoleLog) {console.log('trying to start next non-open quest: with party: ' + currentParty + ', summon: ' + currentSummon);}
                    findNewQuest();
                    break;
                case "clearDailyMissionSPQuests":
                    if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
					if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                    if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                    if (consoleLog) {console.log('checking daily mission for SP quests');}
                    kh.createInstance("apiAMissions").getDaily().then(function(e) {info.daily_missions = e.body;checkDailyMissions();}.bind(this));
                    break;
                case "accessory":
                   if (has(quest,"accessory_quest_id")){
                        currentQuestType = "accessory";
                        currentQuest = quest.accessory_quest_id;
                        if (has(quest,"party")){currentParty = quest.party;}else{currentParty="";}
						if (has(quest,"summonElement")){currentSummonElement = quest.summonElement;}else{currentSummonElement = "";}
                        if (has(quest,"summon")){currentSummon = quest.summon;}else{currentSummon = "";}
                        if (consoleLog) {console.log('trying to start accessory quest: ' + currentQuest + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
                        kh.createInstance("apiAQuests").getListSpecialQuest().then(function(e) {info.special = e.body;startAccessory();}.bind(this));
                    } else {
                        if (consoleLog) {console.log('do not have accessory_quest_id for accessory quest');}
                        checkPriorityList();
                    }
                    break;
                default:
                    if (consoleLog) {console.log('cannot process quest with type: ' + quests[i].type);}
            }
        } else {
            if (consoleLog) {console.log('do not have meaningful quest type in questsList');}
            checkPriorityList();
        }
    } else {
        if (consoleLog) {console.log('end of priority list');}
        setTimeout(checkRequests,1000);//trying to join raid next
    }
}

function findQuest(){//check area and move to necessary area
    if (consoleLog) {console.log('filling quest list');}
    var nextArea = info.worlds.a_areas.filter(function ( obj ) {  return obj.area_id === currentQuestArea;})[0];
    if (has(nextArea,"a_area_id")){
        var neededArea = nextArea.a_area_id;
        var currentArea = info.questInfo.current_a_area_id;
        if (neededArea!==currentArea) {//player not at needed area, cannon get list of quests
            if (consoleLog) {console.log('going to needed area:' + currentQuestArea);}
            questInfoCall.moveArea(neededArea).then(function(e) {info.questInfo=e.body;findQuest();}.bind(this));
        } else {//can get list of quests
			if (currentQuestType === "main"){
                kh.createInstance("apiAAreas").getMainQuestsInCurrentArea().then(function(e) {info.main = e.body;prepareMainQuest();}.bind(this));
            } else if (currentQuestType === "free"){
                kh.createInstance("apiAAreas").getFreeQuestsInCurrentArea().then(function(e) {info.free = e.body;prepareFreeQuest();}.bind(this));
            }
        }
    } else {
        if (consoleLog) {console.log('wrong world for quest in list');}
//        checkPriorityList();
    }
}

function findNewQuest(){
    if (info.questInfo.next_a_area_id === null) {
        if (consoleLog) {console.log('there is no new quests');}
        checkPriorityList();
    } else if (info.questInfo.current_a_area_id !== info.questInfo.next_a_area_id){
        if (consoleLog) {console.log('going to needed area:' + info.questInfo.next_a_area_id);}
        questInfoCall.moveArea(info.questInfo.next_a_area_id).then(function(e) {info.questInfo=e.body;findNewQuest();}.bind(this));
    } else {
        currentQuestID = info.questInfo.next_a_quest_id;
        currentQuestType = "main";
        currentEpisode = -1;
        kh.createInstance("apiAAreas").getMainQuestsInCurrentArea().then(function(e) {info.main = e.body;prepareMainQuest(currentQuestID);}.bind(this));
    }
}

function startEventStory(){
	var storyEvent = info.banners.data.filter(function ( obj ) {   return obj.event_type === "quest_story_event";})[0];
	if (has(storyEvent)){
		var event_id = storyEvent.event_id;
		kh.createInstance("apiAQuests").getListEventNotScenarioQuest(event_id).then(function(e) {info.special = e.body;startEventQuest();}.bind(this));
	} else {
		if (consoleLog) {console.log('there is no current story event');}
        checkPriorityList();
	}
}

function findEventRaid(){
//    var raidEvent = info.banners.data.filter(function ( obj ) {  return obj.event_type === "raid_event";})[0];
	var raidEvent = info.banners.data.filter(function ( obj ) {  return obj.navigate_page === "raidevent/ra_001";})[0];
	if (has(raidEvent)){
		var event_id = raidEvent.event_id;
		kh.createInstance("apiAQuests").getListEventQuest(event_id).then(function(e) {info.event_raids = e.body;startRaidEvent();}.bind(this));
	} else {
		if (consoleLog) {console.log('there is no current raid event');}
        checkPriorityList();
	}
}

function findUnionRaid(){
    var unionEvent = info.banners.data.filter(function ( obj ) {  return obj.event_type === "union_raid_event";})[0];
	if (has(unionEvent)){
		var union_event_id = unionEvent.event_id;
		kh.createInstance("apiAQuests").getListEventQuest(union_event_id).then(function(e) {info.union_raids = e.body;startUnionEvent();}.bind(this));
	} else {
		if (consoleLog) {console.log('there is no current union event');}
        checkPriorityList();
	}
}

function prepareRaid(){//check list
    if (consoleLog) {console.log('finding needed raid');}
	for (var i=0;i<info.raids.raid_quest_lists.length;i++){
		var data = info.raids.raid_quest_lists[i].data;
		for (var j=0;j<data.length;j++){
			if (data[j].quest_id === currentRaidID) {
				var nextQuest = data[j];
			}
		}
	}
    if (has(nextQuest)) {
		if (checkQuestLimitsAndPrepare(nextQuest)){
			startQuest();
        }
    } else {
        if (consoleLog) {console.log('wrong raid id:' + currentRaidID);}
        checkPriorityList();
    }
}

function prepareFreeQuest(){//check list
    if (consoleLog) {console.log('finding needed free quest');}
    var nextQuest = info.free.data.filter(function ( obj ) {  return obj.quest_id === currentQuest && obj.type === "free";})[0];
    if (has(nextQuest)) {
		if (checkQuestLimitsAndPrepare(nextQuest)){
            startQuest();
        }
    } else {
        if (consoleLog) {console.log('wrong free quest id:' + currentQuest);}
        checkPriorityList();
    }
}

function prepareMainQuest(knownQuestID){//check list
    if (consoleLog) {console.log('finding needed main quest');}
    var nextQuest;
    if (knownQuestID !== undefined){
        nextQuest = info.main.data.filter(function ( obj ) {  return obj.a_quest_id === knownQuestID && obj.type === "main";})[0];
        if (has(nextQuest,"episodes")) {currentEpisode = nextQuest.episodes.length;}
    } else {
        nextQuest = info.main.data.filter(function ( obj ) {  return obj.quest_id === currentQuest && obj.type === "main";})[0];
    }
    if (has(nextQuest,"episodes",currentEpisode-1)) {
		var tempCurrentEpisode = currentEpisode;
		if (checkQuestLimitsAndPrepare(nextQuest)){
			currentEpisode = tempCurrentEpisode;
            startQuest();
        }
    } else {
        if (consoleLog) {console.log('wrong main quest id:' + currentQuest + ', with episode: ' + (currentEpisode));}
        checkPriorityList();
    }
}

function startRaidEvent(){
	if (consoleLog) {console.log('finding needed event raid');}
    var questID;
    var firstQuest = info.event_raids.data.filter(function ( obj ) {  return obj.type === "event_main";}).sort((a,b)=>(a.quest_id>b.quest_id))[0]
    if (has(firstQuest)) {
        questID = firstQuest.quest_id + currentEventRaidID;
    } else {
        if (consoleLog) {console.log('cannot find event raids');}
    }
    var eventQuest = info.event_raids.data.filter(function ( obj ) { return obj.quest_id === questID && obj.type === "event_raid";})[0];
    if (has(eventQuest)) {
		if (has(eventQuest,"required_item","amount") && eventQuest.required_item.amount > eventQuest.required_item.possession_amount){
            if (consoleLog) {console.log('has not required items for event raid with ID: ' + currentEventRaidID);}
            checkPriorityList();
		} else if (eventQuest.quest_ap<=info.questPoints.ap){
            currentQuestID = eventQuest.a_quest_id;
            currentRecommendedElement = eventQuest.episodes["0"].recommended_element_type;
            currentPartyID=0;
            currentSummonID=0;
            currentEpisode=-1;
            startQuest();
        } else {
            if (consoleLog) {console.log('has not AP for event quest with ID: ' + currentEventRaidID);}
			if (currentEventRaidID===3 && useElixirForRagnarok){//if ragnarok and flag
				useElixir();
				return;
			}
            nextPriority = 99;
            checkPriorityList();
        }
    } else {
        if (consoleLog) {console.log('cannot find event raid with ID: ' + currentEventRaidID);}
        checkPriorityList();
    }

}

function startUnionEvent(){
	if (consoleLog) {console.log('finding needed union raid');}
    var questID;
    var firstQuest = info.union_raids.data.filter(function ( obj ) {  return obj.type === "event_union_lilim_raid";})[0];
    if (has(firstQuest)) {
        questID = firstQuest.quest_id + currentUnionRaidID-1;
    } else {
        if (consoleLog) {console.log('cannot find union raids');}
    }
    var unionQuest = info.union_raids.data.filter(function ( obj ) {  return obj.quest_id === questID && obj.type === "event_union_lilim_raid";})[0];
    if (has(unionQuest)) {
		if (checkQuestLimitsAndPrepare(unionQuest)){
            startQuest();
        }
    } else {
        if (consoleLog) {console.log('cannot find union raid with ID: ' + currentUnionRaidID);}
        checkPriorityList();
    }

}

function startDaily(){
    if (consoleLog) {console.log('start daily');}
    var quest_ap;
    if (currentQuest===1) {
        quest_ap = 8;
    } else if (currentQuest===2) {
        quest_ap = 15;
    } else if (currentQuest===3) {
        quest_ap = 25;
    } else {
        if (consoleLog) {console.log('wrong daily_quest_id: ' + currentQuest);}
        checkPriorityList();
    }
    var dailyQuest = info.special.data.filter(function ( obj ) {  return obj.quest_ap === quest_ap && obj.type === "daily";})[0];
    if (has(dailyQuest)) {
		if (checkQuestLimitsAndPrepare(dailyQuest)){
            startQuest();
        }
    } else {
        if (consoleLog) {console.log('cannot find daily quest with ID: ' + currentQuest);}
        checkPriorityList();
    }
}

function startAccessory(){
    if (consoleLog) {console.log('start accessory');}
    var accessoryQuest = info.special.data.filter(function ( obj ) {  return obj.type === "accessory";}).sort((a,b)=>(a.a_quest_id>b.a_quest_id))[currentQuest-1];
    if (has(accessoryQuest)) {
		if (checkQuestLimitsAndPrepare(accessoryQuest)){
            startQuest();
        }
    } else {
        if (consoleLog) {console.log('cannot find accessory quest with ID: ' + currentQuest);}
        checkPriorityList();
    }
}


function startEventQuest(){
    if (consoleLog) {console.log('start event');}
    var questID;
    var firstQuest = info.special.data.filter(function ( obj ) {  return obj.quest_ap === 10 && obj.type === "event";})[0];
    if (has(firstQuest)) {
        questID = firstQuest.quest_id + currentEventQuestID - 1;
    } else {
        if (consoleLog) {console.log('cannot find event quests');}
    }
    var eventQuest = info.special.data.filter(function ( obj ) {  return obj.quest_id === questID && obj.type === "event";})[0];
    if (has(eventQuest)) {
		if (checkQuestLimitsAndPrepare(eventQuest)){
            startQuest();
		}
    } else {
        if (consoleLog) {console.log('cannot find event quest with ID: ' + currentEventQuestID);}
        checkPriorityList();
    }
}

function startGuerrilla(){
    if (consoleLog) {console.log('start guerrilla');}
    var guerrillaQuest = info.special.data.filter(function ( obj ) {  return obj.quest_id === currentQuest && obj.type === "guerrilla";})[0];
    if (has(guerrillaQuest)) {
		if (checkQuestLimitsAndPrepare(guerrillaQuest)){
            startQuest();
        }
    } else {
        if (consoleLog) {console.log('cannot find guerrilla quest with ID: ' + currentQuest);}
        checkPriorityList();
    }
}

function checkQuestLimitsAndPrepare(questObj){
	if (!has(questObj)) {
        if (consoleLog) {console.log('cannot find quest while checking limits');}
        checkPriorityList();
		return false;
	}
	if ("number" == typeof questObj.quest_ap && questObj.quest_ap>info.questPoints.ap) {
		if (consoleLog) {console.log('has not AP for quest with ID: ' + currentEventQuestID);}
		nextPriority = 99;
		checkPriorityList();
		return false;
	}
	if (has(questObj,"limit_info","rank") && "number" == typeof questObj.limit_info.rank && questObj.limit_info.rank>info.player.rank) {
		if (consoleLog) {console.log('has not enough player level for quest with ID: ' + currentEventQuestID);}
		checkPriorityList();
		return false;
	}
	if (has(questObj,"limit_info","remaining_challenge_count") && questObj.limit_info.remaining_challenge_count === 0) {
		if (consoleLog) {console.log('cannot do again quest today with ID: ' + currentEventQuestID);}
		checkPriorityList();
		return false;
	}
	currentQuestID = questObj.a_quest_id;
	currentRecommendedElement = questObj.episodes["0"].recommended_element_type;
	currentPartyID=0;
	currentSummonID=0;
	currentEpisode=-1;
	return true;
}

function startQuest(){//using global variables currentQuestID, currentQuestType, currentPartyID, currentSummonID
    currentFunction = startQuest;
    if (currentPartyID===0 || currentPartyID === undefined){//if not have currentPartyID then find it
        kh.createInstance("apiAParties").getDecks().then(function(e) {info.decks = e.body.decks;kh.createInstance("apiAPlayers").getMeNumeric().then(function(e) {info.player = e.body;getPartyID();}.bind(this));}.bind(this));
    } else if (currentSummonID===0 || currentSummonID===undefined){
		var summonElement = currentRecommendedElement;
		if (currentSummonElement !== undefined){
			summonElement = elements.indexOf(currentSummonElement);
		}
        kh.createInstance("apiASummons").getSupporters(summonElement).then(function(e) {info.supporters = e.body;getSummonID();}.bind(this));
    } else {//we can start quest
        if (consoleLog) {console.log('startQuest, id: ' + currentQuestID + ', type: ' + currentQuestType + ', party ID: ' + currentPartyID + ', summon ID:' + currentSummonID);}
        if (currentEpisode!==-1) {
            kh.createInstance("apiAQuests").startQuest(currentQuestID,currentQuestType,currentPartyID,currentSummonID,currentEpisode).then(function(e) {state = e.body; nextStage();}.bind(this));
        } else {
            kh.createInstance("apiAQuests").startQuest(currentQuestID,currentQuestType,currentPartyID,currentSummonID).then(function(e) {state = e.body; nextStage();}.bind(this));
        }
    }
}

function getPartyID(){//select deck number. using global currentRecommendedElement and currentParty
    //first use selected party
    currentPartyID = info.player.selected_party.a_party_id;
    //then use party from decksForRecommendedElement if exist for quest recommended element
    var yourDecks = decksForRecommendedElement.filter(function ( obj ) {  return obj.nutakuID == info.player.dmm_id;})[0];
    var suggestedCurrentParty = "";
    if (has(yourDecks,"decks")) {
        switch (currentRecommendedElement) {//fire:0, water:1, wind:2, thunder:3, dark:4, light:5
            case 0:
                if (has(yourDecks,"decks","fire")){suggestedCurrentParty=yourDecks.decks.fire;}
                break;
            case 1:
                if (has(yourDecks,"decks","water")){suggestedCurrentParty=yourDecks.decks.water;}
                break;
            case 2:
                if (has(yourDecks,"decks","wind")){suggestedCurrentParty=yourDecks.decks.wind;}
                break;
            case 3:
                if (has(yourDecks,"decks","thunder")){suggestedCurrentParty=yourDecks.decks.thunder;}
                break;
            case 4:
                if (has(yourDecks,"decks","dark")){suggestedCurrentParty=yourDecks.decks.dark;}
                break;
            case 5:
                if (has(yourDecks,"decks","light")){suggestedCurrentParty=yourDecks.decks.light;}
                break;
            default:
        }
    }
    if (consoleLog) {console.log('getPartyID with party from list: ' + currentParty + ', and party from suggestions: ' + suggestedCurrentParty);}
    if (["A","B","C","D","E","F"].indexOf(currentParty)==-1){
        currentParty = suggestedCurrentParty;
    }
    //then use party from quest list if exist
    switch (currentParty) {
        case "A":
            if (has(info,"decks",0,"a_party_id")){currentPartyID=info.decks[0].a_party_id;}
            break;
        case "B":
            if (has(info,"decks",1,"a_party_id")){currentPartyID=info.decks[1].a_party_id;}
            break;
        case "C":
            if (has(info,"decks",2,"a_party_id")){currentPartyID=info.decks[2].a_party_id;}
            break;
        case "D":
            if (has(info,"decks",3,"a_party_id")){currentPartyID=info.decks[3].a_party_id;}
            break;
        case "E":
            if (has(info,"decks",4,"a_party_id")){currentPartyID=info.decks[4].a_party_id;}
            break;
        case "F":
            if (has(info,"decks",5,"a_party_id")){currentPartyID=info.decks[5].a_party_id;}
            break;
        default:
    }
    if (consoleLog) {console.log('party ID: ' + currentPartyID);}
    currentFunction();
}

function getSummonID(){//select summon, using global currentSummon
    if (consoleLog) {console.log('getSummonID with summon ' + currentSummon);}
    var nextSummon = info.supporters.data.filter(function ( obj ) {return obj.summon_info.name === currentSummon && obj.is_friend;})[0];
    if (has(nextSummon,"summon_info","a_summon_id")){//if has friend supporter with summon as in currentSummon name
        currentSummonID = nextSummon.summon_info.a_summon_id;
    } else {//else from first supporter
        currentSummonID = info.supporters.data[0].summon_info.a_summon_id;
    }
    if (consoleLog) {console.log('summon ID ' + currentSummonID);}
    currentFunction();
}

function nextStage(){
    if (consoleLog) {console.log('quest stage: ' + state.next_info.next_kind + ", id " + state.a_quest_id);}
    if (state.next_info.next_kind == "talk" ||  state.next_info.next_kind == "harem-story") {
        kh.createInstance("apiAQuests").getNextState(state.a_quest_id,currentQuestType).then(function(e) {state = e.body; nextStage();}.bind(this));
    } else if (state.next_info.next_kind == "battle"){
        gotoBattle();
    } else if (state.next_info.next_kind == "battle_result"){
        kh.createInstance("apiABattles").getBattleResult(state.next_info.id,currentQuestType).then(function(e) {info.battleResult = e.body;showBattleResult();}.bind(this));
    } else {
        doQuest();
    }
}

function gotoBattle(){
    kh.createInstance("questStateManager").restartQuest(state.a_quest_id, currentQuestType);
}

function checkRequests(eventRaidID,unionRaidID){//prepare data for raid requests: get raid requests list, current AP and BP and check if event or union raid is on and get there id's
//    if (consoleLog) {console.log('prepare raid requests ' + eventRaidID + ", " + unionRaidID + ", " + has(info,"banners") + ", " + has(info,"event_raids") + ", " + has(info,"union_raids"));}
	if (eventRaidID===undefined) {
		if (!has(info,"banners")){
			kh.createInstance("apiABanners").getMypageBanners().then(function(e) {info.banners = e.body;checkRequests();}.bind(this));
		} else if (!has(info,"event_raids") && !has(info,"union_raids")){
			var raidEvent = info.banners.data.filter(function ( obj ) {  return obj.navigate_page === "raidevent/ra_001";})[0];
			var unionEvent = info.banners.data.filter(function ( obj ) {  return obj.event_type === "union_raid_event";})[0];
			if (has(raidEvent)){
				kh.createInstance("apiAQuests").getListEventQuest(raidEvent.event_id).then(function(e) {info.event_raids = e.body;checkRequests();}.bind(this));
			} else if (has(unionEvent)){
				kh.createInstance("apiAQuests").getListEventQuest(unionEvent.event_id).then(function(e) {info.union_raids = e.body;checkRequests();}.bind(this));
			} else {
				checkRequests(0,0);
			}
		} else if (has(info,"event_raids")){
			var questID;
			var firstEventQuest = info.event_raids.data.filter(function ( obj ) {  return obj.type === "event_main";}).sort((a,b)=>(a.quest_id>b.quest_id))[0]
			if (has(firstEventQuest)) {
				kh.createInstance("apiAItems").getCure(1, 10).then(function(e) {info.cure_items = e.body;checkRequests(firstEventQuest.quest_id,0);}.bind(this));
			}else {
				checkRequests(0,0);
			}
		} else if (has(info,"union_raids")){
			var questID;
			var firstUnionQuest = info.union_raids.data.filter(function ( obj ) {  return obj.type === "event_union_lilim_raid";})[0];
			var unionEvent = info.banners.data.filter(function ( obj ) {  return obj.event_type === "union_raid_event";})[0];
			if (has(firstUnionQuest)){
				kh.createInstance("apiAItems").getCure(1, 10).then(function(e) {info.cure_items = e.body;
                    kh.createInstance("apiABattles").getUnionRaidRequestList(unionEvent.event_id,"Ultimate").then(function(e) {info.union_demon_ultimates = e.body;
                         kh.createInstance("apiABattles").getUnionRaidRequestList(unionEvent.event_id,"Expert").then(function(e) {info.union_demon_experts = e.body;
                              checkRequests(0,firstUnionQuest.quest_id);
                         }.bind(this));
					}.bind(this));
				}.bind(this));
			}else {
				checkRequests(0,0);
			}
		} else {
			checkRequests(0,0);
		}
	} else {
		kh.createInstance("apiABattles").getRaidRequestList().then(function(e) {
			info.raidRequestList = e.body;kh.createInstance("apiAPlayers").getQuestPoints().then(function(e) {
				info.questPoints = e.body.quest_points;checkRequests1(eventRaidID,unionRaidID);
			}.bind(this));
		}.bind(this));
	}
}

function checkRequests1(eventRaidID,unionRaidID){//apply raid filters to list of raid requests
    if (consoleLog) {console.log('checking raid requests');}
    if (consoleLog && (eventRaidID>0)) {console.log('raid event is on from id '+eventRaidID);}
    if (consoleLog && (unionRaidID>0)) {console.log('union event is on from id '+unionRaidID);}
	var bpFilter,participantsFilter,raidIdFilter,eventBpFilter,eventParticipantsFilter,eventRaidIdFilter,ragnarokBp,ragnarokParticipantsFilter,i,raidData,
		unionParticipantsFilter,unionRaidIdFilter,ragnarokHasUnionMember,unionDemonParticipantsFilter,unionDemonRaidIdFilter;
    var yourFilter = raidsFilterList.filter(function ( obj ) {  return obj.nutakuID == info.player.dmm_id;})[0];
	if (has(yourFilter,"summon")) {//if has suggested summon
		currentSummon = yourFilter.summon;
	} else {
		currentSummon = "";
	}
    if (has(yourFilter,"raidsFilter",0)) {//if has raid filters
        bpFilter = yourFilter.raidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('battle_bp');})[0];//check bp filter
        participantsFilter = yourFilter.raidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('participants');})[0];//check number of participants filter
        raidIdFilter = yourFilter.raidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('raid_id');})[0];//check raid ids filter
    }
    if (has(yourFilter,"eventRaidsFilter",0)) {//if has event raid filters
        eventBpFilter = yourFilter.eventRaidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('battle_bp');})[0];//check bp filter
        eventParticipantsFilter = yourFilter.eventRaidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('participants');})[0];//check number of participants filter
        eventRaidIdFilter = yourFilter.eventRaidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('event_raid_id');})[0];//check raid ids filter
    }
    if (has(yourFilter,"ragnarok",0)) {//if has ragnarok filters
        ragnarokBp = yourFilter.ragnarok.filter(function ( obj ) {return obj.hasOwnProperty('from_bp');})[0];//check bp filter
        ragnarokParticipantsFilter = yourFilter.ragnarok.filter(function ( obj ) {return obj.hasOwnProperty('participants');})[0];//check number of participants filter
        ragnarokHasUnionMember = yourFilter.ragnarok.filter(function ( obj ) {return obj.hasOwnProperty('has_union_member');})[0];
	}
    if (has(yourFilter,"unionLilumRaidsFilter",0)) {//if has union lilim raid filters
        unionParticipantsFilter = yourFilter.unionLilumRaidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('participants');})[0];//check number of participants filter
        unionRaidIdFilter = yourFilter.unionLilumRaidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('union_raid_id');})[0];//check raid ids filter
    }
    if (has(yourFilter,"unionDemonRaidsFilter",0)) {//if has union demon raid filters
        unionDemonParticipantsFilter = yourFilter.unionDemonRaidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('participants');})[0];//check number of participants filter
        unionDemonRaidIdFilter = yourFilter.unionDemonRaidsFilter.filter(function ( obj ) {return obj.hasOwnProperty('union_raid_id');})[0];//check raid ids filter
    }
	if ((eventRaidID>0) && has(ragnarokBp,"from_bp") && (ragnarokBp.from_bp<=info.questPoints.bp)){//check ragnarok
		if (consoleLog) {console.log('checking ragnarok');}
		for (i=0;i<info.raidRequestList.data.length;i++){
			raidData = info.raidRequestList.data[i];
			if (raidData.quest_id!==(eventRaidID+3)) {continue;}//raid id not ragnarok
			if (has(ragnarokParticipantsFilter,"participants") && ragnarokParticipantsFilter.participants<raidData.participants) {continue;}// has too many participants
			if (has(ragnarokHasUnionMember,"has_union_member") && ragnarokHasUnionMember.has_union_member && !raidData.has_union_member) {continue;}// do not have union member
			if (consoleLog) {console.log('there is ragnarok raid');}
			if (raidData.battle_bp>info.questPoints.bp){
				var bp=raidData.battle_bp-info.questPoints.bp;
				var seeds = info.cure_items.data.filter(function ( obj ) {return obj.name==='Energy Seed';})[0];
				if (has(seeds,"a_item_id") && seeds.num>=bp){//get bp
					kh.createInstance("apiAItems").useItem(seeds.a_item_id,bp).then(function(e) {
						checkRequests(eventRaidID);
					}.bind(this));
					return;
				} else {
					if (consoleLog) {console.log('not enough energy seeds');}
					continue;
				}
			}
			//all filters checked, can join raid
			joinRaidData(raidData);
			joinRaid();
			return;
		}
	} else {
		if (minBPforCheckingRaids>info.questPoints.bp) {return;}//if has less bp then min bp for raid - no more checking
	}
	if (minBPforCheckingRaids<=info.questPoints.bp) {
		for (i=0;i<info.raidRequestList.data.length;i++){//check every raid in list and start if it fits filters
			raidData = info.raidRequestList.data[i];
			if (consoleLog) {console.log('check raid: bp ' + raidData.battle_bp + ", name: " + raidData.enemy_name);}
			if (info.questPoints.bp<raidData.battle_bp) {continue;}// not enough bp
			if (raidData.quest_type==="raid"){
				if (has(bpFilter,"battle_bp") && bpFilter.battle_bp!==raidData.battle_bp) {continue;}// has not needed bp
				if (has(participantsFilter,"participants") && participantsFilter.participants<raidData.participants) {continue;}// has too many participants
				if (has(raidIdFilter,"raid_id",0) && (raidIdFilter.raid_id.indexOf(raidData.quest_id)===-1)) {continue;}//raid id not in list
			} else if (raidData.quest_type==="event_raid"){
				if (has(eventBpFilter,"battle_bp") && eventBpFilter.battle_bp!==raidData.battle_bp) {continue;}// has not needed bp
				if (has(eventParticipantsFilter,"participants") && eventParticipantsFilter.participants<raidData.participants) {continue;}// has too many participants
				if (has(eventRaidIdFilter,"event_raid_id",0) && (eventRaidIdFilter.event_raid_id.indexOf(raidData.quest_id-eventRaidID)===-1)) {continue;}//raid id not in list
			} else if (raidData.quest_type==="event_union_lilim_raid"){
				if (has(unionParticipantsFilter,"participants") && unionParticipantsFilter.participants<raidData.participants) {continue;}// has too many participants
				if (has(unionRaidIdFilter,"union_raid_id",0) && (unionRaidIdFilter.union_raid_id.indexOf(raidData.quest_id-unionRaidID+1)===-1)) {continue;}//raid id not in list
			} else {
				continue;
			}
			//all filters checked, can join raid
			joinRaidData(raidData);
			joinRaid();
			return;
		}
		if (unionDemonRaidIdFilter !== "undefined" && unionRaidID > 0 ){
			if (unionDemonRaidIdFilter.union_raid_id.indexOf(4)>-1){
				raidData = info.union_demon_ultimates.data.filter(obj => {return (obj.participants <= unionDemonParticipantsFilter.participants && !obj.is_joined && obj.battle_bp<= info.questPoints.bp);})
					.sort((a,b) => (a.a_battle_id > b.a_battle_id)).sort((a,b) => (a.participants > b.participants))[0];
				if (has(raidData,"a_battle_id")) {
					joinRaidData(raidData);
					joinRaid();
					return;
				} else if (consoleLog) {console.log('no suitable ultimates');}
			}
			if (unionDemonRaidIdFilter.union_raid_id.indexOf(3)>-1){
				raidData = info.union_demon_experts.data.filter(obj => {return (obj.participants <= unionDemonParticipantsFilter.participants && !obj.is_joined && obj.battle_bp<= info.questPoints.bp);})
					.sort((a,b) => (a.a_battle_id > b.a_battle_id)).sort((a,b) => (a.participants > b.participants))[0];
				if (has(raidData,"a_battle_id")) {
					joinRaidData(raidData);
					joinRaid();
					return;
				} else if (consoleLog) {console.log('no suitable experts');}
			}
		}
	}
	setTimeout(checkRequests,raidCircleTime);
}

function joinRaidData(raidData){
			currentRaidID = raidData.a_battle_id;
			currentQuestID = raidData.a_quest_id;
			currentQuestType = raidData.quest_type;
			currentRecommendedElement = raidData.recommended_element_type;
			currentOwnRaid = raidData.is_own_raid;
			currentPartyID = 0;
			currentSummonID = 0;
			currentParty = "";
}

function raidInProgress(){
    kh.createInstance("apiABattles").getRaidRequestList().then(function(e) {info.raidRequestList = e.body;raidInProgress1();}.bind(this));
}

function raidInProgress1(){
    var progressRaid = info.raidRequestList.data.filter(function ( obj ) {  return obj.is_joined || obj.is_own_raid;})[0];
    if (has(progressRaid,"a_battle_id")){
        if (consoleLog) {console.log('open raid in progress: bp ' + progressRaid.battle_bp + ", name: " + progressRaid.enemy_name);}
        currentRaidID = progressRaid.a_battle_id;
        currentQuestID = progressRaid.a_quest_id;
        currentQuestType = progressRaid.quest_type;
        currentOwnRaid = progressRaid.is_own_raid;
        raidStage();
    } else {
        checkQuestInfo(1);
    }
}

function joinRaid(){//using global variables currentRaidID, currentQuestType, currentPartyID, currentSummonID
    currentFunction = joinRaid;
    if (currentPartyID===0 || currentPartyID === undefined){//if not have currentPartyID then find it
        kh.createInstance("apiAParties").getDecks().then(function(e) {info.decks = e.body.decks;kh.createInstance("apiAPlayers").getMeNumeric().then(function(e) {info.player = e.body;getPartyID();}.bind(this));}.bind(this));
    } else if (currentSummonID===0 || currentSummonID===undefined){
		var summonElement = currentRecommendedElement;
		if (currentSummonElement !== undefined){
			summonElement = elements.indexOf(currentSummonElement);
		}
		if (summonElement === 6) { // if not base element then we must find from another source
			summonElement = info.decks.filter( obj => obj.a_party_id===currentPartyID )[0].job.element_type;
		}
	    kh.createInstance("apiASummons").getSupporters(summonElement).then(function(e) {info.supporters = e.body;getSummonID();}.bind(this));
    } else {//we can join raid
        if (consoleLog) {console.log('joinRaid, id: ' + currentRaidID + ', type: ' + currentQuestType + ', party ID: ' + currentPartyID + ', summon ID:' + currentSummonID);}
        kh.createInstance("apiABattles").joinBattle(currentRaidID,currentSummonID,currentPartyID,currentQuestType).then(function(e) {state = e.body;raidStage(); }.bind(this));
    }
}

function raidStage(){
    if (has(state,"cannot_progress_info")){
        if (consoleLog) {console.log("cannot join raid, error: " + state.cannot_progress_info.type);}
    } else {//open battle
        kh.createInstance("router").navigate("battle", {
            quest_type: currentQuestType,
            a_battle_id: currentRaidID,
            a_player_id: info.player.a_player_id,
            a_quest_id: currentQuestID,
            is_own_raid: currentOwnRaid
        });
    }
}

function checkDailyMissions(){
    var missionSPQuests = info.daily_missions.missions.filter(function ( obj ) {  return obj.title == "Clear a Daily Quest";})[0];
    if (has(missionSPQuests,"now_progress") && has(missionSPQuests,"max_progress") && missionSPQuests.now_progress<missionSPQuests.max_progress){
            currentQuestType = "daily";
            currentQuest = 1;
            if (consoleLog) {console.log('trying to start daily quest: ' + currentQuest + ', with party: ' + currentParty + ', summon: ' + currentSummon);}
            kh.createInstance("apiAQuests").getListSpecialQuest().then(function(e) {info.special = e.body;startDaily();}.bind(this));
    } else {
        if (consoleLog) {console.log('mission daily SP quests done');}
        checkPriorityList();
    }
}

function useElixir(){
	if (!has(info,"cure_items")){
		kh.createInstance("apiAItems").getCure(1, 10).then(function(e) {info.cure_items = e.body;useElixir();}.bind(this));
	} else {
		var elixir = info.cure_items.data.filter(function ( obj ) {return obj.name==='Half Elixir';})[0];
		if (has(elixir,"a_item_id")){//get AP
			kh.createInstance("apiAItems").useItem(elixir.a_item_id,1).then(function(e) {
				waitBeforeStart();
			}.bind(this));
			return;
		}
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

function refreshPage(){
    location.href=href;
}

setTimeout(waitBeforeStart,5000);
