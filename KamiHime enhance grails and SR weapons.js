// ==UserScript==
// @name         KamiHime Auto Enhance Grails and SR Weapons
// @namespace    http://tampermonkey.net/
// @version      24.05.2018
// @description  Enhances R grails to skill level 3, SR grails to skill level 4, and SR weapons to skill level 2
// @author       You
// @include      https://cf.r.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @include      https://cf.g.kamihimeproject.dmmgames.com/front/cocos2d-proj/components-pc/mypage_quest_party_guild_enh_evo_gacha_present_shop_epi/app.html*
// @grant        none
// @run-at       document-end
// ==/UserScript==

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
	let fodder = [];
	let srWeapons = [];
	let srGrails = [];
	let rGrails = [];

	console.log("Starting auto foddering script");

	let result = await kh.createInstance("apiAWeapons").getList(0, 500);

	console.log("Found " + result.body.data.length + " weapons");

	result.body.data.forEach(function(item) {
		if (item.rare === "R" && item.bonus === 0 && item.level === 1 && !item.is_equipped && !item.is_locked && item.attack > 100)
		{
			fodder.push(item.a_weapon_id);
		}
		else if (item.rare === "R" && item.bonus === 0 && item.level < 8 && !item.is_equipped && !item.is_locked && item.name === "Arcane Grail")
		{
			rGrails.push(item.a_weapon_id);
		}
		else if (item.rare === "SR" && item.bonus === 0 && item.level < 15 && !item.is_equipped && !item.is_locked && item.name === "False Grail Yaldabaoth")
		{
			srGrails.push(item.a_weapon_id);
		}
		else if (item.rare === "SR" && item.bonus === 0 && item.level === 1 && !item.is_equipped && !item.is_locked && item.attack > 150)
		{
			srWeapons.push(item.a_weapon_id);
		}
	});

	// Reorder these loops to change priority

	while (rGrails.length > 0 && fodder.length >= 2)
	{
		let result = await kh.createInstance("apiAWeapons").get(rGrails.shift());
		checkAndEnhanceWeapon(result.body, fodder);
	}
	while (srGrails.length > 0 && fodder.length >= 6)
	{
		let result = await kh.createInstance("apiAWeapons").get(srGrails.shift());
		checkAndEnhanceWeapon(result.body, fodder);
	}
	while (srWeapons.length > 0 && fodder.length >= 1)
	{
		let result = await kh.createInstance("apiAWeapons").get(srGrails.shift());
		checkAndEnhanceWeapon(result.body, fodder);
	}

	console.log("Completed auto foddering script");
}

async function checkAndEnhanceWeapon(weapon, fodder)
{
	let useWeapons = [];
	let targetSkillLevel = 2;

	if (weapon.name === "Arcane Grail")
	{
		targetSkillLevel = 3;
	}
	else if (weapon.name === "False Grail Yaldabaoth")
	{
		targetSkillLevel = 4;
	}

	while (weapon.skills[0].level < targetSkillLevel)
	{
		if (weapon.name === "Arcane Grail")
		{
			useWeapons.push(fodder.pop());
		}
		else
		{
			for (let i=0; i < weapon.skills[0].level; i++)
			{
				useWeapons.push(fodder.pop());
			}
		}

		let result = await kh.createInstance("apiAWeapons").enhance(weapon.a_weapon_id, useWeapons);

		weapon = result.body.weapon;
		useWeapons = [];
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
