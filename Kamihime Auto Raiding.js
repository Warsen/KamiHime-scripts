// ==UserScript==
// @name         Kamihime Auto Raiding
// @namespace    https://github.com/Warsen/KamiHime-scripts
// @version      0.8
// @description  Automatically joins raid battles for you. See options for details.
// @author       Warsen
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi_acce_detail/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi_acce_detail/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Auto raiding runs when you go to Check Battles/Raid Boss Available
// or shortly after any battle. You can exit the loop at the results
// screens or while waiting to join a raid battle.

// Sets whether the script will wait for BP to regenerate.
// If you set it to false, the script will not wait to regenerate BP and
// will continuously use energy seeds to do raids.
var optionWaitForBPRegeneration = true;

// Sets the amount of BP the script will wait until you have before checking
// for raids. You should set it to the amount of BP the type of raid you want
// will require, but leaving it lower can make the script use a difference
// amount of energy seeds to do raid requests.
var optionWaitForBPRegenerationAmount = 3;

// Filter functions to be used in filtering raid requests.
// Ignores raid requests that do not meet the following conditions.
var optionRaidRequestFilters = [];
optionRaidRequestFilters.push(a => a.enemy_hp / a.enemy_max >= 0.20);
//optionRaidRequestFilters.push(a => (a.enemy_level == 50 && a.participants <= 8) || (a.enemy_level == 70 && a.participants <= 12));
//optionRaidRequestFilters.push(a => a.enemy_level == 50 && a.participants <= 8);
optionRaidRequestFilters.push(a => a.enemy_level == 70 && a.participants <= 12);
//optionRaidRequestFilters.push(a => !a.enemy_name.startsWith("Prison"));

// Sort functions to be used in sorting raid requests.
// The script always picks the first raid after filtering, so you want your
// prefered raid conditions sorted to the front.
var optionRaidRequestSorts = [];
optionRaidRequestSorts.push((a, b) => b.enemy_level - a.enemy_level || b.enemy_hp - a.enemy_hp);
//optionRaidRequestSorts.push((a, b) => b.has_union_member - a.has_union_member);
//optionRaidRequestSorts.push((a, b) => b.help_requested_player_name == "playername");

// Filter functions to be used in filtering helpers.
var optionSupporterFilters = [];
optionSupporterFilters.push(a => !a.summon_info.name.startsWith("Lilim"));

// Sort functions to be used in sorting supporters.
var optionSupporterSorts = [];
optionSupporterSorts.push((a, b) => b.summon_info.level - a.summon_info.level);
optionSupporterSorts.push((a, b) => b.is_friend - a.is_friend);

// Set script to override the element of your party.
var optionOverrideElement = false;
var optionOverrideElementReplacement = 5;
// The chosen element will always be used against phantom/unknown element.
// 0 - Fire
// 1 - Water
// 2 - Wind
// 3 - Thunder
// 4 - Dark
// 5 - Light

// Milliseconds to wait at the item acquisition screen.
// If you want to exit automatic navigation, this gives you extra time to do it.
var optionAdditionalWaitAtAcquisitions = 5000;

// Milliseconds to wait before joining a raid battle.
// If someone makes a help request just moments before you check the raid
// requests list, the script could join their battle so quickly that the
// person sharing the raid would be suspicious. That's why you should wait
// at least 10 seconds after checking the raids list before joining one.
var optionWaitBeforeJoiningRaidBattle = 10000;

// Milliseconds to wait between checks for raid requests.
// The game doesn't normally allow you to refresh when checking for raid requests
// and raids don't disappear very quickly, so please wait at least 20 seconds.
var optionWaitBetweenRaidRequestChecks = 30000;

let khPlayersApi;
let khPartiesApi;
let khBannersApi;
let khQuestInfoApi;
let khQuestsApi;
let khBattlesApi;
let khItemsApi;
let khSummonsApi;
let khRouter;
let khRouterParams;

