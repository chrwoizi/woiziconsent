function matchesPatterns(text, patterns) {
    return patterns.filter(x => x.test(text)).length > 0;
}

function hasInnerText(element, patterns) {
    return getOverlaidElements(element).find(x => matchesPatterns(x.innerText, patterns));
}

function isTopmostElement(element) {
    const b = element.getBoundingClientRect()
    const other = element.getRootNode().elementFromPoint((b.left + b.right) / 2, (b.top + b.bottom) / 2);

    return other === element;
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function pixelDistance(x1, y1, x2, y2) {
    const distanceX = x2 - x1;
    const distanceY = y2 - y1;
    return Math.sqrt(distanceX * distanceX + distanceY * distanceY);
}

function edgePixelDistance(element1, element2) {
    const r1 = element1.getBoundingClientRect();
    const r2 = element2.getBoundingClientRect();

    const left = r2.right < r1.left
    const right = r1.right < r2.left
    const bottom = r2.bottom < r1.top
    const top = r1.bottom < r2.top

    if (top && left)
        return pixelDistance(r1.left, r1.bottom, r2.right, r2.top)
    else if (left && bottom)
        return pixelDistance(r1.left, r1.top, r2.right, r2.bottom)
    else if (bottom && right)
        return pixelDistance(r1.right, r1.top, r2.left, r2.bottom)
    else if (right && top)
        return pixelDistance(r1.right, r1.bottom, r2.left, r2.top)
    else if (left)
        return r1.left - r2.right
    else if (right)
        return r2.left - r1.right
    else if (bottom)
        return r1.top - r2.bottom
    else if (top)
        return r2.top - r1.bottom
    else
        return 0;
}

function minEdgePixelDistance(element, toElements) {
    return Math.min(...toElements.map(toElement => edgePixelDistance(element, toElement)));
}

function sortByEdgePixelDistance(elements, toElement) {
    return elements.sort((a, b) => edgePixelDistance(a, toElement) - edgePixelDistance(b, toElement));
}

function sortByMinEdgePixelDistance(elements, toElements) {
    return elements.sort((a, b) => minEdgePixelDistance(a, toElements) - minEdgePixelDistance(b, toElements));
}

function listParents(element, maxDepth = 999, currentDepth = 0) {
    if (currentDepth < maxDepth && element.parentNode) {
        return [element, ...listParents(element.parentNode, maxDepth, currentDepth + 1)];
    }
    return [element];
}

function listChildren(element, maxDepth = 999, currentDepth = 0) {
    if (currentDepth < maxDepth) {
        return [element, ...[...element.childNodes].map(child => listChildren(child, maxDepth, currentDepth + 1)).reduce((a, i) => [...a, ...i], [])];
    }
    return [element];
}

function treeDistance(element1, element2) {
    const parents1 = listParents(element1);
    const parents2 = listParents(element2);
    for (let depth1 = 0; depth1 < parents1.length; depth1++) {
        const depth2 = parents2.indexOf(parents1[depth1]);
        if (depth2 !== -1) {
            return depth1 + depth2;
        }
    }
    return undefined;
}

function minTreeDistance(element, toElements) {
    return Math.min(...toElements.map(toElement => treeDistance(element, toElement)));
}

function sortByTreeDistance(elements, toElement) {
    return elements.sort((a, b) => treeDistance(a, toElement) - treeDistance(b, toElement));
}

function sortByMinTreeDistance(elements, toElements) {
    return elements.sort((a, b) => minTreeDistance(a, toElements) - minTreeDistance(b, toElements));
}

function isVisibleByStyles(element) {
    const styles = window.getComputedStyle(element)
    const result = styles.visibility !== 'hidden' && styles.display !== 'none';

    return result;
}

function getVisibleElements(root) {
    return [...(root ?? document).querySelectorAll("*")]
        .map(x => x.shadowRoot ? [x, ...getVisibleElements(x.shadowRoot)] : [x])
        .reduce((a, i) => [...a, ...i], [])
        .filter(isVisibleByStyles)
        .filter(x => x !== document)
        .filter(x => x !== document.body);
}

function isRoughlyContainedInRect(rect, inRect) {
    const epsilon = 10;
    if (rect.left < inRect.left - epsilon) return false;
    if (rect.right > inRect.right + epsilon) return false;
    if (rect.top < inRect.top - epsilon) return false;
    if (rect.bottom > inRect.bottom + epsilon) return false;
    return true;
}

function getOverlaidElements(element, maxParentLevel = 3, maxChildLevel = 5) {
    const rect = element.getBoundingClientRect();
    const overlaidElements = [];
    const parents = listParents(element, maxParentLevel);
    for (const parent of parents) {
        const children = listChildren(parent, maxChildLevel);
        for (const candidate of children) {
            if (candidate.getBoundingClientRect) {
                const candidateRect = candidate.getBoundingClientRect();
                if (isRoughlyContainedInRect(candidateRect, rect)) {
                    overlaidElements.push(candidate);
                }
            }
        }
    }
    return overlaidElements;
}

function hasClickHandler(element) {
    if (element.nodeName === 'A') return true;
    if (element.nodeName === 'BUTTON') return true;
    if (element.nodeName === 'INPUT'
        && ['submit', 'button'].indexOf(element.attributes.type?.value?.toLowerCase()) !== -1) return true;
    if ([/\bbtn\b/i, /\bbutton\b/i].find(x => x.test(element.className))) return true;
    return false;
}

function getClickHandlerInParents(element) {
    if (!element) return undefined
    if (hasClickHandler(element)) return element
    return getClickHandlerInParents(element.parentElement)
}

function getButtons(visibleElements) {
    return (visibleElements || getVisibleElements())
        .filter(isTopmostElement)
        .map(getClickHandlerInParents)
        .filter(Boolean)
        .filter(onlyUnique)
        .filter(x => x !== document)
        .filter(x => x !== document.body);
}

function readStorage(storage) {
    const data = [];
    for (let i = 0, len = storage.length; i < len; i++) {
        const key = storage.key(i);
        if (key) {
            const value = storage[key];
            data.push({ key: key, value: value });
        }
    }
    return data;
}

async function readCookies() {
    return cookieStore.getAll();
}

function isJWT(token) {
    const regex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/;
    if (!regex.test(token)) return false;

    try {
        const headerJson = atob(token.split('.')[0]);
        const header = JSON.parse(headerJson);
        if (header.alg) return true;
    }
    catch (e) {
        return false;
    }

    try {
        const bodyJson = atob(token.split('.')[1]);
        const header = JSON.parse(bodyJson);
        if (header.exp) return true;
        if (header.iss) return true;
        if (header.email) return true;
        if (header.sub) return true;
        if (header.userId) return true;
    }
    catch (e) {
        return false;
    }

    return false;
}