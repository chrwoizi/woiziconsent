function getCookieConsentButtons() {
    const cookiesPattern = [
        /\bcookies\b/i
    ];

    const minTextLength = 50;
    const maxTreeDistance = 10;
    const maxPixelDistance = 400;

    const elements = getVisibleElements();
    const textElements = elements
        .filter(x => [...x.childNodes].find(c => c.nodeType == Node.TEXT_NODE && matchesPatterns(c.textContent, cookiesPattern) && c.textContent.length > minTextLength))
        .sort((a, b) => listParents(b).length - listParents(a).length);

    if (textElements.length === 0) return [];

    const acceptPatterns = [
        /\baccept\b/i,
        /\bsave\b/i,
        /\bgot\s+it\b/i,
        /\bi\s+understand\b/i,
        /\bunderstood\b/i,
        /\ballow\b/i,
        /\bagree\b/i,
        /\backnowledged?\b/i,

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
    ];

    const buttons = getButtons();
    const acceptButtons = buttons
        .filter(x => hasInnerText(x, acceptPatterns))
        .filter(x => minTreeDistance(x, textElements) < maxTreeDistance)
        .filter(x => minPixelDistance(x, textElements) < maxPixelDistance);

    return sortByMinTreeDistance(acceptButtons, textElements);
}
