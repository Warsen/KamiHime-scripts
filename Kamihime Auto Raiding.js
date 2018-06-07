// ==UserScript==
// @name         Kamihime Auto Raiding
// @namespace    https://github.com/Warsen/KamiHime-scripts
// @version      0.2
// @description  Automatically joins raid battles for you. Wait at the raid listing page.
// @author       Warsen
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Ends the script when you have no BP to use.
var optionEndWithNoBP = false;

// Filter functions to be used in filtering raid requests.
// Ignores raid requests that do not meet the following conditions.
var optionRaidRequestFilters = []
optionRaidRequestFilters.push(a => a.enemy_hp / a.enemy_max >= 0.20);
optionRaidRequestFilters.push(a => (a.enemy_level == 50 && a.participants <= 8) || (a.enemy_level == 70 && a.participants <= 12));
//optionRaidRequestFilters.push(a => a.enemy_level == 50 && a.participants <= 8);
//optionRaidRequestFilters.push(a => a.enemy_level == 70 && a.participants <= 12);
optionRaidRequestFilters.push(a => !a.enemy_name.startsWith("Prison"));

// Sort functions to be used in sorting raid requests.
// The script always picks the first raid after filtering, so you want your
// prefered raid conditions sorted to the front.
var optionRaidRequestSorts = []
optionRaidRequestSorts.push((a, b) => b.enemy_level - a.enemy_level || b.enemy_hp - a.enemy_hp);
//optionRaidRequestSorts.push((a, b) => b.has_union_member - a.has_union_member);
//optionRaidRequestSorts.push((a, b) => b.help_requested_player_name == "playername");

// Filter functions to be used in filtering helpers.
var optionSupporterFilters = []
optionSupporterFilters.push(a => !a.summon_info.name.startsWith("Lilim"));

// Sort functions to be used in sorting supporters.
var optionSupporterSorts = []
optionSupporterSorts.push((a, b) => b.summon_info.level - a.summon_info.level);

// Milliseconds to wait at the item acquisition screen.
// If you want to exit automatic navigation, this gives you extra time to do it.
var optionWaitAtAcquisitions = 5000;

// Milliseconds to wait between checks for raid requests.
// The game doesn't normally allow you to refresh when checking for raid requests
// and raids don't disappear very quickly, so please wait at least 20 seconds.
var optionWaitBetweenRaidRequestChecks = 20000;

let khPlayersApi;
let khQuestInfoApi;
let khQuestsApi;
let khBattlesApi;
let khItemsApi;
let khWeaponsApi;
let khSummonsApi;
let khGachaApi;
let khQuestStateManager;
let khRouter;
let scriptInterrupt;

async function khInjectionAsync()
{
	// Wait for the game to finish loading.
	while (!has(cc, "director", "_runningScene", "_seekWidgetByName") && !has(kh, "createInstance")) {
		await delay(1000);
	}

	// Create instances of the various APIs.
	khPlayersApi = kh.createInstance("apiAPlayers");
	khQuestInfoApi = kh.createInstance("apiAQuestInfo");
	khQuestsApi = kh.createInstance("apiAQuests");
	khBattlesApi = kh.createInstance("apiABattles");
	khItemsApi = kh.createInstance("apiAItems");
	khWeaponsApi = kh.createInstance("apiAWeapons");
	khSummonsApi = kh.createInstance("apiASummons");
	khGachaApi = kh.createInstance("apiAGacha");
	khQuestStateManager = kh.createInstance("questStateManager");
	khRouter = kh.createInstance("router");

	// Inject our own code into navigation.
	khRouter.navigate2 = kh.Router.prototype.navigate;
	kh.Router.prototype.navigate = function(destination) {
		khRouter.navigate2.apply(this, arguments);

		scriptInterrupt = true;

		if (destination == "quest/q_006") {
			setTimeout(scriptAutoRaidBattle, 3000);
		}
	};

	// If at the results screen, go to the raid requests screen.
	if (location.hash.startsWith("#!quest/q_003_1"))
	{
		await delay(8000);
		if (location.hash.startsWith("#!quest/q_003_1")) {
			khRouter.navigate2("quest/q_003_2");
		}
	}
	if (location.hash.startsWith("#!quest/q_003_2"))
	{
		await delay(3000);
		if (optionWaitAtAcquisitions) {
			await delay(optionWaitAtAcquisitions);
		}
		if (location.hash.startsWith("#!quest/q_003_2")) {
			khRouter.navigate2("quest/q_006");
		}
	}
	if (location.hash.startsWith("#!quest/q_006"))
	{
		await delay(3000);
		await scriptAutoRaidBattle();
	}
}

