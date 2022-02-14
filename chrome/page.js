'use strict';

function getLogoutButtons(visibleElements) {
    const logoutPatterns = [
        // english
        /.{0,30}\blog-?\s*-?out\b.{0,30}/i,
        /.{0,30}\bsign-?\s*-?out\b.{0,30}/i,

        // german
        /.{0,30}\bausloggen\b.{0,30}/i,
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

function isPositionInFlowDirection(element, refElement) {
    const elementRect = element.getBoundingClientRect();
    const elementMiddleX = elementRect.left + elementRect.width / 2 + window.scrollX;
    const elementMiddleY = elementRect.top + elementRect.height / 2 + window.scrollY;

    const refElementRect = refElement.getBoundingClientRect();

    return elementMiddleX > refElementRect.left && elementMiddleY > refElementRect.top;
}

async function getCookieConsentButtons(visibleElements) {
    const cookiesPattern = [
        /\bcookies\b/i
    ];

    const acceptPatterns = [
        // english
        /.{0,30}\baccept\b.{0,30}/i,
        /.{0,30}\bsave\b.{0,30}/i,
        /.{0,30}\bgot\s+it\b.{0,30}/i,
        /.{0,30}\bi\s+understand\b.{0,30}/i,
        /.{0,30}\bunderstood\b.{0,30}/i,
        /.{0,30}\ballow\b.{0,30}/i,
        /.{0,30}\bagree\b.{0,30}/i,
        /.{0,30}\backnowledged?\b.{0,30}/i,

        // german
        /.{0,30}\bakzeptieren?\b.{0,30}/i,
        /.{0,30}\bannehmen\b.{0,30}/i,
        /.{0,30}\bzustimmen\b.{0,30}/i,
        /.{0,30}\bstimme\s+zu\b.{0,30}/i,
        /.{0,30}\bspeichern\b.{0,30}/i,
        /.{0,30}\bin\s+ordnung\b.{0,30}/i,
        /.{0,30}\beinverstanden\b.{0,30}/i,
        /.{0,30}\bverstanden\b.{0,30}/i,
        /.{0,30}\bstimme\s+(dem\s+)?zu\b.{0,30}/i,
        /.{0,30}\bbestätigen?\b.{0,30}/i,
        /.{0,30}\bokay\b.{0,30}/i,
        /.{0,30}\bzulassen\b.{0,30}/i,
        /.{0,30}\blasse\s+zu\b.{0,30}/i,
        /.{0,30}\berlauben?\b.{0,30}/i,
        /.{0,30}\beinwilligen\b.{0,30}/i,
        /.{0,30}\bich\s+willige\s+ein\b.{0,30}/i,
        /.{0,30}\bweiter\s+zur\s+seite\b.{0,30}/i,
    ];

    const minTextLength = 50;
    const maxTreeDistance = 10;
    const maxPixelDistance = 100;

    const elements = visibleElements || getVisibleElements();
    const textElements = elements
        .filter(x => [...x.childNodes].find(c => c.nodeType == Node.TEXT_NODE && matchesPatterns(c.textContent, cookiesPattern) && c.textContent.length > minTextLength))
        .sort((a, b) => listParents(b).length - listParents(a).length);
    if (textElements.length === 0) return [];

    const buttons = getButtons(elements);
    const acceptButtons = buttons
        .filter(x => hasInnerText(x, acceptPatterns));

    const cookieAcceptButtons = acceptButtons
        .filter(x => minTreeDistance(x, textElements) < maxTreeDistance)
        .filter(x => minEdgePixelDistance(x, textElements) < maxPixelDistance)
        .filter(x => textElements.find(y => isPositionInFlowDirection(x, y)))

    return sortByMinTreeDistance(cookieAcceptButtons, textElements);
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
    woiziconsentContent(request).then(sendResponse);
    return true;
})

async function woiziconsentContent(request) {
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

        var storageKey = 'woiziconsent';

        if (localStorage.getItem(storageKey) === request.version) {
            logger.log('failed in the past');
            return { done: true };
        }

        if (request.fatal) {
            localStorage.setItem(storageKey, request.version);
        }

        const elements = getVisibleElements()

        if (await isLoggedIn(elements)) {
            logger.log('is logged in');
            return { done: true };
        }

        const buttons = await getCookieConsentButtons(elements);
        if (buttons.length > 0) {
            logger.log('automatically accepting cookie consent');
            buttons.forEach(x => x.click());
            localStorage.setItem(storageKey, request.version);
            return { success: true };
        }

        return { success: false };
    }
    catch (e) {
        if (logger) logger.log(e);
        throw e;
    }
}