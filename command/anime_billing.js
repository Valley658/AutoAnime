module.exports = function (client, Builder, By, until, chrome, getDriver) {
    client.on('messageCreate', async (message) => {
        if (message.author.id === client.user.id) return;
        if (message.content !== '!결제일') return;

        if (message.author.id !== '1413785830836932690') return;

        const statusMessage = await message.reply('**라프텔 멤버십 결제 예정일을 조회하는 중입니다...**');

        let options = new chrome.Options();
        options.excludeSwitches('enable-automation');

        options.addArguments('--headless=new'); 
        options.addArguments('--window-size=1920,1080');        
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');
        options.addArguments('--disable-gpu');
        options.addArguments('--disable-software-rasterizer');
        options.addArguments('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        options.addArguments('--log-level=3');

        let billingDriver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();

        try {
            await billingDriver.get('https://laftel.net');
            await billingDriver.sleep(1500);

            let loginBtn = await billingDriver.wait(until.elementLocated(By.css('a[data-cy="login-button"]')), 10000);
            await billingDriver.executeScript("arguments[0].click();", loginBtn);
            await billingDriver.sleep(1000);

            let emailStartBtn = await billingDriver.wait(until.elementLocated(By.xpath('//button[.//span[text()="이메일로 시작"]]')), 10000);
            await billingDriver.executeScript("arguments[0].click();", emailStartBtn);

            let emailInput = await billingDriver.wait(until.elementLocated(By.css('input[type="email"]')), 10000);
            await emailInput.sendKeys(process.env.LAFTEL_EMAIL);
            await billingDriver.sleep(1000);

            let nextBtn = await billingDriver.wait(until.elementLocated(By.xpath('//button[text()="다음"]')), 10000);
            await billingDriver.executeScript("arguments[0].click();", nextBtn);

            let passwordInput = await billingDriver.wait(until.elementLocated(By.css('input[type="password"]')), 10000);
            await passwordInput.sendKeys(process.env.LAFTEL_PASSWORD);
            await billingDriver.sleep(1000);

            let loginSubmitBtn = await billingDriver.wait(until.elementLocated(By.xpath('//button[text()="로그인"]')), 10000);
            await billingDriver.executeScript("arguments[0].click();", loginSubmitBtn);

            await billingDriver.wait(until.elementLocated(By.xpath('//h2[text()="사용할 프로필을 선택해주세요."]')), 12000);
            let profileBtn = await billingDriver.wait(until.elementLocated(By.xpath('//img[contains(@src, "profiles/default")]')), 5000);
            await billingDriver.executeScript("arguments[0].click();", profileBtn);
            await billingDriver.sleep(2000);

            await billingDriver.get('https://laftel.net/membership/manage');
            await billingDriver.sleep(3000);

            let dateElement = await billingDriver.wait(
                until.elementLocated(By.xpath('//div[contains(text(), "결제 예정일")]/following-sibling::div//div[contains(@class, "sc-")]')), 
                10000
            );
            
            let billingDate = await dateElement.getText();

            await statusMessage.edit(`다음 라프텔 멤버십 결제 예정일은 **${billingDate.trim()}** 입니다.`);

        } catch (error) {
            console.error('결제일 조회 중 오류 발생:', error);
            if (error.name === 'TimeoutError') {
                await statusMessage.edit('⚠️ 결제 예정일을 찾을 수 없습니다. 현재 멤버십 구독 중이 아니거나 레이아웃이 변경되었을 수 있습니다.');
            } else {
                await statusMessage.edit(`❌ 결제일 확인 중 에러가 발생했습니다: ${error.message}`);
            }
        } finally {
            if (billingDriver) {
                try {
                    await billingDriver.quit();
                } catch (e) {
                    console.log('백그라운드 드라이버 종료 예외 무시:', e.message);
                }
            }
        }
    });
};