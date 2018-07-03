// ==UserScript==
// @name         Kamihime Auto Questing
// @namespace    https://github.com/Warsen/KamiHime-scripts
// @version      0.1
// @description  Automatically starts quests for you. See options for details.
// @author       Warsen
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi_acce_detail/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi_acce_detail/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Auto questing runs when you go to SP Quests or shortly after any battle.
// You can exit the loop at the results screens.
// NOTE: Do to a bug, it may not work the first time you navigate.

// Sets the script to repeat the last quest you have done rather than
// attempting to start its own quests from filters.
var optionSameQuestAfterQuest = true;

// Sets if the raid event list will be checked instead of special quests.
var optionQuestIsRaidEventQuest = false;

// Filter functions to be used in filtering quests.
// Ignores quests that do not meet the following conditions.
var optionQuestFilters = []
optionQuestFilters.push(a => a.title == "Gem Quest Expert");
//optionQuestFilters.push(a => a.type == "event" && a.quest_ap == 30);

// Sort functions to be used in sorting quests.
var optionQuestSorts = []

// Filter functions to be used in filtering helpers.
var optionSupporterFilters = []
optionSupporterFilters.push(a => !a.summon_info.name.startsWith("Lilim"));

// Sort functions to be used in sorting supporters.
var optionSupporterSorts = []
optionSupporterSorts.push((a, b) => b.summon_info.level - a.summon_info.level);
optionSupporterSorts.push((a, b) => b.is_friend - a.is_friend);

// Milliseconds to wait at the item acquisition screen.
// If you want to exit automatic navigation, this gives you extra time to do it.
var optionAdditionalWaitAtAcquisitions = 5000;

let khRouterParams;
let khBannersApi;
let khPlayersApi;
let khQuestInfoApi;
let khQuestsApi;
let khBattlesApi;
let khEventsApi;
let khItemsApi;
let khSummonsApi;
let khRouter;
let scriptInterrupt;

async function khInjectionAsync()
{
	// Wait for the game to load.
	while (!has(cc, "director", "_runningScene", "_seekWidgetByName") || !has(kh, "createInstance")) {
		await delay(500);
	}
	kh.env.sendErrorLog = false;

	// Create instances of the various APIs.
	khPlayersApi = kh.createInstance("apiAPlayers");
	khBannersApi = kh.createInstance("apiABanners");
	khQuestInfoApi = kh.createInstance("apiAQuestInfo");
	khQuestsApi = kh.createInstance("apiAQuests");
	khBattlesApi = kh.createInstance("apiABattles");
	khEventsApi = kh.createInstance("apiEvents");
	khItemsApi = kh.createInstance("apiAItems");
	khSummonsApi = kh.createInstance("apiASummons");
	khRouter = kh.createInstance("router");
	console.log(kh);

	if (!optionSameQuestAfterQuest)
	{
		// Inject our own code into navigation.
		let _navigate = kh.Router.prototype.navigate;
		kh.Router.prototype.navigate = function(destination) {
			_navigate.apply(this, arguments);
			console.log(destination);

			if (destination == "quest/q_004")
			{
				setTimeout(scriptAutoStartQuestAsync, 5000);
			}
			else
			{
				scriptInterrupt = true;
			}
		};
	}

	// Wait for the game to load more.
	while (!has(cc, "director", "_runningScene", "routerParams")) {
		await delay(100);
	}
	khRouterParams = cc.director._runningScene.routerParams;

	if (location.hash.startsWith("#!quest/q_003_1")) // Battle Results
	{
		await delay(5000);
		if (location.hash.startsWith("#!quest/q_003_1")) {
			khRouter.navigate("quest/q_003_2");
		}
		if (location.hash.startsWith("#!quest/q_003_2"))
		{
			await delay(3000);
			if (optionAdditionalWaitAtAcquisitions) {
				await delay(optionAdditionalWaitAtAcquisitions);
			}
			if (location.hash.startsWith("#!quest/q_003_2")) {
				if (optionSameQuestAfterQuest) {
					setTimeout(scriptAutoStartSameQuestAsync, 0);
				}
				else {
					setTimeout(scriptAutoStartQuestAsync, 0);
				}
			}
		}
	}
}

