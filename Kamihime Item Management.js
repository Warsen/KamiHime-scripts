// ==UserScript==
// @name         Kamihime Item Management
// @namespace    https://github.com/Warsen/KamiHime-scripts
// @version      0.7
// @description  Manages your weapons and eidolons for you.
// @author       Warsen
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Item management runs when you go to Enhance from My Page.
// Background quick drawing of gachapon starts when you go to Gem Gacha.
// Item management runs every time background quick drawing of gachapon
// gets you full inventory.

// Determine what item management will do and in what order.
var optionTaskList = [2, 0, 1, 4];
// 0 - Level Weapons
// 1 - Level Eidolons
// 2 - Skill Weapons
// 3 - Skill Grails
// 4 - Sell Items

var optionLevelSRWeapons = true;
var optionLevelSREidolons = true;
var optionSkillSRWeapons = false;
var optionSellCherubWeapons = false;
var optionSellREidolons = false;

let khWeaponsApi;
let khSummonsApi;
let khGachaApi;
let khRouter;
let khNavigate;
let scriptInterrupt;
let cacheWeaponsList;
let cacheEidolonsList;

async function khInjectionAsync()
{
	// Wait for the game to finish loading.
	while (!has(cc, "director", "_runningScene", "_seekWidgetByName") || !has(kh, "createInstance")) {
		await delay(1000);
	}

	// Create instances of the various APIs.
	khWeaponsApi = kh.createInstance("apiAWeapons");
	khSummonsApi = kh.createInstance("apiASummons");
	khGachaApi = kh.createInstance("apiAGacha");
	khRouter = kh.createInstance("router");
	scriptInterrupt = true;

	// Inject our own code into navigation.
	let _navigate = kh.Router.prototype.navigate;
	kh.Router.prototype.navigate = function(destination) {
		_navigate.apply(this, arguments);

		if (destination == "gacha/ga_004")
		{
			scriptInterrupt = !scriptInterrupt;
			setTimeout(quickDrawGachaAsync, 3000);
		}
		else if (destination == "enh_evo/enh_001")
		{
			scriptInterrupt = !scriptInterrupt;
			setTimeout(doOptionTasksAsync, 3000);
		}
		else
		{
			scriptInterrupt = true;
		}
	};
	khNavigate = _navigate.bind(khRouter);
}

async function doOptionTasksAsync()
{
	let result = await optionTasksAsync();
	if (result) {
		console.log("Completed all tasks. Ending...");
	}
}

async function optionTasksAsync()
{
	let scripts = [
		scriptLevelWeaponsAsync,
		scriptLevelEidolonsAsync,
		scriptSkillWeaponsAsync,
		scriptSkillGrailsAsync,
		scriptSellItemsAsync
	];

	if (optionTaskList.length == 0) return false;
	for (let index of optionTaskList)
	{
		await scripts[index]();
		if (scriptInterrupt) return false;
	}
	return true;
}

async function quickDrawGachaAsync()
{
	let gachaInfo = await getGachaInfoAsync();

	while (!scriptInterrupt)
	{
		if (gachaInfo.is_max_weapon_or_summon)
		{
			let result = await optionTasksAsync();
			if (result)
			{
				gachaInfo = await getGachaInfoAsync();
				if (!gachaInfo.is_max_weapon_or_summon) {
					continue;
				}
			}
			return;
		}

		if (gachaInfo.groups.length >= 2 && gachaInfo.groups[1].enabled)
		{
			 if (gachaInfo.groups[1].gacha_count != 10)
			 {
				let result = await optionTasksAsync();
				if (result)
				{
					gachaInfo = await getGachaInfoAsync();
					if (gachaInfo.groups[1].gacha_count == 10) {
						continue;
					}
				}
				return;
			 }
			 else
			 {
				await playGachaAsync(gachaInfo.groups[1].gacha_id);
				gachaInfo = await getGachaInfoAsync();
			 }
		}
		else if (gachaInfo.groups.length >= 1 && gachaInfo.groups[0].enabled)
		{
			await playGachaAsync(gachaInfo.groups[0].gacha_id);
			gachaInfo = await getGachaInfoAsync();
		}
		else
		{
			await optionTasksAsync();
			console.log("All gem gacha attempts are used. Ending...");
			return;
		}
	}
}