async function scriptAutoRaidBattle()
{
	let profile = await getMyProfileAsync();
	let questInfo = await getQuestInfoAsync();

	if (questInfo.has_unverified)
	{
		let pending = await getPendingResultListAsync();
		for (let result of pending) {
			await getBattleResultAsync(result.a_battle_id, result.quest_type)
		}

		questInfo = await getQuestInfoAsync();
	}

	if (questInfo.in_progress.own_raid)
	{
		khRouter.navigate2("battle", {
			a_battle_id: questInfo.in_progress.own_raid.a_battle_id,
			a_player_id: profile.a_player_id,
			a_quest_id: questInfo.in_progress.own_raid.a_quest_id,
			is_own_raid: true,
			quest_type: "raid"
		});
	}
	else if (questInfo.in_progress.own_quest)
	{
		let quest = questInfo.in_progress.own_quest;
		let state = await getQuestStateAsync(quest.a_quest_id, quest.type);

		while (state.next_info.next_kind == "talk" || state.next_info.next_kind == "harem-story") {
			state = await getQuestNextStateAsync(state.a_quest_id, quest.type);
		}

		khQuestStateManager.restartQuest(state.a_quest_id, quest.type);
	}
	else
	{
		let qp = await getQuestPointsAsync();
		if (optionEndWithNoBP && qp.bp == 0) {
			console.log("No BP to use. Ending...");
			return;
		}

		scriptInterrupt = false;
		while (!scriptInterrupt)
		{
			let requests = await getRaidRequestListAsync();
			requests = requests.filter(a => !a.is_joined && !a.is_own_raid);
			for (let filter of optionRaidRequestFilters) {
				requests = requests.filter(filter);
			}
			for (let sort of optionRaidRequestSorts) {
				requests.sort(sort);
			}

			for (let request of requests)
			{
				if (request.battle_bp > qp.bp) {
					await useRestoreBPAsync(request.battle_bp - qp.bp);
				}

				let supporters = await getSupporterListAsync(request.recommended_element_type);
				for (let filter of optionSupporterFilters) {
					supporters = supporters.filter(filter);
				}
				for (let sort of optionSupporterSorts) {
					supporters.sort(sort);
				}

				let summon_id = supporters[0].summon_info.a_summon_id;

				if (await joinRaidBattleAsync(
					profile.a_player_id,
					request.a_battle_id,
					summon_id,
					profile.selected_party.a_party_id,
					request.quest_type
				)) return;
			}

			console.log("Did not find a suitable raid request. Waiting...");
			await delay(optionWaitBetweenRaidRequestChecks);
		}
	}
}

async function getMyProfileAsync()
{
	let result = await khPlayersApi.getMeNumeric();
	return result.body;
}
async function getQuestInfoAsync()
{
	let result = await khQuestInfoApi.get();
	return result.body;
}
async function getQuestPointsAsync()
{
	let result = await khPlayersApi.getQuestPoints();
	return result.body.quest_points;
}
async function getQuestStateAsync(quest_id, quest_type)
{
	let result = await khQuestsApi.getCurrentState(quest_id, quest_type);
	return result.body;
}
async function getQuestNextStateAsync(quest_id, quest_type)
{
	let result = await khQuestsApi.getNextState(quest_id, quest_type);
	return result.body;
}
async function getRaidRequestListAsync()
{
	let result = await khBattlesApi.getRaidRequestList();
	return result.body.data;
}
async function getPendingResultListAsync()
{
	let result = await khBattlesApi.getUnverifiedList();
	return result.body.data;
}
async function getBattleResultAsync(battle_id, quest_type)
{
	let result = await khBattlesApi.getBattleResult(battle_id, quest_type);
	return result.body;
}
async function getSupporterListAsync(element)
{
	let result = await khSummonsApi.getSupporters(element);
	return result.body.data;
}
async function useRestoreBPAsync(amount)
{
	let result = await khItemsApi.getCure(1, 10);
	if (amount == 5)
	{
		let energyLeaf = result.body.data.find(a => a.name == "Energy Leaf");
		if (energyLeaf)
		{
			await khItemsApi.useItem(energyLeaf.a_item_id, 1);
			return true;
		}
	}
	let energySeed = result.body.data.find(a => a.name == "Energy Seed");
	if (energySeed && energySeed.num >= amount)
	{
		await khItemsApi.useItem(energySeed.a_item_id, amount);
		return true;
	}
	return false;
}
async function joinRaidBattleAsync(player_id, battle_id, summon_id, party_id, quest_type)
{
	let result = await khBattlesApi.joinBattle(battle_id, summon_id, party_id, quest_type);
	if (result.body.cannot_progress_info)
	{
		console.log("Unable to join raid: ", result.body.cannot_progress_info);
		console.log(result.body);
		return false;
	}
	khRouter.navigate2("battle", {
		a_battle_id: battle_id,
		a_player_id: player_id,
		a_quest_id: result.body.a_quest_id,
		is_own_raid: result.body.is_own_raid,
		quest_type: quest_type
	});
	return true;
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

khInjectionAsync();
