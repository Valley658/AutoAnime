module.exports = function (client, getDriver, setDriver) {
    client.on('messageCreate', async (message) => {
        if (message.author.id === client.user.id) return;
        if (message.content !== '!정지') return;
        if (message.author.id !== '1413785830836932690') return;

        const driver = getDriver();

        if (!driver) {
            return message.reply('현재 실행 중이거나 재생 중인 애니브라우저가 없습니다.');
        }

        const statusMessage = await message.reply('애니브라우저를 종료하는 중...');

        try {
            setDriver(null); 

            await driver.quit();
            await statusMessage.edit('애니재생이 중단되었으며 브라우저가 안전하게 종료되었습니다.');
        } catch (error) {
            if (
                error.name === 'NoSuchSessionError' || 
                error.message.includes('valid session ID') || 
                error.message.includes('no such session')
            ) {
                console.log('브라우저가 이미 닫혀있거나 세션이 만료되어 정상 종료 처리합니다.');
                await statusMessage.edit('애니브라우저가 이미 종료되어 있습니다.');
            } else {
                console.error('애니중단 처리 중 예기치 못한 오류 발생:', error.message);
                await statusMessage.edit(`브라우저 종료 중 에러가 발생했습니다: ${error.message}`);
            }
        }
    });
};