async function scriptLevelWeaponsAsync()
{
	let ssrWeapons = [];
	let srWeapons = [];
	let materials = [];

	if (!cacheWeaponsList) {
		await getWeaponListAsync();
	}

	for (let weapon of cacheWeaponsList)
	{
		if (weapon.rare == "SSR" && weapon.level > 1 && weapon.level < weapon.max_level)
		{
			ssrWeapons.push(weapon);
		}
		else if (weapon.rare == "SR" && weapon.level > 17 && weapon.level < weapon.max_level && (weapon.is_equipped || weapon.is_locked))
		{
			srWeapons.push(weapon);
		}
		else if ((((weapon.rare == "SR" || weapon.rare == "R") && weapon.attack == 8) || weapon.rare == "N") && weapon.bonus == 0 && weapon.level == 1 && !weapon.is_equipped && !weapon.is_locked)
		{
			materials.push(weapon);
		}
	}

	if (materials.length > 0)
	{
		let ssrWeapons2 = [];
		materials.sort((a, b) => a.rare.localeCompare(b.rare)); // Sort by rarity (ascending)
		ssrWeapons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
		while (!scriptInterrupt && ssrWeapons.length > 0 && materials.length > 0)
		{
			let filtered = spliceByFilter(materials, a => a.weapon_type == ssrWeapons[0].weapon_type)
			if (filtered.length > 0)
			{
				await checkAndLevelFirstWeapon(ssrWeapons, filtered);
				if (filtered.length > 0) {
					materials = materials.concat(filtered);
				}
			}
			else
			{
				ssrWeapons2.push(ssrWeapons.shift());
			}
		}
		materials.sort((a, b) => a.rare.localeCompare(b.rare)); // Sort by rarity (ascending)
		while (!scriptInterrupt && ssrWeapons2.length > 0 && materials.length > 0)
		{
			await checkAndLevelFirstWeapon(ssrWeapons2, materials);
		}
	}

	if (!scriptInterrupt && materials.length > 0 && optionLevelSRWeapons)
	{
		let srWeapons2 = [];
		srWeapons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
		while (!scriptInterrupt && srWeapons.length > 0)
		{
			let filtered = spliceByFilter(materials, a => a.weapon_type == srWeapons[0].weapon_type)
			if (filtered.length > 0)
			{
				await checkAndLevelFirstWeapon(srWeapons, filtered);
				if (filtered.length > 0) {
					materials = materials.concat(filtered);
				}
			}
			else
			{
				srWeapons2.push(srWeapons.shift());
			}
		}
		materials.sort((a, b) => a.rare.localeCompare(b.rare)); // Sort by rarity (ascending)
		while (!scriptInterrupt && srWeapons2.length > 0 && materials.length > 0)
		{
			await checkAndLevelFirstWeapon(srWeapons2, materials);
		}
	}
}

async function checkAndLevelFirstWeapon(weapons, materials)
{
	// Estimate required exp until max level.
	// Needs a leveling chart to be accurate.
	let expToMax = weapons[0].next_exp;
	for (let i = weapons[0].level + 2; i <= weapons[0].max_level; i++)
	{
		if (i <= 50) {
			expToMax += i * 5;
		} else if (i <= 100) {
			expToMax += i * 10;
		} else {
			expToMax += 1000;
		}
	}

	// Half the target exp to allow super success.
	expToMax = Math.ceil(expToMax / 2);

	// Determine how much exp can be gained from materials.
	let useCount = 0;
	let useExpGain = 0;
	while (useCount < 20 && useCount < materials.length && useExpGain < expToMax)
	{
		if (materials[useCount].rare == "N")
		{
			useExpGain += (weapons[0].weapon_type == materials[useCount].weapon_type) ? 15 : 10;
			useCount++;
		}
		else if (materials[useCount].rare == "R")
		{
			if (expToMax - useExpGain >= 75)
			{
				useExpGain += (weapons[0].weapon_type == materials[useCount].weapon_type) ? 150 : 100;
				useCount++;
			}
			else
			{
				break;
			}
		}
		else if (materials[useCount].rare == "SR")
		{
			if (expToMax - useExpGain >= 500)
			{
				useExpGain += (weapons[0].weapon_type == materials[useCount].weapon_type) ? 750 : 500;
				useCount++;
			}
			else
			{
				break;
			}
		}
		else
		{
			break;
		}
	}

	if (useCount > 0)
	{
		weapons[0] = await enhanceWeaponAsync(weapons[0], materials.splice(0, useCount));

		if (weapons[0].level == weapons[0].max_level) {
			weapons.shift();
		} else {
			weapons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
		}
	}
	else
	{
		weapons.shift();
	}
}

