const woiziconsent = function (obj) {
    if (obj instanceof woiziconsent) return obj
    if (!(this instanceof woiziconsent)) return new woiziconsent(obj)
}
window.woiziconsent = woiziconsent;

async function executeScripts(scripts) {
    const file = scripts.files.shift();
    const details = { file: file, runAt: "document_idle", allFrames: true }

    try {
        await chrome.tabs.executeScript(scripts.tabId, details)
    }
    catch (e) {
        logger.error('executeScripts error:', e.message)
    }

    if (scripts.files.length > 0) {
        await executeScripts(scripts);
    }
}

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
    if (tab.url.indexOf('http://') === -1 && tab.url.indexOf('https://') === -1) {
        console.log('not running on url ' + tab.url);
        return;
    }
    if (changeInfo.status === 'complete') {
        const message = {
            tabId: tab.id,
            version: chrome.runtime.getManifest().version,
            logLevel: logger.level
        }

        let pong;
        try {
            logger.log('ping page');
            pong = await chrome.tabs.sendMessage(tab.id, {
                ...message,
                ping: true,
            })
        }
        catch (e) {
            logger.log(e.toString());
        }

        if (!pong || !pong.status == "pong") {
            logger.log('injecting scripts into page');
            await executeScripts(
                {
                    tabId: tab.id,
                    files: ['logger.js', 'inuserview.js', 'common.js', 'page.js']
                }
            )
        }

        const attempts = [1, 100, 200, 500, 500, 1000, 1000];
        let attempt = 0;

        function runAttempt() {
            logger.log('attempt ' + (attempt + 1) + '/' + attempts.length);
            const startTime = new Date();
            chrome.tabs.sendMessage(tab.id, message).then(result => {
                const duration = new Date().getTime() - startTime.getTime();
                logger.log(result, `${(duration / 1000).toFixed(2)} seconds`);
                if (result.done) {
                    logger.log('done');
                }
                else {
                    if (!result.success) {
                        attempt++;
                        if (attempt < attempts.length) {
                            const timeout = attempts[attempt];
                            setTimeout(runAttempt, timeout);
                        }
                        else {
                            chrome.tabs.sendMessage(tab.id, {
                                ...message,
                                fatal: true,
                            });
                        }
                    }
                }
            })
                .catch(e => {
                    logger.log(e.toString())
                })
        }
        setTimeout(runAttempt, attempts[attempt]);
    }
});