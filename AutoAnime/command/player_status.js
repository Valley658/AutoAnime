let currentAnime = {
    title: '',
    episode: '',
    index: -1,
    totalEpisodes: 0,
    episodeList: []
};

module.exports = {
    get: () => currentAnime,
    set: (data) => { currentAnime = { ...currentAnime, ...data }; },
    reset: () => {
        currentAnime = { title: '', episode: '', index: -1, totalEpisodes: 0, episodeList: [] };
    }
};