async function scriptLevelEidolonsAsync()
{
	let ssrEidolons = [];
	let srEidolons = [];
	let materials = [];

	if (!cacheEidolonsList) {
		await getEidolonListAsync();
	}

	for (let eidolon of cacheEidolonsList)
	{
		if (eidolon.rare == "SSR" && eidolon.level < eidolon.max_level && eidolon.level > 1)
		{
			ssrEidolons.push(eidolon);
		}
		else if (eidolon.rare == "SR" && eidolon.level < eidolon.max_level && eidolon.level > 1)
		{
			srEidolons.push(eidolon);
		}
		else if (((eidolon.rare == "SR" && eidolon.attack == 12) || eidolon.rare == "R" || eidolon.rare == "N") && eidolon.bonus == 0 && eidolon.level == 1 && !eidolon.is_equipped && !eidolon.is_locked)
		{
			materials.push(eidolon);
		}
	}

	if (materials.length > 0)
	{
		let ssrEidolons2 = [];
		materials.sort((a, b) => a.rare.localeCompare(b.rare)); // Sort by rarity (ascending)
		ssrEidolons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
		while (!scriptInterrupt && ssrEidolons.length > 0)
		{
			let filtered = spliceByFilter(materials, a => a.element_type == ssrEidolons[0].element_type);
			if (filtered.length > 0)
			{
				await checkAndLevelFirstEidolon(ssrEidolons, filtered);
				if (filtered.length > 0) {
					materials = materials.concat(filtered);
				}
			}
			else
			{
				ssrEidolons2.push(ssrEidolons.shift());
			}
		}
		materials.sort((a, b) => a.rare.localeCompare(b.rare)); // Sort by rarity (ascending)
		while (!scriptInterrupt && ssrEidolons2.length > 0 && materials.length > 0)
		{
			await checkAndLevelFirstEidolon(ssrEidolons2, materials);
		}
	}

	if (!scriptInterrupt && materials.length > 0 && optionLevelSREidolons)
	{
		let srEidolons2 = [];
		srEidolons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
		while (!scriptInterrupt && srEidolons.length > 0)
		{
			let filtered = spliceByFilter(materials, a => a.element_type == srEidolons[0].element_type);
			if (filtered.length > 0)
			{
				await checkAndLevelFirstEidolon(srEidolons, filtered);
				if (filtered.length > 0) {
					materials = materials.concat(filtered);
				}
			}
			else
			{
				srEidolons2.push(srEidolons.shift());
			}
		}
		materials.sort((a, b) => a.rare.localeCompare(b.rare)); // Sort by rarity (ascending)
		while (!scriptInterrupt && srEidolons2.length > 0 && materials.length > 0)
		{
			await checkAndLevelFirstEidolon(srEidolons2, materials);
		}
	}
}