async function khInjectionAsync()
{
	// Wait for the game to load.
	while (!has(cc, "director", "_runningScene", "seekWidgetByName") || !has(kh, "createInstance")) {
		await delay(500);
	}
	kh.env.sendErrorLog = false;

	// Create instances of the various APIs.
	khPlayersApi = kh.createInstance("apiAPlayers");
	khPartiesApi = kh.createInstance("apiAParties");
	khBannersApi = kh.createInstance("apiABanners");
	khQuestInfoApi = kh.createInstance("apiAQuestInfo");
	khQuestsApi = kh.createInstance("apiAQuests");
	khBattlesApi = kh.createInstance("apiABattles");
	khItemsApi = kh.createInstance("apiAItems");
	khSummonsApi = kh.createInstance("apiASummons");
	khRouter = kh.createInstance("router");

	// Inject our own code into navigation.
	let _navigate = kh.Router.prototype.navigate;
	kh.Router.prototype.navigate = function(destination) {
		_navigate.apply(this, arguments);

		if (destination == "quest/q_006") {
			setTimeout(scriptAutoRaidBattleAsync, 3000);
		}
	};

	// Wait for the game to load more.
	while (!has(cc, "director", "_runningScene", "routerParams")) {
		await delay(100);
	}

	khRouterParams = cc.director._runningScene.routerParams;
	if (khRouterParams.hasOwnProperty("is_own_raid") && khRouterParams.is_own_raid == false)
	{
		console.log("Auto Raiding");
		if (location.hash.startsWith("#!quest/q_006")) // Raid Requests
		{
			setTimeout(scriptAutoRaidBattleAsync, 3000);
		}
		else if (location.hash.startsWith("#!quest/q_003_1")) // Battle Results
		{
			await delay(5000);
			if (location.hash.startsWith("#!quest/q_003_1"))
			{
				khRouter.navigate("quest/q_003_2");
			}
			if (location.hash.startsWith("#!quest/q_003_2"))
			{
				await delay(3000);
				if (optionAdditionalWaitAtAcquisitions)
				{
					await delay(optionAdditionalWaitAtAcquisitions);
				}
				if (location.hash.startsWith("#!quest/q_003_2"))
				{
					khRouter.navigate("quest/q_006");
				}
			}
		}
	}
}

async function scriptAutoRaidBattleAsync()
{
	if (!location.hash.startsWith("#!quest/q_006")) return;

	let isQuestInfoHandled = await scriptHandleQuestInfoAsync();
	if (isQuestInfoHandled)
	{
		let qp = await getQuestPointsAsync();
		while (location.hash.startsWith("#!quest/q_006") && optionWaitForBPRegeneration && qp.bp < optionWaitForBPRegenerationAmount)
		{
			console.log("Waiting", 5, "minutes for BP to be restored... AP:", qp.ap, "BP:", qp.bp);
			await delay(300000);
			qp = await getQuestPointsAsync();
		}

		while (location.hash.startsWith("#!quest/q_006"))
		{
			let requests = await getRaidRequestListAsync();
			requests = requests.filter(a => !a.is_joined && !a.is_own_raid);
			for (let filter of optionRaidRequestFilters) {
				requests = requests.filter(filter);
			}
			for (let sort of optionRaidRequestSorts) {
				requests.sort(sort);
			}

			if (requests.length > 0)
			{
				console.log("Found raid", requests[0].enemy_name, "lv.", requests[0].enemy_level, "requested by", requests[0].help_requested_player_name);
				console.log("Joining raid in", optionWaitBeforeJoiningRaidBattle / 1000, "seconds... Leave to cancel.");
				let taskWaitBeforeJoiningRaidBattle = delay(optionWaitBeforeJoiningRaidBattle);

				let profile = await getMyProfileAsync();
				let partydeck;
				let supporters;
				if (requests[0].recommended_element_type > 5 || optionOverrideElement)
				{
					partydeck = await getPartyDeckForElementAsync(optionOverrideElementReplacement);
					supporters = await getSupporterListAsync(optionOverrideElementReplacement);
				}
				else
				{
					partydeck = await getPartyDeckForElementAsync(requests[0].recommended_element_type);
					supporters = await getSupporterListAsync(requests[0].recommended_element_type);
				}

				await taskWaitBeforeJoiningRaidBattle;
				if (!location.hash.startsWith("#!quest/q_006")) return;

				let isRequestBPHandled = await scriptHandleRequestBPAsync(requests[0].battle_bp, qp);
				if (isRequestBPHandled)
				{
					await joinRaidBattleAsync(
						requests[0].a_battle_id,
						requests[0].a_quest_id,
						requests[0].quest_type,
						profile.a_player_id,
						partydeck.a_party_id,
						supporters[0].summon_info.a_summon_id
					);
				}
			}
			else
			{
				console.log("Did not find a suitable raid request. Waiting", optionWaitBetweenRaidRequestChecks / 1000, "seconds...");
				await delay(optionWaitBetweenRaidRequestChecks);
			}
		}
	}
}
async function scriptHandleQuestInfoAsync()
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

		return false;
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

		return false;
	}

	return true;
}
async function scriptHandleRequestBPAsync(battle_bp, qp)
{
	if (!qp) qp = await getQuestPointsAsync();
	if (qp.bp < battle_bp)
	{
		let isBPRestored = await useRestoreBPAsync(battle_bp - qp.bp);
		if (!isBPRestored)
		{
			console.log("Not enough energy leafs or seeds. Ending script.");
			return false;
		}
	}
	return true;
}

