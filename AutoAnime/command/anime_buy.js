module.exports = async function (driver, By, until) {
    try {
        let purchaseNeededElements = await driver.findElements(By.xpath('//div[contains(text(), "구매가 필요해요")]'));
        
        if (purchaseNeededElements.length === 0) {
            return { success: false, message: '구매 필요 메시지를 찾을 수 없습니다. (이미 결제된 상태이거나 다른 페이지입니다.)' };
        }

        let buyBtn = await driver.wait(
            until.elementLocated(By.xpath('//button[contains(@class, "sc-dDmCer") and contains(., "구매하기")]')),
            5000
        );
        await driver.executeScript("arguments[0].click();", buyBtn);
        await driver.sleep(1500);

        let membershipUnlimitedBtn = await driver.wait(
            until.elementLocated(By.xpath('//button[contains(@class, "sc-dDmCer") and contains(., "멤버십으로 무제한 보기")]')),
            5000
        );
        await driver.executeScript("arguments[0].click();", membershipUnlimitedBtn);
        await driver.sleep(2000);

        let membershipStartBtn = await driver.wait(
            until.elementLocated(By.xpath('//button[contains(@class, "sc-c7cae446-0") and contains(., "멤버십 시작하기")]')),
            5000
        );
        await driver.executeScript("arguments[0].click();", membershipStartBtn);
        await driver.sleep(1500);

        let membershipModal = await driver.wait(
            until.elementLocated(By.xpath('//h2[contains(@class, "sc-693bc042-3") and contains(., "멤버십 선택")]')),
            5000
        );
        
        if (!membershipModal) {
            return { success: false, message: '멤버십 선택 모달을 찾을 수 없습니다.' };
        }

        let basicMembershipDiv = await driver.wait(
            until.elementLocated(By.xpath('//div[contains(@class, "sc-693bc042-8") and contains(@class, "kVMKmO")]')),
            5000
        );
        await driver.executeScript("arguments[0].click();", basicMembershipDiv);
        await driver.sleep(500);

        let basicStartBtn = await driver.wait(
            until.elementLocated(By.xpath('//button[contains(@class, "sc-693bc042-7") and contains(., "베이직 멤버십 시작하기")]')),
            5000
        );
        await driver.executeScript("arguments[0].click();", basicStartBtn);
        await driver.sleep(2000); 

        let paymentWindow = await driver.wait(
            until.elementLocated(By.xpath('//span[contains(text(), "최종 결제 금액")]')),
            5000
        );
        
        if (!paymentWindow) {
            return { success: false, message: '결제 창이 정상적으로 로드되지 않았습니다.' };
        }

        let agreeCheckbox = await driver.wait(
            until.elementLocated(By.xpath('//span[contains(text(), "정기결제에 동의합니다.")]/preceding-sibling::label | //span[contains(text(), "정기결제에 동의합니다.")]/preceding-sibling::input')),
            5000
        );
        await driver.executeScript("arguments[0].click();", agreeCheckbox);
        await driver.sleep(500);

        let paymentBtn = await driver.wait(
            until.elementLocated(By.xpath('//button[contains(., "결제하기") or contains(., "9,900원")]')),
            5000
        );
        
        let isDisabled = await paymentBtn.getAttribute('disabled');
        if (isDisabled) {
            await driver.sleep(1000);
        }

        await driver.executeScript("arguments[0].click();", paymentBtn);
        await driver.sleep(2000); 

        try {
            let passwordHeader = await driver.wait(
                until.elementLocated(By.xpath('//h1[text()="비밀번호를 입력해주세요."]')),
                5000
            );

            if (passwordHeader) {
                const targetPassword = ['1', '5', '1', '5', '1', '5'];

                for (let num of targetPassword) {
                    let numBtn = await driver.findElement(
                        By.xpath(`//div[contains(@class, "FPaso")]/div[text()="${num}"]`)
                    );
                    await driver.executeScript("arguments[0].click();", numBtn);
                    await driver.sleep(400);
                }
            }
        } catch (pwError) {
            console.log("⚠️ 가상 패스워드 창을 찾지 못했거나 이미 통과되었을 수 있습니다.");
        }
        
        await driver.sleep(3500);

        let errorDialogs = await driver.findElements(By.xpath('//h2[contains(text(), "결제를 하지 못했어요")]'));
        
        if (errorDialogs.length > 0) {
            let errorReason = "알 수 없는 결제 오류";
            try {
                errorReason = await driver.findElement(By.xpath('//div[contains(@class, "feVSeM")]')).getText();
            } catch(e) {}
            console.log(`❌ 결제 실패 원인: ${errorReason}`);

            try {
                let confirmBtn = await driver.findElement(By.xpath('//button[@data-testid="confirm"]'));
                await driver.executeScript("arguments[0].click();", confirmBtn);
            } catch(e) {}
            await driver.sleep(1000);

            return { success: false, message: `결제 실패: ${errorReason}` };
        }

        let successDialogs = await driver.findElements(By.xpath('//button[contains(., "확인") or contains(., "완료") or contains(., "감상하기")]'));
        if (successDialogs.length > 0) {
            await driver.executeScript("arguments[0].click();", successDialogs[0]);
            await driver.sleep(1500);
        }

        return { success: true, message: '간편 결제 정기 구독 신청 완료' };

    } catch (error) {
        console.error('구매 흐름 중 에러:', error.message);
        return { success: false, message: '구매 흐름 중 에러 발생: ' + error.message };
    }
};