async function checkAndLevelFirstEidolon(eidolons, materials)
{
	// Estimate required exp until max level.
	// Needs a leveling chart to be more accurate.
	let expToMax = eidolons[0].next_exp;
	for (let i = eidolons[0].level + 2; i <= eidolons[0].max_level; i++)
	{
		if (i <= 50) {
			expToMax += i * 10;
		} else {
			expToMax += i * 15;
		}
	}

	// Half the target exp to allow super success.
	expToMax = Math.floor(expToMax / 2);

	// Determine how much exp can be gained from materials.
	let useCount = 0;
	let useExpGain = 0;
	while (useCount < 20 && useCount < materials.length && useExpGain < expToMax)
	{
		if (materials[useCount].rare == "N")
		{
			useExpGain += (eidolons[0].element_type == materials[useCount].element_type) ? 15 : 10;
			useCount++;
		}
		else if (materials[useCount].rare == "R" && materials[useCount].attack > 6)
		{
			useExpGain += (eidolons[0].element_type == materials[useCount].element_type) ? 98 : 65;
			useCount++;
		}
		else if (materials[useCount].rare == "R")
		{
			if (expToMax - useExpGain >= 75)
			{
				useExpGain += (eidolons[0].element_type == materials[useCount].element_type) ? 150 : 100;
				useCount++;
			}
			else
			{
				break;
			}
		}
		else if (materials[useCount].rare == "SR")
		{
			if (expToMax - useExpGain >= 500)
			{
				useExpGain += (eidolons[0].element_type == materials[useCount].element_type) ? 750 : 500;
				useCount++;
			}
			else
			{
				break;
			}
		}
		else
		{
			break;
		}
	}

	if (useCount > 0)
	{
		eidolons[0] = await enhanceEidolonAsync(eidolons[0], materials.splice(0, useCount));

		if (eidolons[0].level == eidolons[0].max_level) {
			eidolons.shift();
		} else {
			eidolons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
		}
	}
	else
	{
		eidolons.shift();
	}
}

async function scriptSkillWeaponsAsync()
{
	let ssrWeapons = [];
	let srWeapons = [];
	let srMaterials = [];
	let rMaterials = [];
	let srGrails = [];
	let rGrails = [];

	if (!cacheWeaponsList) {
		await getWeaponListAsync();
	}

	for (let weapon of cacheWeaponsList)
	{
		if (weapon.rare == "SSR" && weapon.level > 1)
		{
			ssrWeapons.push(weapon);
		}
		else if (weapon.rare == "SR" && weapon.level > 1 && (weapon.is_equipped || weapon.is_locked))
		{
			srWeapons.push(weapon);
		}
		else if (weapon.rare == "SR" && weapon.bonus == 0 && !weapon.is_equipped && !weapon.is_locked && weapon.level <= 17 && weapon.attack > 150)
		{
			srMaterials.push(weapon);
		}
		else if (weapon.rare == "R" && weapon.bonus == 0 && !weapon.is_equipped && !weapon.is_locked && weapon.level == 1 && weapon.attack > 100)
		{
			rMaterials.push(weapon);
		}
		else if (weapon.rare == "SR" && weapon.bonus == 0 && !weapon.is_equipped && !weapon.is_locked && weapon.name == "False Grail Yaldabaoth")
		{
			srGrails.push(weapon);
		}
		else if (weapon.rare == "R" && weapon.bonus == 0 && !weapon.is_equipped && !weapon.is_locked && weapon.name == "Arcane Grail")
		{
			rGrails.push(weapon);
		}
	}

	if (rMaterials.length >= 2)
	{
		// Get skill information for each weapon and grail.
		console.log("Getting weapon and grail skill information. Please wait...");
		let i = 0;
		while (i < ssrWeapons.length) {
			ssrWeapons[i] = await getWeaponDetailsAsync(ssrWeapons[i]);
			i++;
		}
		ssrWeapons = ssrWeapons.filter(a => a.skills[0].level < 20);
		ssrWeapons.sort((a, b) => a.skills[0].level - b.skills[0].level); // Sort by skill level (ascending)

		if (scriptInterrupt) return;

		// Level is an indicator of whether a weapon or grail can have skill level above 1.
		// So we will descending sort the highest level fodder to the front to be used first.
		srMaterials.sort((a, b) => b.level - a.level); // Sort by level (descending)
		srGrails.sort((a, b) => b.level - a.level); // Sort by level (descending)
		rGrails.sort((a, b) => b.level - a.level); // Sort by level (descending)
		i = 0;
		while (i < srMaterials.length && srMaterials[i].level > 1) {
			srMaterials[i] = await getWeaponDetailsAsync(srMaterials[i]);
			i++;
		}
		i = 0;
		while (i < srGrails.length && srGrails[i].level > 1) {
			srGrails[i] = await getWeaponDetailsAsync(srGrails[i]);
			i++;
		}
		i = 0;
		while (i < rGrails.length && rGrails[i].level > 1) {
			rGrails[i] = await getWeaponDetailsAsync(rGrails[i]);
			i++;
		}

		if (scriptInterrupt) return;

		while (!scriptInterrupt && ssrWeapons.length > 0 && await checkAndSkillFirstWeaponAsync(ssrWeapons, srMaterials, rMaterials, srGrails, rGrails))
		{
			if (ssrWeapons[0].skills[0].level < 20) {
				ssrWeapons.sort((a, b) => a.skills[0].level - b.skills[0].level);
			} else {
				ssrWeapons.shift();
			}
		}
	}

	if (!scriptInterrupt && rMaterials.length >= 2 && optionSkillSRWeapons)
	{
		console.log("Getting SR weapon skill information. Please wait...");
		let i = 0;
		while (i < srWeapons.length) {
			srWeapons[i] = await getWeaponDetailsAsync(srWeapons[i]);
			i++;
		}

		if (scriptInterrupt) return;

		srWeapons = srWeapons.filter(a => a.skills[0].level < 20);
		srWeapons.sort((a, b) => a.skills[0].level - b.skills[0].level); // Sort by skill level (ascending)

		while (!scriptInterrupt && srWeapons.length > 0 && await checkAndSkillFirstWeaponAsync(srWeapons, srMaterials, rMaterials, srGrails, rGrails))
		{
			if (srWeapons[0].skills[0].level < 20) {
				srWeapons.sort((a, b) => a.skills[0].level - b.skills[0].level);
			} else {
				srWeapons.shift();
			}
		}
	}
}