async function getMyProfileAsync()
{
	let result = await khPlayersApi.getMeNumeric();
	return result.body;
}
async function getQuestPointsAsync()
{
	let result = await khPlayersApi.getQuestPoints();
	return result.body.quest_points;
}
async function getPartyDeckListAsync()
{
	let result = await khPartiesApi.getDecks();
	return result.body.decks;
}
async function getPartyDeckForElementAsync(element)
{
	let result = await khPartiesApi.getDecks();
	let list = result.body.decks.filter(a => !a.in_use);
	let deck = list.find(a => a.job.element_type == element);
	if (deck) {
		return deck;
	}
	return list[0];
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
async function getQuestBannersAsync()
{
	let result = await khBannersApi.getQuestBanners();
	return result.body.data;
}
async function getRaidQuestListAsync()
{
	let result = await khQuestsApi.getListRaid();
	let list = [];
	for (let body of result.body.raid_quest_lists) {
		list = list.concat(body.data);
	}
	return list;
}
async function getSpecialQuestListAsync()
{
	let result = await khQuestsApi.getListSpecialQuest();
	return result.body.data;
}
async function getEventQuestListAsync(event_id)
{
	let result = await khQuestsApi.getListEventQuest(event_id);
	return result.body.data;
}
async function getRaidRequestListAsync()
{
	let result = await khBattlesApi.getRaidRequestList();
	return result.body.data;
}
async function getUnionEventDemonBattleListAsync(event_id, difficulty)
{
	let result = await khBattlesApi.getUnionRaidRequestList(event_id, difficulty);
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
	if (element > 5) {
		element = 0;
	}
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
async function useRestoreBPAsync(needed_bp)
{
	let result = await khItemsApi.getCure(1, 10);
	if (needed_bp == 5)
	{
		let energyLeaf = result.body.data.find(a => a.name == "Energy Leaf");
		if (energyLeaf)
		{
			await khItemsApi.useItem(energyLeaf.a_item_id, 1);
			return true;
		}
	}
	let energySeed = result.body.data.find(a => a.name == "Energy Seed");
	if (energySeed && energySeed.num >= needed_bp)
	{
		await khItemsApi.useItem(energySeed.a_item_id, needed_bp);
		return true;
	}
	return false;
}
async function startQuestBattleAsync(quest_id, quest_type, party_id, summon_id)
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
