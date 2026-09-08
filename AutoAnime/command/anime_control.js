const playerStatus = require('./player_status');
const fs = require('fs');
const path = require('path');

module.exports = function (client, getDriver) {
    client.on('messageCreate', async (message) => {
        if (message.author.id !== '1413785830836932690') return;
        
        const args = message.content.trim().split(' ');
        const command = args[0];
        const driver = getDriver();

        if (command === '!일시정지') {
            if (!driver) return message.reply('현재 실행 중인 브라우저가 없습니다.');
            try {
                let bodyElement = await driver.findElement({ css: 'body' });
                await bodyElement.sendKeys(' ');
                await message.reply('영상을 일시정지했습니다.');
            } catch (e) {
                await message.reply(`일시정지 처리 실패: ${e.message}`);
            }
        }

        if (command === '!재생') {
            if (!driver) return message.reply('현재 실행 중인 브라우저가 없습니다.');
            try {
                let bodyElement = await driver.findElement({ css: 'body' });
                await bodyElement.sendKeys(' ');
                await message.reply('영상을 다시 재생합니다.');
            } catch (e) {
                await message.reply(`재생 처리 실패: ${e.message}`);
            }
        }

        if (command === '!현재화') {
            const status = playerStatus.get();
            if (!driver || !status.title) {
                return message.reply('현재 재생 중인 애니메이션이 없습니다.');
            }
            await message.reply(`현재 재생 중인 작품: ${status.title} (${status.episode})`);
        }

        if (command === '!새로고침') {
            if (!driver) return message.reply('현재 실행 중인 브라우저가 없습니다.');
            try {
                await driver.navigate().refresh();
                await message.reply('페이지 새로고침을 완료했습니다.');
            } catch (e) {
                await message.reply(`새로고침 처리 실패: ${e.message}`);
            }
        }

        if (command === '!화면체크') {
            if (!driver) return message.reply('현재 실행 중인 브라우저가 없습니다.');
            try {
                const screenshotData = await driver.takeScreenshot();
                const buffer = Buffer.from(screenshotData, 'base64');
                const imgPath = path.join(__dirname, 'current_screen.png');
                fs.writeFileSync(imgPath, buffer);

                await message.channel.send({
                    content: '현재 브라우저 화면입니다.',
                    files: [imgPath]
                });

                fs.unlinkSync(imgPath);
            } catch (e) {
                await message.reply(`화면 캡처 실패: ${e.message}`);
            }
        }

        if (command === '!볼륨') {
            if (!driver) return message.reply('현재 실행 중인 브라우저가 없습니다.');
            const volumeLevel = Number(args[1]);
            if (isNaN(volumeLevel) || volumeLevel < 0 || volumeLevel > 100) {
                return message.reply('사용법: !볼륨 [0~100]');
            }
            try {
                await driver.executeScript(`
                    const video = document.querySelector('video');
                    if (video) {
                        video.volume = ${volumeLevel / 100};
                    }
                `);
                await message.reply(`볼륨을 ${volumeLevel}%로 조정했습니다.`);
            } catch (e) {
                await message.reply(`볼륨 조절 실패: ${e.message}`);
            }
        }

        if (command === '!전체화면') {
            if (!driver) return message.reply('현재 실행 중인 브라우저가 없습니다.');
            try {
                let bodyElement = await driver.findElement({ css: 'body' });
                await bodyElement.sendKeys('f');
                await message.reply('전체화면 모드를 전환했습니다.');
            } catch (e) {
                await message.reply(`전체화면 전환 실패: ${e.message}`);
            }
        }
    });
};