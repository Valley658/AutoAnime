const playerStatus = require('./player_status');
const startMonitor = require('./player_monitor');

module.exports = function (client, Builder, By, until, chrome, animeBuy, getDriver, setDriver) {
    client.on('messageCreate', async (message) => {
        if (message.author.id === client.user.id) return;
        if (!message.content.startsWith('!애니검색')) return;
        if (message.author.id !== '1413785830836932690') return;

        const args = message.content.split(' ');
        const animeName = args.slice(1).join(' ');

        if (!animeName) {
            return message.reply('검색할 애니이름을 입력해주세요. (예: !애니검색 애니이름)');
        }

        if (getDriver()) {
            try {
                await message.channel.send('이전 애니메이션 재생 페이지를 닫고 새로운 검색을 시작합니다.');
                await getDriver().quit();
            } catch (e) {
                console.log('이전 드라이버 종료 중 예외 발생:', e.message);
            }
            setDriver(null);
            playerStatus.reset();
        }

        const statusMessage = await message.reply(`라프텔에서 '${animeName}' 검색 중...`);

        let options = new chrome.Options();
        options.excludeSwitches('enable-automation');
        options.setLoggingPrefs({ browser: 'SEVERE', driver: 'WARNING' });
        
        options.addArguments(
            '--start-maximized',
            '--start-fullscreen',
            '--window-size=1920,1080', 
            '--no-sandbox', 
            '--disable-dev-shm-usage', 
            '--autoplay-policy=no-user-gesture-required', 
            '--disable-gpu', 
            '--disable-software-rasterizer', 
            '--disable-extensions', 
            '--log-level=3', 
            '--hide-scrollbars'
        );
        
        options.setUserPreferences({ 
            'credentials_enable_service': false, 
            'profile.password_manager_enabled': false, 
            'profile.default_content_setting_values.notifications': 2 
        });

        let driver;
        try {
            driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
            await driver.manage().window().fullscreen(); 
            setDriver(driver);
        } catch (initError) {
            console.error('브라우저 초기화 실패:', initError.message);
            await statusMessage.edit(`크롬 브라우저를 시작하지 못했습니다. 에러: ${initError.message}`);
            return;
        }

        try {
            await driver.get('https://laftel.net');
            await driver.sleep(1500);

            let loginBtn = await driver.wait(until.elementLocated(By.css('a[data-cy="login-button"]')), 10000);
            await driver.wait(until.elementIsVisible(loginBtn), 5000);
            await driver.executeScript("arguments[0].click();", loginBtn);
            await driver.sleep(1000);

            let emailStartBtn = await driver.wait(until.elementLocated(By.xpath('//button[.//span[text()="이메일로 시작"]]')), 10000);
            await driver.wait(until.elementIsVisible(emailStartBtn), 5000);
            await driver.executeScript("arguments[0].click();", emailStartBtn);

            let emailInput = await driver.wait(until.elementLocated(By.css('input[type="email"]')), 10000);
            await driver.wait(until.elementIsVisible(emailInput), 5000);
            await emailInput.sendKeys(process.env.LAFTEL_EMAIL);
            await driver.sleep(1500);

            let nextBtn = await driver.wait(until.elementLocated(By.xpath('//button[text()="다음"]')), 10000);
            await driver.wait(until.elementIsVisible(nextBtn), 5000);
            await driver.executeScript("arguments[0].click();", nextBtn);

            let passwordInput = await driver.wait(until.elementLocated(By.css('input[type="password"]')), 10000);
            await driver.wait(until.elementIsVisible(passwordInput), 5000);
            await passwordInput.sendKeys(process.env.LAFTEL_PASSWORD);
            await driver.sleep(1000);

            let loginSubmitBtn = await driver.wait(until.elementLocated(By.xpath('//button[text()="로그인"]')), 10000);
            await driver.wait(until.elementIsVisible(loginSubmitBtn), 5000);
            await driver.executeScript("arguments[0].click();", loginSubmitBtn);

            let profileHeader = await driver.wait(until.elementLocated(By.xpath('//h2[text()="사용할 프로필을 선택해주세요."]')), 12000);
            await driver.wait(until.elementIsVisible(profileHeader), 5000);
            let profileBtn = await driver.wait(until.elementLocated(By.xpath('//img[contains(@src, "profiles/default")]')), 5000);
            await driver.wait(until.elementIsVisible(profileBtn), 5000);
            await driver.executeScript("arguments[0].click();", profileBtn);

            const searchUrl = `https://laftel.net/search?keyword=${encodeURIComponent(animeName.trim())}`;
            await driver.sleep(1500);
            await driver.get(searchUrl);

            const resultLinks = await driver.wait(until.elementsLocated(By.css('ul[data-cy="search-results"] li a')), 10000);
            if (!resultLinks || resultLinks.length === 0) {
                await statusMessage.edit(`'${animeName}' 검색 결과를 찾을 수 없습니다.`);
                await driver.quit();
                if (getDriver() === driver) setDriver(null);
                return;
            }

            const choices = [];
            const maxChoices = Math.min(resultLinks.length, 20);
            for (let i = 0; i < maxChoices; i++) {
                const link = resultLinks[i];
                const titleEl = await link.findElement(By.css('p'));
                const title = await titleEl.getText();
                choices.push({ link, title });
            }

            let selectedIndex = 0;
            if (choices.length > 1) {
                const exactMatchIndex = choices.findIndex(x => x.title === animeName.trim());
                if (exactMatchIndex !== -1) {
                    selectedIndex = exactMatchIndex;
                } else {
                    let listText = `${animeName} 검색 결과가 여러 개 있습니다. 아래 번호를 입력해주세요.\n\n`;
                    for (let index = 0; index < choices.length; index++) {
                        listText += `${index + 1}. ${choices[index].title}\n`;
                    }
                    listText += `\n(20초 이내에 번호만 입력)`;
                    await statusMessage.edit(listText);

                    const filter = (response) => response.author.id === message.author.id && response.author.id === '1413785830836932690' && /^\d+$/.test(response.content) && Number(response.content) >= 1 && Number(response.content) <= choices.length;
                    let collected;
                    try {
                        collected = await message.channel.awaitMessages({ filter, max: 1, time: 20000, errors: ['time'] });
                    } catch (err) {
                        await statusMessage.edit(`선택 시간이 만료되었습니다. 다시 시도해주세요.`);
                        await driver.quit();
                        if (getDriver() === driver) setDriver(null);
                        return;
                    }
                    selectedIndex = Number(collected.first().content) - 1;
                }
            }

            if (getDriver() !== driver) return;

            const selectedItem = choices[selectedIndex];
            await driver.wait(until.elementIsVisible(selectedItem.link), 5000);
            await driver.executeScript('arguments[0].click();', selectedItem.link);
            await statusMessage.edit(`'${selectedItem.title}' 상세 페이지 및 에피소드 분석 중...`);
            await driver.sleep(3500);

            if (getDriver() !== driver) return;

            let episodeElements = await driver.wait(until.elementsLocated(By.xpath('//a[@data-cy="episode-item"]')), 10000);
            if (episodeElements.length === 0) {
                await statusMessage.edit(`에피소드 목록을 불러오지 못했거나 없는 작품입니다.`);
                await driver.quit();
                if (getDriver() === driver) setDriver(null);
                return;
            }

            let episodeList = [];
            for (let i = 0; i < episodeElements.length; i++) {
                let epTitleEl = await episodeElements[i].findElement(By.xpath('.//h5[contains(@class, "GtgbV") or contains(@class, "sc-")]'));
                let epTitle = await epTitleEl.getText();
                let epUrl = await episodeElements[i].getAttribute('href');
                episodeList.push({ element: episodeElements[i], title: epTitle.trim(), url: epUrl });
            }

            let menuText = `'${selectedItem.title}' 에피소드 목록\n시청할 에피소드의 번호만 20초 이내에 입력해주세요.\n\n\`\`\`md\n`;
            episodeList.forEach((ep, idx) => { menuText += `${idx + 1}. ${ep.title}\n`; });
            menuText += `\`\`\``;

            await statusMessage.delete().catch(() => {});
            const embedMessage = await message.reply({ content: menuText });

            const epFilter = (response) => response.author.id === message.author.id && response.author.id === '1413785830836932690' && /^\d+$/.test(response.content) && Number(response.content) >= 1 && Number(response.content) <= episodeList.length;
            let epCollected;
            try {
                epCollected = await message.channel.awaitMessages({ filter: epFilter, max: 1, time: 20000, errors: ['time'] });
            } catch (err) {
                await embedMessage.edit({ content: `에피소드 선택 시간이 만료되었습니다.` });
                await driver.quit();
                if (getDriver() === driver) setDriver(null);
                return;
            }

            let chosenEpIndex = Number(epCollected.first().content) - 1;
            let targetEpisodeData = episodeList[chosenEpIndex];

            let hasPurchaseBadge = await targetEpisodeData.element.findElements(By.xpath('.//*[contains(text(), "에피소드 구매")]'));
            if (hasPurchaseBadge.length > 0) {
                await message.reply(`선택하신 '${targetEpisodeData.title}'은 개별 구매 전용 에피소드이므로 재생할 수 없습니다.`);
                await driver.quit();
                if (getDriver() === driver) setDriver(null);
                return;
            }

            const playStatusMsg = await message.reply(`'${targetEpisodeData.title}' 재생을 시작합니다.`);

            await driver.wait(until.elementIsVisible(targetEpisodeData.element), 5000);
            await driver.executeScript("arguments[0].click();", targetEpisodeData.element);
            await driver.sleep(4000);

            if (getDriver() !== driver) return;

            let purchaseNeededElements = await driver.findElements(By.xpath('//div[contains(text(), "구매가 필요해요")]'));
            if (purchaseNeededElements.length > 0) {
                await playStatusMsg.edit(`멤버십 결제가 필요합니다. 결제 로직을 실행합니다.`);
                const buyResult = await animeBuy(driver, By, until);
                if (getDriver() !== driver) return;
                
                if (buyResult.success) {
                    await playStatusMsg.edit(`멤버십 결제 완료. 영상을 다시 불러옵니다.`);
                    await driver.navigate().refresh();
                    await driver.sleep(3000);
                    let retryEpElements = await driver.findElements(By.xpath('//a[@data-cy="episode-item"]'));
                    if (retryEpElements[chosenEpIndex]) {
                        await driver.wait(until.elementIsVisible(retryEpElements[chosenEpIndex]), 5000);
                        await driver.executeScript("arguments[0].click();", retryEpElements[chosenEpIndex]);
                        await driver.sleep(3000);
                    }
                } else {
                    await playStatusMsg.edit(`멤버십 구매 중 오류: ${buyResult.message}`);
                    await driver.quit();
                    if (getDriver() === driver) setDriver(null);
                    return;
                }
            }

            playerStatus.set({
                title: selectedItem.title,
                episode: targetEpisodeData.title,
                index: chosenEpIndex,
                totalEpisodes: episodeList.length,
                episodeList: episodeList
            });

            await playStatusMsg.edit(`라프텔에서 '${targetEpisodeData.title}' 재생 성공. 플레이어 세팅 중...`);
            await driver.sleep(2000);

            if (getDriver() !== driver) return;

            try {
                let bodyElement = await driver.findElement(By.css('body'));
                await bodyElement.sendKeys('f');
                await driver.sleep(1000);
                let fullscreenBtn = await driver.findElements(By.xpath('//button[.//use[contains(@href, "fullscreen")]] | //svg[contains(@class, "fullscreen")]/ancestor::button'));
                if (fullscreenBtn.length > 0) {
                    await driver.wait(until.elementIsVisible(fullscreenBtn[0]), 5000);
                    await driver.executeScript("arguments[0].click();", fullscreenBtn[0]);
                }
                await driver.executeScript(`
                    const style = document.createElement('style');
                    style.innerHTML = '* { cursor: none !important; }';
                    document.head.appendChild(style);
                    document.head.appendChild(style);
                `);
                await playStatusMsg.edit(`비디오 플레이어 감시 시작 (마우스 강제 활성화 및 초정밀 스킵 모드)`);
            } catch (fError) {
                console.error("전체화면 제어 실패:", fError.message);
            }

            const actions = driver.actions({ async: true });
            startMonitor(driver, By, actions, message, playStatusMsg, getDriver);

        } catch (error) {
            console.error(error);
            await message.reply(`자동화 처리 중 에러 발생: ${error.message}`);
            if (driver) {
                try { await driver.quit(); } catch (e) {}
            }
            if (getDriver() === driver) setDriver(null);
            playerStatus.reset();
        }
    });
};