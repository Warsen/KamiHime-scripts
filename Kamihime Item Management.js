// ==UserScript==
// @name         Kamihime Item Management
// @namespace    https://github.com/Warsen/KamiHime-scripts
// @version      0.2
// @description  Manages your weapons and eidolons for you.
// @author       Warsen
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Task List
// If the scripts are added to a chrome extension, get options from an existing source.
var optionTasks = [0, 1, 3, 4];
var optionLevelSRWeapons = true;
var optionLevelSREidolons = true;
var optionSkillSRWeapons = false;

var khWeaponsApi;
var khSummonsApi;
var khGachaApi;

// These lists can be cached or invalidated between tasks.
var khWeaponsList = null;
var khEidolonsList = null;

async function khLoadingAsync()
{
	// Waits for the game to finish loading
	while (!has(cc, "director", "_runningScene", "_seekWidgetByName") && !has(kh, "createInstance")) {
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	// Create instances of the various APIs
	khWeaponsApi = kh.createInstance("apiAWeapons");
	khSummonsApi = kh.createInstance("apiASummons");
	khGachaApi = kh.createInstance("apiAGacha");

	let scripts = [
		scriptLevelWeaponsAsync,
		scriptLevelEidolonsAsync,
		scriptSkillWeaponsAsync,
		scriptSkillGrailsAsync,
		scriptSellItemsAsync
	];

	// Wait 3 seconds before performing scripts to avoid errors.
	await new Promise(resolve => setTimeout(resolve, 3000));

	// Execute the defined tasks from the list of scripts.
	for (let index of optionTasks) {
		await scripts[index]();
	}
}

async function scriptLevelWeaponsAsync()
{
	let ssrWeapons = [];
	let srWeapons = [];
	let srMaterials = {};
	let rMaterials = {};
	let nMaterials = {};

	if (!khWeaponsList) {
		khWeaponsList = await getWeaponListAsync();
	}

	for (let weapon of khWeaponsList)
	{
		if (weapon.rare === "SSR" && weapon.level < weapon.max_level && weapon.level > 1)
		{
			ssrWeapons.push(weapon);
		}
		else if (weapon.rare === "SR" && weapon.level < weapon.max_level && weapon.level > 1 && (weapon.is_equipped || weapon.is_locked))
		{
			srWeapons.push(weapon);
		}
		else if (weapon.rare === "SR" && weapon.bonus === 0 && weapon.level === 1 && !weapon.is_equipped && !weapon.is_locked && weapon.attack === 8)
		{
			srMaterials[weapon.weapon_type] = srMaterials[weapon.weapon_type] || [];
			srMaterials[weapon.weapon_type].push(weapon);
		}
		else if (weapon.rare === "R" && weapon.bonus === 0 && weapon.level === 1 && !weapon.is_equipped && !weapon.is_locked && weapon.attack === 8)
		{
			rMaterials[weapon.weapon_type] = rMaterials[weapon.weapon_type] || [];
			rMaterials[weapon.weapon_type].push(weapon);
		}
		else if (weapon.rare === "N" && weapon.bonus === 0 && weapon.level === 1 && !weapon.is_equipped && !weapon.is_locked)
		{
			nMaterials[weapon.weapon_type] = nMaterials[weapon.weapon_type] || [];
			nMaterials[weapon.weapon_type].push(weapon);
		}
	}

	ssrWeapons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
	while (ssrWeapons.length > 0)
	{
		if (nMaterials[ssrWeapons[0].weapon_type] && nMaterials[ssrWeapons[0].weapon_type].length > 0)
		{
			await checkAndLevelFirstWeapon(ssrWeapons, nMaterials[ssrWeapons[0].weapon_type]);
		}
		else if (rMaterials[ssrWeapons[0].weapon_type] && rMaterials[ssrWeapons[0].weapon_type].length > 0)
		{
			await checkAndLevelFirstWeapon(ssrWeapons, rMaterials[ssrWeapons[0].weapon_type]);
		}
		else if (srMaterials[ssrWeapons[0].weapon_type] && srMaterials[ssrWeapons[0].weapon_type].length > 0)
		{
			await checkAndLevelFirstWeapon(ssrWeapons, srMaterials[ssrWeapons[0].weapon_type]);
		}
		else
		{
			ssrWeapons.shift();
		}
	}

	if (optionLevelSRWeapons)
	{
		srWeapons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
		while (srWeapons.length > 0)
		{
			if (nMaterials[srWeapons[0].weapon_type] && nMaterials[srWeapons[0].weapon_type].length > 0)
			{
				await checkAndLevelFirstWeapon(srWeapons, nMaterials[srWeapons[0].weapon_type]);
			}
			else if (rMaterials[srWeapons[0].weapon_type] && rMaterials[srWeapons[0].weapon_type].length > 0)
			{
				await checkAndLevelFirstWeapon(srWeapons, rMaterials[srWeapons[0].weapon_type]);
			}
			else if (srMaterials[srWeapons[0].weapon_type] && srMaterials[srWeapons[0].weapon_type].length > 0)
			{
				await checkAndLevelFirstWeapon(srWeapons, srMaterials[srWeapons[0].weapon_type]);
			}
			else
			{
				srWeapons.shift();
			}
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
	expToMax = Math.floor(expToMax / 2);

	// Determine how much exp can be gained from materials.
	let useCount = 0;
	let useExpGain = 0;
	while (useCount < 20 && useCount < materials.length && useExpGain < expToMax)
	{
		if (materials[useCount].rare === "N")
		{
			useExpGain += (weapons[0].weapon_type === materials[useCount].weapon_type) ? 15 : 10;
			useCount++;
		}
		else if (materials[useCount].rare === "R")
		{
			if (expToMax - useExpGain >= 75)
			{
				useExpGain += (weapons[0].weapon_type === materials[useCount].weapon_type) ? 150 : 100;
				useCount++;
			}
			else
			{
				break;
			}
		}
		else if (materials[useCount].rare === "SR")
		{
			if (expToMax - useExpGain >= 500)
			{
				useExpGain += (weapons[0].weapon_type === materials[useCount].weapon_type) ? 750 : 500;
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

		if (weapons[0].level === weapons[0].max_level) {
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
	let srMaterials = {};
	let rMaterials2 = {};
	let rMaterials1 = {};
	let nMaterials = {};

	if (!khEidolonsList) {
		khEidolonsList = await getEidolonListAsync();
	}

	for (let eidolon of khEidolonsList)
	{
		if (eidolon.rare === "SSR" && eidolon.level < eidolon.max_level && eidolon.level > 1)
		{
			ssrEidolons.push(eidolon);
		}
		else if (eidolon.rare === "SR" && eidolon.level < eidolon.max_level && eidolon.level > 1)
		{
			srEidolons.push(eidolon);
		}
		else if (eidolon.rare === "SR" && eidolon.bonus === 0 && eidolon.level === 1 && !eidolon.is_equipped && !eidolon.is_locked && eidolon.attack === 12)
		{
			srMaterials[eidolon.element_type] = srMaterials[eidolon.element_type] || [];
			srMaterials[eidolon.element_type].push(eidolon);
		}
		else if (eidolon.rare === "R" && eidolon.bonus === 0 && eidolon.level === 1 && !eidolon.is_equipped && !eidolon.is_locked && eidolon.attack === 6)
		{
			rMaterials2[eidolon.element_type] = rMaterials2[eidolon.element_type] || [];
			rMaterials2[eidolon.element_type].push(eidolon);
		}
		else if (eidolon.rare === "R" && eidolon.bonus === 0 && eidolon.level === 1 && !eidolon.is_equipped && !eidolon.is_locked && eidolon.attack > 6)
		{
			rMaterials1[eidolon.element_type] = rMaterials1[eidolon.element_type] || [];
			rMaterials1[eidolon.element_type].push(eidolon);
		}
		else if (eidolon.rare === "N" && eidolon.bonus === 0 && eidolon.level === 1 && !eidolon.is_equipped && !eidolon.is_locked)
		{
			nMaterials[eidolon.element_type] = nMaterials[eidolon.element_type] || [];
			nMaterials[eidolon.element_type].push(eidolon);
		}
	}

	ssrEidolons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
	while (ssrEidolons.length > 0)
	{
		if (nMaterials[ssrEidolons[0].element_type] && nMaterials[ssrEidolons[0].element_type].length > 0)
		{
			await checkAndLevelFirstEidolon(ssrEidolons, nMaterials[ssrEidolons[0].element_type]);
		}
		else if (rMaterials1[ssrEidolons[0].element_type] && rMaterials1[ssrEidolons[0].element_type].length > 0)
		{
			await checkAndLevelFirstEidolon(ssrEidolons, rMaterials1[ssrEidolons[0].element_type]);
		}
		else if (rMaterials2[ssrEidolons[0].element_type] && rMaterials2[ssrEidolons[0].element_type].length > 0)
		{
			await checkAndLevelFirstEidolon(ssrEidolons, rMaterials2[ssrEidolons[0].element_type]);
		}
		else if (srMaterials[ssrEidolons[0].element_type] && srMaterials[ssrEidolons[0].element_type].length > 0)
		{
			await checkAndLevelFirstEidolon(ssrEidolons, srMaterials[ssrEidolons[0].element_type]);
		}
		else
		{
			ssrEidolons.shift();
		}
	}

	if (optionLevelSREidolons)
	{
		srEidolons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
		while (srEidolons.length > 0)
		{
			if (nMaterials[srEidolons[0].element_type] && nMaterials[srEidolons[0].element_type].length > 0)
			{
				await checkAndLevelFirstEidolon(srEidolons, nMaterials[srEidolons[0].element_type]);
			}
			else if (rMaterials1[srEidolons[0].element_type] && rMaterials1[srEidolons[0].element_type].length > 0)
			{
				await checkAndLevelFirstEidolon(srEidolons, rMaterials1[srEidolons[0].element_type]);
			}
			else if (rMaterials2[srEidolons[0].element_type] && rMaterials2[srEidolons[0].element_type].length > 0)
			{
				await checkAndLevelFirstEidolon(srEidolons, rMaterials2[srEidolons[0].element_type]);
			}
			else if (srMaterials[srEidolons[0].element_type] && srMaterials[srEidolons[0].element_type].length > 0)
			{
				await checkAndLevelFirstEidolon(srEidolons, srMaterials[srEidolons[0].element_type]);
			}
			else
			{
				srEidolons.shift();
			}
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
		if (materials[useCount].rare === "N")
		{
			useExpGain += (eidolons[0].element_type === materials[useCount].element_type) ? 15 : 10;
			useCount++;
		}
		else if (materials[useCount].rare === "R" && materials[useCount].attack > 6)
		{
			useExpGain += (eidolons[0].element_type === materials[useCount].element_type) ? 98 : 65;
			useCount++;
		}
		else if (materials[useCount].rare === "R")
		{
			if (expToMax - useExpGain >= 75)
			{
				useExpGain += (eidolons[0].element_type === materials[useCount].element_type) ? 150 : 100;
				useCount++;
			}
			else
			{
				break;
			}
		}
		else if (materials[useCount].rare === "SR")
		{
			if (expToMax - useExpGain >= 500)
			{
				useExpGain += (eidolons[0].element_type === materials[useCount].element_type) ? 750 : 500;
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

		if (eidolons[0].level === eidolons[0].max_level) {
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
}

async function scriptSkillGrailsAsync()
{
	let rGrails = [];
	let srGrails = [];
	let rMaterials = [];

	if (!khWeaponsList) {
		khWeaponsList = await getWeaponListAsync();
	}

	for (let weapon of khWeaponsList)
	{
		if (weapon.rare === "R" && weapon.bonus === 0 && weapon.level < 8 && !weapon.is_equipped && !weapon.is_locked && weapon.name === "Arcane Grail")
		{
			rGrails.push(weapon);
		}
		else if (weapon.rare === "SR" && weapon.bonus === 0 && weapon.level < 15 && !weapon.is_equipped && !weapon.is_locked && weapon.name === "False Grail Yaldabaoth")
		{
			srGrails.push(weapon);
		}
		else if (weapon.rare === "R" && weapon.bonus === 0 && weapon.level === 1 && !weapon.is_equipped && !weapon.is_locked && weapon.attack > 100)
		{
			rMaterials.push(weapon);
		}
	}

	if (rMaterials.length >= 1)
	{
		rGrails.sort((a, b) => b.level - a.level); // Sort by level (descending)
		while (rGrails.length > 0)
		{
			if (rGrails[0].level > 1)
			{
				rGrails[0] = await getWeaponDetailsAsync(rGrails[0]);
				if (rGrails[0].skills[0].level === 2) {
					await enhanceWeaponAsync(rGrails[0], rMaterials.splice(0, 1));
				}
				rGrails.shift();
			}
			else
			{
				if (rMaterials.length >= 2)
				{
					await enhanceWeaponAsync(rGrails[0], rMaterials.splice(0, 1));
					await enhanceWeaponAsync(rGrails[0], rMaterials.splice(0, 1));
					rGrails.shift();
				}
				else
				{
					break;
				}
			}
		}
		while (srGrails.length > 0)
		{
			if (srGrails[0].level > 1)
			{
				srGrails[0] = await getWeaponDetailsAsync(srGrails[0]);
				if (srGrails[0].skills[0].level === 2 && rMaterials.length >= 2) {
					srGrails[0] = await enhanceWeaponAsync(srGrails[0], rMaterials.splice(0, 2));
				}
				if (srGrails[0].skills[0].level === 3 && rMaterials.length >= 3) {
					await enhanceWeaponAsync(srGrails[0], rMaterials.splice(0, 3));
				}
				srGrails.shift();
			}
			else
			{
				if (rMaterials.length >= 6)
				{
					await enhanceWeaponAsync(srGrails[0], rMaterials.splice(0, 1));
					await enhanceWeaponAsync(srGrails[0], rMaterials.splice(0, 2));
					await enhanceWeaponAsync(srGrails[0], rMaterials.splice(0, 3));
					srGrails.shift();
				}
				else
				{
					break;
				}
			}
		}
	}
}

async function scriptSellItemsAsync()
{
	if (!khWeaponsList) {
		khWeaponsList = await getWeaponListAsync();
	}

	let weapons = khWeaponsList.filter(a => a.rare === "N" && a.bonus === 0 && !a.is_equipped && !a.is_locked);
	if (weapons.length > 0) {
		await sellWeaponsAsync(weapons.slice(0, 20));
	}

	if (!khEidolonsList) {
		khEidolonsList = await getEidolonListAsync();
	}

	let eidolons = khEidolonsList.filter(a => a.rare === "N" && a.bonus === 0 && !a.is_equipped && !a.is_locked);
	if (eidolons.length > 0) {
		await sellEidolonsAsync(eidolons.slice(0, 20));
	}
}

async function getWeaponListAsync()
{
	let result = await khWeaponsApi.getList(0, 500);

	console.log(`Found ${result.body.data.length} Weapons`);

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
	khWeaponsList = null; // Invalidate Weapon List

	weapon = result.body.weapon;
	result = result.body.result;
	if (result.gained_exp > 0) {
		console.log(`${weapon.name} Gained ${result.gained_exp} EXP`);
	}
	if (result.before.level < result.after.level) {
		console.log(`${weapon.name} Gained ${result.after.level - result.before.level} Levels (${result.before.level} -> ${result.after.level})`);
	}
	if (result.before.skill_level < result.after.skill_level) {
		console.log(`${weapon.name} Gained 1 Skill Level (${result.before.skill_level} -> ${result.after.skill_level})`);
	}

	return weapon;
}
async function sellWeaponsAsync(weapons)
{
	let result = await khWeaponsApi.sell(weapons.map(a => a.a_weapon_id));
	khWeaponsList = null; // Invalidate Weapon List

	console.log(`Sold ${result.body.weapon_ids.length} Weapons`);
}
async function getEidolonListAsync()
{
	let result = await khSummonsApi.getList(0, 500);

	console.log(`Found ${result.body.data.length} Eidolons`);

	return result.body.data;
}
async function enhanceEidolonAsync(eidolon, materials)
{
	let result = await khSummonsApi.enhance(eidolon.a_summon_id, materials.map(a => a.a_summon_id));
	khEidolonsList = null; // Invalidate Eidolon List

	eidolon = result.body.summon;
	result = result.body.result;
	if (result.gained_exp > 0) {
		console.log(`${eidolon.name} Gained ${result.gained_exp} EXP`);
	}
	if (result.before.level < result.after.level) {
		console.log(`${eidolon.name} Gained ${result.after.level - result.before.level} Levels (${result.before.level} -> ${result.after.level})`);
	}

	return eidolon;
}
async function sellEidolonsAsync(eidolons)
{
	let result = await khSummonsApi.sell(eidolons.map(a => a.a_summon_id));
	khEidolonsList = null; // Invalidate Eidolon List

	console.log(`Sold ${result.body.summon_ids.length} Eidolons`);
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

khLoadingAsync();
