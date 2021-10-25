'use strict';

function getLogoutButtons(visibleElements) {
    const logoutPatterns = [
        // english
        /\blog-?\s*-?out\b/i,
        /\bsign-?\s*-?out\b/i,

        // german
        /\bausloggen\b/i,
    ];

    const buttons = getButtons(visibleElements);
    let logoutButtons = buttons.filter(x => hasInnerText(x, logoutPatterns));

    return logoutButtons;
}

async function isLoggedIn() {
    if (getLogoutButtons().length > 0) return true;

    if (readStorage(localStorage).find(x => isJWT(x.value))) return true;

    if (readStorage(sessionStorage).find(x => isJWT(x.value))) return true;

    const cookies = await readCookies();
    if (cookies.find(x => isJWT(x.value))) return true;

    return false;
}

async function getCookieConsentButtons(visibleElements) {
    const cookiesPattern = [
        /\bcookies\b/i
    ];

    const acceptPatterns = [
        // english
        /\baccept\b/i,
        /\bsave\b/i,
        /\bgot\s+it\b/i,
        /\bi\s+understand\b/i,
        /\bunderstood\b/i,
        /\ballow\b/i,
        /\bagree\b/i,
        /\backnowledged?\b/i,

        // german
        /\bakzeptieren\b/i,
        /\bannehmen\b/i,
        /\bzustimmen\b/i,
        /\bstimme\s+zu\b/i,
        /\bspeichern\b/i,
        /\bin\s+ordnung\b/i,
        /\beinverstanden\b/i,
        /\bverstanden\b/i,
        /\bstimme\s+(dem\s+)?zu\b/i,
        /\bbestätigen\b/i,
        /\bokay\b/i,
        /\bzulassen\b/i,
        /\berlauben?\b/i,
        /\beinwilligen\b/i,
        /\bich\s+willige\s+ein\b/i,
    ];

    const minTextLength = 50;
    const maxTreeDistance = 10;
    const maxPixelDistance = 400;

    const elements = visibleElements || getVisibleElements();
    const textElements = elements
        .filter(x => [...x.childNodes].find(c => c.nodeType == Node.TEXT_NODE && matchesPatterns(c.textContent, cookiesPattern) && c.textContent.length > minTextLength))
        .sort((a, b) => listParents(b).length - listParents(a).length);

    if (textElements.length === 0) return [];

    const buttons = getButtons(elements);
    const acceptButtons = buttons
        .filter(x => hasInnerText(x, acceptPatterns))
        .filter(x => minTreeDistance(x, textElements) < maxTreeDistance)
        .filter(x => minPixelDistance(x, textElements) < maxPixelDistance);

    return sortByMinTreeDistance(acceptButtons, textElements);
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    woiziconsentContent(request, _sender, sendResponse).then(sendResponse);
    return true;
})

async function woiziconsentContent(request, _sender, sendResponse) {
    try {
        if (request.ping) {
            return { status: "pong" }
        }

        if (!logger || !getButtons) {
            return { success: false };
        }

        logger.level = request.logLevel || logger.DEBUG

        if (window.top !== window.self) {
            if (!inuserview(document.body)) {
                return { success: false };
            }
        }

        const elements = getVisibleElements()

        if (await isLoggedIn(elements)) {
            logger.log('is logged in');
            return { success: true };
        }

        const buttons = await getCookieConsentButtons(elements);
        if (buttons.length > 0) {
            logger.log('automatically accepting cookie consent');
            buttons.forEach(x => x.click());
            return { success: true };
        }

        return { success: false };
    }
    catch (e) {
        logger.log(e);
        throw e;
    }
}