async function checkAndSkillFirstWeaponAsync(weapons, srMaterials, rMaterials, srGrails, rGrails)
{
	let materials = [];
	let requirement = (weapons[0].rare == "SSR") ? weapons[0].skills[0].level * 2 : weapons[0].skills[0].level;

	while (!scriptInterrupt && requirement > 0)
	{
		if (requirement >= 24.5 && await checkAndPrepareFirstGrailAsync(srGrails, rMaterials))
		{
			materials.push(srGrails.shift());
			requirement -= 25;
		}
		else if (requirement >= 13.5 && await checkAndPrepareFirstWeaponAsync(srMaterials, rMaterials, 4))
		{
			materials.push(srMaterials.shift());
			requirement -= 14;
		}
		else if (requirement >= 10.0 && await checkAndPrepareFirstWeaponAsync(srMaterials, rMaterials, 3))
		{
			materials.push(srMaterials.shift());
			requirement -= 10.5;
		}
		else if (requirement >= 5.5 && await checkAndPrepareFirstGrailAsync(rGrails, rMaterials))
		{
			materials.push(rGrails.shift());
			requirement -= 6;
		}
		else if (requirement >= 0.5 && rMaterials.length >= 1)
		{
			materials.push(rMaterials.shift());
			requirement -= 1;
		}
		else
		{
			return false;
		}
	}

	if (scriptInterrupt) return false;

	weapons[0] = await enhanceWeaponAsync(weapons[0], materials);
	return true;
}

async function checkAndPrepareFirstWeaponAsync(weapons, materials, sl)
{
	// Requires skill information to be available for any grails above level 1.
	if (weapons.length >= 1)
	{
		if (sl == 3)
		{
			if (weapons[0].level == 1) {
				if (materials.length >= 3) {
					weapons[0] = await enhanceWeaponAsync(weapons[0], materials.splice(0, 1));
				} else {
					return false;
				}
			}
			if (weapons[0].skills[0].level == 2 && materials.length >= 2) {
				weapons[0] = await enhanceWeaponAsync(weapons[0], materials.splice(0, 2));
			}
			if (weapons[0].skills[0].level == 3) {
				return true;
			}
		}
		else if (sl == 4)
		{
			if (weapons[0].level == 1) {
				if (materials.length >= 6) {
					weapons[0] = await enhanceWeaponAsync(weapons[0], materials.splice(0, 1));
				} else {
					return false;
				}
			}
			if (weapons[0].skills[0].level == 2 && materials.length >= 5) {
				weapons[0] = await enhanceWeaponAsync(weapons[0], materials.splice(0, 2));
			}
			if (weapons[0].skills[0].level == 3 && materials.length >= 3) {
				weapons[0] = await enhanceWeaponAsync(weapons[0], materials.splice(0, 3));
			}
			if (weapons[0].skills[0].level == 4) {
				return true;
			}
		}
	}

	return false;
}

