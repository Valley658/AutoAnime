const playerStatus = require('./player_status');

module.exports = async function startMonitor(driver, By, actions, message, playStatusMsg, getDriver) {
    const maxCheckTime = 35 * 60 * 1000;
    const startTime = Date.now();
    let recommendSent = false;

    while (Date.now() - startTime < maxCheckTime) {
        if (getDriver() !== driver) return;

        try {
            let bodyEl = await driver.findElement(By.css('body'));
            await actions.move({ origin: bodyEl, x: 5, y: 5 }).perform().catch(() => {});
            await actions.move({ origin: bodyEl, x: 0, y: 0 }).perform().catch(() => {});

            const status = playerStatus.get();
            const isLastEpisode = (status.index === status.totalEpisodes - 1);

            if (!isLastEpisode) {
                let endingSkipBtn = await driver.findElements(By.xpath(
                    '//div[contains(@class, "sc-d7078651-1")]//text()[normalize-space()="엔딩 스킵"]/ancestor::div[1] | //div[contains(@class, "sc-d7078651-1") and normalize-space()="엔딩 스킵"]'
                ));
                if (endingSkipBtn.length > 0) {
                    let nextEpIndex = status.index + 1;
                    if (nextEpIndex < status.totalEpisodes && status.episodeList[nextEpIndex].url) {
                        let nextEpisode = status.episodeList[nextEpIndex];
                        playerStatus.set({ episode: nextEpisode.title, index: nextEpIndex });
                        
                        await playStatusMsg.edit(`엔딩 스킵 감지. 다음 화(${nextEpisode.title})로 이동합니다.`);
                        await driver.get(nextEpisode.url);
                        await driver.sleep(5000);
                        try {
                            let newBody = await driver.findElement(By.css('body'));
                            await newBody.sendKeys('f');
                        } catch (e) {}
                        break;
                    }
                }
            }

            let openingSkipEls = await driver.findElements(By.xpath('//*[self::div or self::span or self::button][not(./*)][normalize-space(text())="오프닝 스킵"]'));
            if (openingSkipEls.length > 0) {
                try {
                    let targetBtn = openingSkipEls[0];
                    
                    await actions.moveToElement(targetBtn).perform();
                    await driver.sleep(200);

                    await actions.click(targetBtn).perform();
                    await driver.sleep(200);
                    
                    await driver.executeScript("arguments[0].click();", targetBtn);
                    
                    await playStatusMsg.edit(`오프닝 스킵 자동 클릭 완료`);
                } catch (e) {
                    console.error("오프닝 스킵 클릭 실패:", e.message);
                }
                await driver.sleep(1000);
                continue;
            }

            let nextEpHeaders = await driver.findElements(By.xpath('//h4[text()="다음 화"]'));
            if (nextEpHeaders.length > 0) {
                let nextEpIndex = status.index + 1;
                if (nextEpIndex < status.totalEpisodes && status.episodeList[nextEpIndex].url) {
                    let nextEpisode = status.episodeList[nextEpIndex];
                    playerStatus.set({ episode: nextEpisode.title, index: nextEpIndex });

                    await playStatusMsg.edit(`다음 화(${nextEpisode.title}) 자동 재생합니다.`);
                    await driver.get(nextEpisode.url);
                    await driver.sleep(5000);
                    try {
                        let newBody = await driver.findElement(By.css('body'));
                        await newBody.sendKeys('f');
                    } catch (e) {}
                    break;
                }
            }

            if (isLastEpisode && !recommendSent) {
                let recommendHeader = await driver.findElements(By.xpath('//h3[contains(text(), "다른 작품도 추천해 드릴게요")]'));
                if (recommendHeader.length > 0) {
                    recommendSent = true;
                    let recommendLinks = await driver.findElements(By.css('a[data-item-id]'));
                    let recommendList = [];

                    for (let r = 0; r < recommendLinks.length; r++) {
                        try {
                            let titleEls = await recommendLinks[r].findElements(By.css('p'));
                            if (titleEls.length === 0) continue;
                            let rTitle = await titleEls[0].getText();
                            let rHref = await recommendLinks[r].getAttribute('href');
                            if (rTitle && rTitle.trim() && rHref) {
                                recommendList.push({ title: rTitle.trim(), href: rHref });
                            }
                        } catch (e) {}
                    }

                    if (recommendList.length > 0) {
                        let recText = `마지막 화 종료. 다른 작품을 추천해 드립니다.\n시청할 작품 번호만 30초 이내에 입력해주세요.\n\n\`\`\`md\n`;
                        recommendList.forEach((r, idx) => { recText += `${idx + 1}. ${r.title}\n`; });
                        recText += `\`\`\``;

                        await message.channel.send(recText);

                        const recFilter = (res) => res.author.id === message.author.id && res.author.id === '1413785830836932690' && /^\d+$/.test(res.content) && Number(res.content) >= 1 && Number(res.content) <= recommendList.length;
                        let recCollected;
                        try {
                            recCollected = await message.channel.awaitMessages({ filter: recFilter, max: 1, time: 30000, errors: ['time'] });
                        } catch (e) {
                            await message.channel.send(`선택 시간이 만료되었습니다.`);
                            break;
                        }

                        let recIndex = Number(recCollected.first().content) - 1;
                        let chosen = recommendList[recIndex];

                        playerStatus.reset();
                        playerStatus.set({ title: chosen.title, episode: '1화 분석 중' });

                        await message.channel.send(`${chosen.title} 로 이동합니다.`);
                        await driver.get(chosen.href);
                        await driver.sleep(5000);
                        try {
                            let newBody = await driver.findElement(By.css('body'));
                            await newBody.sendKeys('f');
                        } catch (e) {}
                        break;
                    }
                }
            }
        } catch (loopError) {
            if (loopError.message.includes("valid session ID") || loopError.message.includes("no such session")) {
                break;
            }
        }
        await driver.sleep(200);
    }
};