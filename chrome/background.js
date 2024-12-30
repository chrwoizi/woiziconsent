async function executeScripts(scripts) {
  const file = scripts.files.shift();

  try {
    await chrome.scripting.executeScript({
      target: { tabId: scripts.tabId, allFrames: true },
      files: [file],
    });
  } catch (e) {
    console.error("executeScript error for tab " + scripts.tabId, e.message);
  }

  if (scripts.files.length > 0) {
    await executeScripts(scripts);
  }
}

chrome.tabs.onUpdated.addListener(async (_tabId, changeInfo, tab) => {
  if (tab.url.indexOf("http://") === -1 && tab.url.indexOf("https://") === -1) {
    console.log("not running on url " + tab.url);
    return;
  }
  if (changeInfo.status === "complete") {
    const message = {
      tabId: tab.id,
      version: chrome.runtime.getManifest().version,
      logLevel: 4,
    };

    let pong;
    try {
      console.log("ping page");
      pong = await chrome.tabs.sendMessage(tab.id, {
        ...message,
        ping: true,
      });
    } catch (e) {
      console.log(e.toString());
    }

    if (!pong || pong.status !== "pong") {
      console.log("injecting scripts into page");
      await executeScripts({
        tabId: tab.id,
        files: ["logger.js", "inuserview.js", "common.js", "page.js"],
      });
    }

    const attempts = [1, 100, 200, 500, 500, 1000, 1000];
    let attempt = 0;

    function runAttempt() {
      console.log("attempt " + (attempt + 1) + "/" + attempts.length);
      const startTime = new Date();
      chrome.tabs
        .sendMessage(tab.id, message)
        .then((result) => {
          const duration = new Date().getTime() - startTime.getTime();
          console.log(result, `${(duration / 1000).toFixed(2)} seconds`);
          if (result.done) {
            console.log("done");
          } else {
            if (!result.success) {
              attempt++;
              if (attempt < attempts.length) {
                const timeout = attempts[attempt];
                setTimeout(runAttempt, timeout);
              } else {
                chrome.tabs.sendMessage(tab.id, {
                  ...message,
                  fatal: true,
                });
              }
            }
          }
        })
        .catch((e) => {
          console.log(e.toString());
        });
    }
    setTimeout(runAttempt, attempts[attempt]);
  }
});
