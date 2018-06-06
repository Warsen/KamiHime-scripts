// ==UserScript==
// @name         Kamihime Auto Raid Battle
// @namespace    https://github.com/Warsen/KamiHime-scripts
// @version      0.1
// @description  Automatically joins raid battles for you. Wait at the raid listing page.
// @author       Warsen
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Filter functions to be used in filtering raid requests.
var optionRaidRequestFilters = []
optionRaidRequestFilters.push(a => !a.enemy_name.startsWith("Prison"));
optionRaidRequestFilters.push(a => a.enemy_hp / a.enemy_max >= 0.20);
optionRaidRequestFilters.push(a => (a.enemy_level == 50 && a.participants <= 6) || (a.enemy_level == 70 && a.participants <= 12));
//optionRaidRequestFilters.push(a => a.enemy_level == 50 && a.participants <= 6);
//optionRaidRequestFilters.push(a => a.enemy_level == 70 && a.participants <= 12);

// Sort functions to be used in sorting raid requests.
var optionRaidRequestSorts = []
optionRaidRequestSorts.push((a, b) => b.enemy_level - a.enemy_level || b.enemy_hp - a.enemy_hp);

// Filter functions to be used in filtering helpers.
var optionHelperFilters = []
optionHelperFilters.push(a => !a.summon_info.name.startsWith("Lilim"));

// Sort functions to be used in sorting helpers.
var optionHelperSorts = []
optionHelperSorts.push((a, b) => b.summon_info.level - a.summon_info.level);

// Milliseconds to wait at the item acquisition screen.
// If you want to exit automatic navigation, this gives you extra time to do it.
const optionWaitAtAcquisitions = 0;

// Milliseconds to wait between checks for raid requests.
// The game doesn't normally allow you to refresh when checking for raid requests
// and raids don't disappear very quickly, so please wait at least 20 seconds.
const optionWaitBetweenRaidRequestChecks = 20000;

var khPlayersApi;
var khQuestInfoApi;
var khQuestsApi;
var khBattlesApi;
var khItemsApi;
var khWeaponsApi;
var khSummonsApi;
var khGachaApi;
var khRouter;

var interrupt = false;

async function khInjectionAsync()
{
	// Wait for the game to finish loading.
	while (!has(cc, "director", "_runningScene", "_seekWidgetByName") && !has(kh, "createInstance")) {
		await new Promise(resolve => setTimeout(resolve, 1000));
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
	khRouter = kh.createInstance("router");

	// Inject our own code into navigation.
	var _navigate = kh.Router.prototype.navigate;
	kh.Router.prototype.navigate = function(destination) {
		_navigate.apply(this, arguments);

		interrupt = true;

		if (destination == "quest/q_006") {
			setTimeout(scriptAutoRaidBattle, 1000);
		}
	};

	// If at the results screen, go to the raid requests screen.
	if (location.hash.startsWith("#!quest/q_003_1"))
	{
		await new Promise(resolve => setTimeout(resolve, 7000));

		if (location.hash.startsWith("#!quest/q_003_1")) {
			khRouter.navigate("quest/q_003_2");
		}
	}
	if (location.hash.startsWith("#!quest/q_003_2"))
	{
		await new Promise(resolve => setTimeout(resolve, 3000));
		if (optionWaitAtAcquisitions) {
			await new Promise(resolve => setTimeout(resolve, optionWaitAtAcquisitions));
		}

		if (location.hash.startsWith("#!quest/q_003_2")) {
			khRouter.navigate("quest/q_006");
		}
	}
}

async function scriptAutoRaidBattle()
{
	let profile = await getProfileAsync();
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
		khRouter.navigate("battle", {
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

		kh.createInstance("questStateManager").restartQuest(state.a_quest_id, quest.type);
	}
	else
	{
		interrupt = false;
		while (!interrupt)
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
				let qp = await getQuestPointsAsync();
				if (request.battle_bp > qp.bp)
				{
					let needbp = request.battle_bp - qp.bp;
					let cureItems = await getCureItemsAsync();
					let seed = cureItems.find(a => a.name == "Energy Seed");
					await useCureItemsAsync(seed.a_item_id, needbp);
				}

				let supporters = await getSupportersAsync(request.recommended_element_type);
				for (let filter of optionHelperFilters) {
					supporters = supporters.filter(filter);
				}
				for (let sort of optionHelperSorts) {
					supporters.sort(sort);
				}

				let summon_id = supporters[0].summon_info.a_summon_id;

				if (await joinBattleAsync(
					profile.a_player_id,
					request.a_battle_id,
					request.a_quest_id,
					summon_id,
					profile.selected_party.a_party_id,
					request.quest_type
				)) return;
			}

			console.log("Did not find a suitable raid request. Waiting...");
			await new Promise(resolve => setTimeout(resolve, optionWaitBetweenRaidRequestChecks));
		}
	}
}

async function getProfileAsync()
{
	let result = await khPlayersApi.getMeNumeric();
	return result.body;
}
async function getQuestPointsAsync()
{
	let result = await khPlayersApi.getQuestPoints();
	return result.body.quest_points;
}
async function getQuestInfoAsync()
{
	let result = await khQuestInfoApi.get();
	return result.body;
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
async function joinBattleAsync(player_id, battle_id, quest_id, summon_id, party_id, quest_type)
{
	let result = await khBattlesApi.joinBattle(battle_id, summon_id, party_id, quest_type);

	if (result.body.cannot_progress_info)
	{
		console.log(`Unable to join raid: ${result.body.cannot_progress_info}`);
		console.log(result.body);
		return false;
	}

	khRouter.navigate("battle", {
		a_battle_id: battle_id,
		a_player_id: player_id,
		a_quest_id: quest_id,
		is_own_raid: false,
		quest_type: quest_type
	});

	return true;
}
async function getSupportersAsync(elementName)
{
	let result = await khSummonsApi.getSupporters(elementName);
	return result.body.data;
}
async function getCureItemsAsync()
{
	let result = await khItemsApi.getCure(1, 10);
	return result.body.data;
}
async function useCureItemsAsync(item_id, amount)
{
	let result = await khItemsApi.useItem(item_id, amount);
	return result.body;
}

function has(obj)
{
	if (obj !== Object(obj)) return false;

	for (let i = 1; i < arguments.length; i++)
	{
		let prop = arguments[i];
		if ((prop in obj) && obj[prop] !== null && obj[prop] !== 'undefined')
		{
			obj = obj[prop];
		}
		else
		{
			return false;
		}
	}

	return true;
}

khInjectionAsync();
