'use strict';


chrome.runtime.onMessage.addListener(async function woiziconsentContent(request, _sender, sendResponse) {
    try {
        if (request.ping) {
            sendResponse({ status: "pong" })
            return { status: "pong" }
        }

        if (!logger || !getCookieConsentButtons) {
            sendResponse({ success: false })
            return false;
        }

        logger.level = request.logLevel || logger.DEBUG

        if (window.top !== window.self) {
            if (!inuserview(document.body)) {
                sendResponse({ success: false })
                return false
            }
        }

        const buttons = getCookieConsentButtons();
        if (buttons.length > 0) {
            logger.log('automatically accepting cookie consent');
            buttons.forEach(x => x.click());
            sendResponse({ success: true })
            return true;
        }

        sendResponse({ success: false })
        return false;
    }
    catch (e) {
        logger.log(e);
        throw e;
    }
})