async function checkAndPrepareFirstGrailAsync(grails, materials)
{
	// Requires skill information to be available for any grails above level 1.
	if (grails.length >= 1)
	{
		if (grails[0].rare == "SR")
		{
			if (grails[0].level == 1) {
				if (materials.length >= 10) {
					grails[0] = await enhanceWeaponAsync(grails[0], materials.splice(0, 1));
				} else {
					return false;
				}
			}
			if (grails[0].skills[0].level == 2 && materials.length >= 9) {
				grails[0] = await enhanceWeaponAsync(grails[0], materials.splice(0, 2));
			}
			if (grails[0].skills[0].level == 3 && materials.length >= 7) {
				grails[0] = await enhanceWeaponAsync(grails[0], materials.splice(0, 3));
			}
			if (grails[0].skills[0].level == 4 && materials.length >= 4) {
				grails[0] = await enhanceWeaponAsync(grails[0], materials.splice(0, 4));
			}
			if (grails[0].skills[0].level == 5) {
				return true;
			}
		}
		else if (grails[0].rare == "R")
		{
			if (grails[0].level == 1) {
				if (materials.length >= 2) {
					grails[0] = await enhanceWeaponAsync(grails[0], materials.splice(0, 1));
				} else {
					return false;
				}
			}
			if (grails[0].skills[0].level == 2 && materials.length >= 1) {
				grails[0] = await enhanceWeaponAsync(grails[0], materials.splice(0, 1));
			}
			if (grails[0].skills[0].level == 3) {
				return true;
			}
		}
	}

	return false;
}

async function scriptSkillGrailsAsync()
{
	let rGrails = [];
	let srGrails = [];
	let rMaterials = [];

	if (!cacheWeaponsList) {
		await getWeaponListAsync();
	}

	for (let weapon of cacheWeaponsList)
	{
		if (weapon.rare == "SR" && weapon.bonus == 0 && weapon.level < 15 && !weapon.is_equipped && !weapon.is_locked && weapon.name == "False Grail Yaldabaoth")
		{
			srGrails.push(weapon);
		}
		else if (weapon.rare == "R" && weapon.bonus == 0 && weapon.level < 8 && !weapon.is_equipped && !weapon.is_locked && weapon.name == "Arcane Grail")
		{
			rGrails.push(weapon);
		}
		else if (weapon.rare == "R" && weapon.bonus == 0 && weapon.level == 1 && !weapon.is_equipped && !weapon.is_locked && weapon.attack > 100)
		{
			rMaterials.push(weapon);
		}
	}

	if (rMaterials.length >= 1)
	{
		rGrails.sort((a, b) => b.level - a.level); // Sort by level (descending)

		while (!scriptInterrupt && srGrails.length > 0)
		{
			let result = await checkAndPrepareFirstGrailAsync(srGrails, rMaterials);
			if (result) {
				srGrails.shift();
			} else {
				break;
			}
		}
		while (!scriptInterrupt && rGrails.length > 0)
		{
			let result = await checkAndPrepareFirstGrailAsync(rGrails, rMaterials);
			if (result) {
				rGrails.shift();
			} else {
				break;
			}
		}
	}
}

