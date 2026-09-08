const { Client } = require('discord.js-selfbot-v13');
const { Builder, By, Key, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

const client = new Client({
    checkUpdate: false
});

client.on('ready', () => {
    console.log(`셀프봇 로그인 성공: ${client.user.tag}`);
});

let currentDriver = null;
const getDriver = () => currentDriver;
const setDriver = (driverInstance) => { currentDriver = driverInstance; };

const animeSearch = require('./command/anime_search');
const animeBuy = require('./command/anime_buy');
const animeStop = require('./command/anime_stop');
const animeBilling = require('./command/anime_billing');
const animeControl = require('./command/anime_control');

animeSearch(client, Builder, By, until, chrome, animeBuy, getDriver, setDriver);
animeStop(client, getDriver, setDriver); 
animeBilling(client, Builder, By, until, chrome, getDriver);
animeControl(client, getDriver);

client.login(process.env.DISCORD_TOKEN);