async function scriptAutoStartQuestAsync()
{
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
		let raid = questInfo.in_progress.own_raid;

		console.log("Rejoining Raid", raid.a_quest_id, raid.title);
		khRouter.navigate("battle", {
			a_battle_id: raid.a_battle_id,
			a_quest_id: raid.a_quest_id,
			quest_type: "raid",
			is_own_raid: true,
		});
	}
	else if (questInfo.in_progress.own_quest)
	{
		let quest = questInfo.in_progress.own_quest;
		let state = await getQuestStateAsync(quest.a_quest_id, quest.type);
		while (state.next_info.next_kind == "talk" || state.next_info.next_kind == "harem-story") {
			state = await getQuestNextStateAsync(state.a_quest_id, quest.type);
		}

		console.log("Rejoining Quest", quest.a_quest_id, quest.title);
		khRouter.navigate("battle", {
			a_battle_id: state.next_info.id,
			a_quest_id: quest.a_quest_id,
			quest_type: quest.type,
		});
	}
	else
	{
		let quests;
		if (optionQuestIsRaidEventQuest)
		{
			let banners = await getQuestBannersAsync();
			let raidEventBanner = banners.find(a => a.event_type == "raid_event");
			if (raidEventBanner)
			{
				quests = await getRaidEventQuestListAsync(raidEventBanner.event_id);
				quests = quests.filter(a => !a.required_item.hasOwnProperty("possession_amount") || a.required_item.possession_amount >= a.required_item.amount);
			}
		}
		if (!quests)
		{
			quests = await getSpecialQuestListAsync();
			quests = quests.filter(a => !a.limit_info.hasOwnProperty("remaining_challenge_count") || a.limit_info.remaining_challenge_count > 0);
		}
		for (let filter of optionQuestFilters) {
			quests = quests.filter(filter);
		}
		for (let sort of optionQuestSorts) {
			quests.sort(sort);
		}

		if (quests.length > 0)
		{
			console.log("Found quest", quests[0].title, quests[0].quest_ap, "AP");

			let qp = await getQuestPointsAsync();
			if (quests[0].quest_ap > qp.ap)
			{
				let isApRestored = await useRestoreAPAsync(quests[0].quest_ap - qp.ap, qp.max_ap);
				if (!isApRestored)
				{
					console.log("Not enough half elixirs. Ending...");
					return;
				}
			}

			let supporters = await getSupporterListAsync(quests[0].episodes[0].recommended_element_type);
			for (let filter of optionSupporterFilters) {
				supporters = supporters.filter(filter);
			}
			for (let sort of optionSupporterSorts) {
				supporters.sort(sort);
			}

			let profile = await getMyProfileAsync();

			await startQuestAsync(
				quests[0].a_quest_id,
				quests[0].type,
				profile.selected_party.a_party_id,
				supporters[0].summon_info.a_summon_id,
			);
		}
		else
		{
			console.log("Quest not found.");
		}
	}
}
async function scriptAutoStartSameQuestAsync()
{
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
		let raid = questInfo.in_progress.own_raid;

		console.log("Rejoining Raid", raid.a_quest_id, raid.title);
		khRouter.navigate("battle", {
			a_battle_id: raid.a_battle_id,
			a_quest_id: raid.a_quest_id,
			quest_type: "raid",
			is_own_raid: true,
		});
	}
	else if (questInfo.in_progress.own_quest)
	{
		let quest = questInfo.in_progress.own_quest;
		let state = await getQuestStateAsync(quest.a_quest_id, quest.type);
		while (state.next_info.next_kind == "talk" || state.next_info.next_kind == "harem-story") {
			state = await getQuestNextStateAsync(state.a_quest_id, quest.type);
		}

		console.log("Rejoining Quest", quest.a_quest_id, quest.title);
		khRouter.navigate("battle", {
			a_battle_id: state.next_info.id,
			a_quest_id: quest.a_quest_id,
			quest_type: quest.type,
		});
	}
	else
	{
		let quest;
		if (khRouterParams.quest_type == "daily" || khRouterParams.quest_type == "guerrilla" || khRouterParams.quest_type == "accessory")
		{
			let quests = await getSpecialQuestListAsync();
			quests = quests.filter(a => !a.limit_info.hasOwnProperty("remaining_challenge_count") || a.limit_info.remaining_challenge_count > 0);
			quest = quests.find(a => a.a_quest_id == khRouterParams.a_quest_id);
		}
		else if (khRouterParams.quest_type == "event_raid")
		{
			let quests = await getRaidEventQuestListAsync(khRouterParams.ra_001.event_id);
			quests = quests.filter(a => !a.required_item.hasOwnProperty("possession_amount") || a.required_item.possession_amount >= a.required_item.amount);
			quest = quests.find(a => a.a_quest_id == khRouterParams.a_quest_id);
		}

		if (quest)
		{
			console.log("Found same quest", quest.title, quest.quest_ap, "AP");

			let qp = await getQuestPointsAsync();
			if (quest.quest_ap > qp.ap)
			{
				let isApRestored = await useRestoreAPAsync(quest.quest_ap - qp.ap, qp.max_ap);
				if (!isApRestored)
				{
					console.log("Not enough half elixirs. Ending...");
					return;
				}
			}

			let supporters = await getSupporterListAsync(quest.episodes[0].recommended_element_type);
			for (let filter of optionSupporterFilters) {
				supporters = supporters.filter(filter);
			}
			for (let sort of optionSupporterSorts) {
				supporters.sort(sort);
			}

			let profile = await getMyProfileAsync();

			await startQuestAsync(
				quest.a_quest_id,
				quest.type,
				profile.selected_party.a_party_id,
				supporters[0].summon_info.a_summon_id,
			);
		}
		else
		{
			console.log("Same quest not found.");
			console.log(khRouterParams);
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
async function getQuestBannersAsync()
{
	let result = await khBannersApi.getQuestBanners();
	return result.body.data;
}
async function getSpecialQuestListAsync()
{
	let result = await khQuestsApi.getListSpecialQuest();
	return result.body.data;
}
async function getRaidEventQuestListAsync(event_id)
{
	let result = await khQuestsApi.getListEventQuest(event_id);
	return result.body.data;
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
async function useRestoreAPAsync(needed_ap, max_ap)
{
	let result = await khItemsApi.getCure(1, 10);
	let halfElixir = result.body.data.find(a => a.name == "Half Elixir");
	let halfMaxAP = Math.ceil(max_ap / 2);
	if (halfElixir && halfElixir.num >= 2 && halfMaxAP < needed_ap)
	{
		await khItemsApi.useItem(halfElixir.a_item_id, 2);
		return true;
	}
	else if (halfElixir && halfElixir.num >= 1 && halfMaxAP >= needed_ap)
	{
		await khItemsApi.useItem(halfElixir.a_item_id, 1);
		return true;
	}
	return false;
}
async function useRestoreBPAsync(needed_ap)
{
	let result = await khItemsApi.getCure(1, 10);
	if (needed_ap == 5)
	{
		let energyLeaf = result.body.data.find(a => a.name == "Energy Leaf");
		if (energyLeaf)
		{
			await khItemsApi.useItem(energyLeaf.a_item_id, 1);
			return true;
		}
	}
	let energySeed = result.body.data.find(a => a.name == "Energy Seed");
	if (energySeed && energySeed.num >= needed_ap)
	{
		await khItemsApi.useItem(energySeed.a_item_id, needed_ap);
		return true;
	}
	return false;
}
async function startQuestAsync(quest_id, quest_type, party_id, summon_id)
{
	let result = await khQuestsApi.startQuest(quest_id, quest_type, party_id, summon_id);
	if (result.body.cannot_progress_info)
	{
		console.log("Unable to start quest:", result.body.cannot_progress_info.data.reason);
		console.log(result.body);
		return false;
	}
	let state = result.body;
	while (state.next_info.next_kind == "talk" || state.next_info.next_kind == "harem-story") {
		state = await getQuestNextStateAsync(quest_id, quest_type);
	}
	if (state.next_info.next_kind == "battle")
	{
		khRouter.navigate("battle", {
			a_battle_id: state.next_info.id,
			a_quest_id: quest_id,
			quest_type: quest_type,
		});
		return true;
	}
	return false;
}
async function joinRaidBattleAsync(battle_id, quest_id, quest_type, player_id, party_id, summon_id)
{
	let result = await khBattlesApi.joinBattle(battle_id, summon_id, party_id, quest_type);
	if (result.body.cannot_progress_info)
	{
		console.log("Unable to join raid:", result.body.cannot_progress_info.data.reason);
		console.log(result.body);
		return false;
	}
	khRouter.navigate("battle", {
		a_battle_id: battle_id,
		a_player_id: player_id,
		a_quest_id: quest_id,
		is_own_raid: result.body.is_own_raid,
		quest_type: quest_type,
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
