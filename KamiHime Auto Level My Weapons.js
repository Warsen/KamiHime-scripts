// ==UserScript==
// @name         KamiHime Auto Level My Weapons
// @namespace    https://github.com/Warsen/KamiHime-scripts
// @version      0.1
// @description  Uses skill-less weapon fodder to level up your weapons.
// @author       Warsen
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// This script finds your lowest level SSRs, then levels them using your lowest rarity fodder of the same type.
// Repeats until you are out of fodder or your SSRs are at max level, then it does the same for your SR weapons.

async function khLoadingAsync()
{
	// Wait for the game to finish loading
	while (!has(cc, "director", "_runningScene", "_seekWidgetByName") && !has(kh, "createInstance"))
	{
		await new Promise(resolve => setTimeout(resolve, 1000));
	}

	await getWeaponInfo();
}

async function getWeaponInfo()
{
	let ssrWeapons = [];
	let srWeapons = [];
	let srFodder = {};
	let rFodder = {};
	let nFodder = {};

	console.log("Starting auto leveling script");

	let result = await kh.createInstance("apiAWeapons").getList(0, 500);

	console.log("Found " + result.body.data.length + " weapons");

	result.body.data.forEach(function(weapon) {
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
			srFodder[weapon.weapon_type] = srFodder[weapon.weapon_type] || [];
			srFodder[weapon.weapon_type].push(weapon);
		}
		else if (weapon.rare === "R" && weapon.bonus === 0 && weapon.level === 1 && !weapon.is_equipped && !weapon.is_locked && weapon.attack === 8)
		{
			rFodder[weapon.weapon_type] = rFodder[weapon.weapon_type] || [];
			rFodder[weapon.weapon_type].push(weapon);
		}
		else if (weapon.rare === "N" && weapon.bonus === 0 && weapon.level === 1 && !weapon.is_equipped && !weapon.is_locked)
		{
			nFodder[weapon.weapon_type] = nFodder[weapon.weapon_type] || [];
			nFodder[weapon.weapon_type].push(weapon);
		}
	});

	ssrWeapons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
	while (ssrWeapons.length > 0)
	{
		if (nFodder[ssrWeapons[0].weapon_type] && nFodder[ssrWeapons[0].weapon_type].length > 0)
		{
			await checkAndEnhanceWeapon(ssrWeapons, nFodder[ssrWeapons[0].weapon_type]);
		}
		else if (rFodder[ssrWeapons[0].weapon_type] && rFodder[ssrWeapons[0].weapon_type].length > 0)
		{
			await checkAndEnhanceWeapon(ssrWeapons, rFodder[ssrWeapons[0].weapon_type]);
		}
		else if (srFodder[ssrWeapons[0].weapon_type] && srFodder[ssrWeapons[0].weapon_type].length > 0)
		{
			await checkAndEnhanceWeapon(ssrWeapons, srFodder[ssrWeapons[0].weapon_type]);
		}
		else
		{
			ssrWeapons.shift();
		}
	}

	srWeapons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
	while (srWeapons.length > 0)
	{
		if (nFodder[srWeapons[0].weapon_type] && nFodder[srWeapons[0].weapon_type].length > 0)
		{
			await checkAndEnhanceWeapon(srWeapons, nFodder[srWeapons[0].weapon_type]);
		}
		else if (rFodder[srWeapons[0].weapon_type] && rFodder[srWeapons[0].weapon_type].length > 0)
		{
			await checkAndEnhanceWeapon(srWeapons, rFodder[srWeapons[0].weapon_type]);
		}
		else if (srFodder[srWeapons[0].weapon_type] && srFodder[srWeapons[0].weapon_type].length > 0)
		{
			await checkAndEnhanceWeapon(srWeapons, srFodder[srWeapons[0].weapon_type]);
		}
		else
		{
			srWeapons.shift();
		}
	}

	console.log("Completed auto foddering script");
}

async function checkAndEnhanceWeapon(weapons, fodder)
{
	let useWeapons = [];
	let fodderExp = 750;
	let targetExp = weapons[0].next_exp;

	if (fodder[0].rare === "R")
	{
		fodderExp = 150;
	}
	else if (fodder[0].rare === "N")
	{
		fodderExp = 15;
	}

	// Increase target exp by estimate for remaining levels
	for (let i = weapons[0].level + 1; i < weapons[0].max_level; i++)
	{
		if (i < 100)
		{
			targetExp += i * 10;
		}
		else
		{
			targetExp += 1000;
		}
	}

	// Half the target exp to allow super success.
	targetExp = Math.floor(targetExp / 2);

	// Move fodder into weapons to be used.
	while (useWeapons.length < 20 && useWeapons.length * fodderExp < targetExp && fodder.length > 0)
	{
		if ((useWeapons.length + 1) * fodderExp < 2 * targetExp)
		{
			useWeapons.push(fodder.pop().a_weapon_id);
		}
		else
		{
			break;
		}
	}

	if (useWeapons.length > 0)
	{
		console.log("About to enhance weapon: " + weapons[0].name + " (level: " + weapons[0].level + ", max_level: " + weapons[0].max_level + ")");
		console.log("Target Exp: " + targetExp + ", Fodder Exp: " + (useWeapons.length * fodderExp));
		console.log(useWeapons);

		let result = await kh.createInstance("apiAWeapons").enhance(weapons[0].a_weapon_id, useWeapons);

		console.log(result.body);

		weapons[0] = result.body.weapon;

		if (weapons[0].level === weapons[0].max_level)
		{
			console.log("Weapon has reached max level. Removing.");
			weapons.shift();
		}
		else
		{
			weapons.sort((a, b) => a.level - b.level); // Sort by level (ascending)
		}
	}
	else
	{
		console.log("Decided to skip weapon: " + weapons[0].name + " (level: " + weapons[0].level + ", max_level: " + weapons[0].max_level + ")");
		console.log("Target Exp: " + targetExp + ", Fodder Exp: " + fodderExp);
		weapons.shift();
	}
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