async function scriptSellItemsAsync()
{
	if (!cacheWeaponsList) {
		await getWeaponListAsync();
	}

	let weapons = cacheWeaponsList.filter(a => a.rare == "N" && a.bonus == 0 && !a.is_equipped && !a.is_locked && a.level == 1);
	if (optionSellCherubWeapons)
	{
		weapons = weapons.concat(cacheWeaponsList.filter(a => a.rare == "R" && a.bonus == 0 && !a.is_equipped && !a.is_locked && a.level == 1 && a.attack == 8));
	}
	while (!scriptInterrupt && weapons.length > 0)
	{
		await sellWeaponsAsync(weapons.splice(0, 20));
	}

	if (!cacheEidolonsList) {
		await getEidolonListAsync();
	}

	let eidolons = cacheEidolonsList.filter(a => a.rare == "N" && a.bonus == 0 && !a.is_equipped && !a.is_locked && a.level == 1);
	if (optionSellREidolons)
	{
		eidolons = eidolons.concat(cacheEidolonsList.filter(a => a.rare == "R" && a.bonus == 0 && !a.is_equipped && !a.is_locked && a.level == 1 && a.attack > 6));
	}
	while (!scriptInterrupt && eidolons.length > 0)
	{
		await sellEidolonsAsync(eidolons.splice(0, 20));
	}
}

async function getGachaInfoAsync()
{
	let result = await khGachaApi.getCategory("normal");
	return result.body;
}
async function playGachaAsync(gacha_id)
{
	let result = await khGachaApi.playGacha("normal", gacha_id);
	cacheWeaponsList = null;
	cacheEidolonsList = null;

	console.log("Obtained", result.body.obtained_info.length, "Gacha Items");

	return result.body;
}
async function getWeaponListAsync()
{
	if (cacheWeaponsList) return cacheWeaponsList;
	let result = await khWeaponsApi.getList(0, 500);
	cacheWeaponsList = result.body.data;
	return result.body.data;
}
async function getWeaponDetailsAsync(weapon)
{
	let result = await khWeaponsApi.get(weapon.a_weapon_id);
	return result.body;
}
async function enhanceWeaponAsync(weapon, materials)
{
	let result = await khWeaponsApi.enhance(weapon.a_weapon_id, materials.map(a => a.a_weapon_id));
	cacheWeaponsList = null;

	weapon = result.body.weapon;
	result = result.body.result;
	if (result.gained_exp > 0) {
		console.log(weapon.name, "Gained", result.gained_exp, "EXP");
	}
	if (result.before.level < result.after.level) {
		console.log(weapon.name, "Gained", result.after.level - result.before.level, "Levels (", result.before.level, "->", result.after.level, ")");
	}
	if (result.before.skill_level < result.after.skill_level) {
		console.log(weapon.name, "Gained 1 Skill Level (", result.before.skill_level, "->", result.after.skill_level, ")");
	}

	return weapon;
}
async function sellWeaponsAsync(weapons)
{
	let result = await khWeaponsApi.sell(weapons.map(a => a.a_weapon_id));
	cacheWeaponsList = null;

	console.log("Sold", result.body.weapon_ids.length, "Weapons");

	return result.body.weapon_ids;
}
async function getEidolonListAsync()
{
	if (cacheEidolonsList) return cacheEidolonsList;
	let result = await khSummonsApi.getList(0, 500);
	cacheEidolonsList = result.body.data;
	return cacheEidolonsList;
}
async function enhanceEidolonAsync(eidolon, materials)
{
	let result = await khSummonsApi.enhance(eidolon.a_summon_id, materials.map(a => a.a_summon_id));
	cacheEidolonsList = null;

	eidolon = result.body.summon;
	result = result.body.result;
	if (result.gained_exp > 0) {
		console.log(eidolon.name, "Gained", result.gained_exp, "EXP");
	}
	if (result.before.level < result.after.level) {
		console.log(eidolon.name, "Gained", result.after.level - result.before.level, "Levels (", result.before.level, "->", result.after.level, ")");
	}

	return eidolon;
}
async function sellEidolonsAsync(eidolons)
{
	let result = await khSummonsApi.sell(eidolons.map(a => a.a_summon_id));
	cacheEidolonsList = null;

	console.log("Sold", result.body.summon_ids.length, "Eidolons");

	return result.body.summon_ids;
}

function delay(duration)
{
	return new Promise(resolve => setTimeout(resolve, duration));
}
function spliceByFilter(arr, func)
{
	arr.sort((a, b) => func(b) - func(a));
	let i = arr.findIndex(a => !func(a));
	if (i < 0) i = arr.length;
	return arr.splice(0, i);
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
