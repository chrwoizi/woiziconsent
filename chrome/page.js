'use strict';

function getLogoutButtons(visibleElements) {
    const logoutPatterns = [
        // english
        /.{0,30}\blog-?\s*-?out\b.{0,30}/i,
        /.{0,30}\bsign-?\s*-?out\b.{0,30}/i,

        // german
        /.{0,30}\bausloggen\b.{0,30}/i,
        /.{0,30}\babmelden\b.{0,30}/i,
    ];

    const buttons = getButtons(visibleElements);
    let logoutButtons = buttons.filter(x => elementTextMatches(x, logoutPatterns));

    return logoutButtons;
}

async function isLoggedIn() {
    const logoutButtons = getLogoutButtons();
    if (logoutButtons.length > 0) {
        logger.log('logout button found');
        logger.log(logoutButtons);
        return true;
    }

    try {
        if (readStorage(localStorage).find(x => isJWT(x.value))) {
            logger.log('jwt found in localStorage');
            return true;
        }
    }
    catch (e) {
        logger.log('could not load localStorage');
        logger.log(e);
    }

    try {
        if (readStorage(sessionStorage).find(x => isJWT(x.value))) {
            logger.log('jwt found in sessionStorage');
            return true;
        }
    }
    catch (e) {
        logger.log('could not load sessionStorage');
        logger.log(e);
    }

    try {
        const cookies = await readCookies();
        if (cookies.find(x => isJWT(x.value))) {
            logger.log('jwt found in cookies');
            return true;
        }
    }
    catch (e) {
        logger.log('could not load cookies');
        logger.log(e);
    }

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
        /\bcookies\b/i,
        /\bdatenschutz/i
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
        /.{0,30}\b(einstellungen\s+)?speichern\b.{0,30}/i,
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
        /.{0,30}\b(alle\s+)?cookies\s+akzeptieren\b.{0,30}/i,
    ];

    const minTextLength = 50;
    const maxTreeDistance = 14;
    const maxPixelDistance = 400;

    const elements = visibleElements || getVisibleElements();
    const textElements = elements.filter((x) => {
        return (
            x.innerText?.length > minTextLength &&
            matchesPatterns(x.innerText, cookiesPattern)
        );
    });

    if (textElements.length === 0) return [];

    const buttons = getButtons(elements);
    const acceptButtons = buttons.filter((x) =>
        elementTextMatches(x, acceptPatterns),
    );

    const cookieAcceptButtons = acceptButtons.filter((x) => {
        const treeDistance = minTreeDistance(x, textElements);
        if (treeDistance > maxTreeDistance) {
            return false;
        }

        const pixelDistance = minEdgePixelDistance(x, textElements);
        if (pixelDistance > maxPixelDistance) {
            return false;
        }

        const isInFlowOfTextElement = textElements.find((y) =>
            isPositionInFlowDirection(x, y),
        );
        if (!isInFlowOfTextElement) {
            return false;
        }

        return true;
    });

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

        if (!window.logger || !getButtons) {
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
        try {
            if (logger) logger.log(e);
        }
        catch (e2) {
            console.log(e);
        }
        throw e;
    }
}