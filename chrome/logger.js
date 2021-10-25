var extensionName = 'woiziconsent';

var logger = {

    OFF: 0,
    ERROR: 1,
    WARN: 2,
    INFO: 3,
    DEBUG: 4,

    set level(logLevel) {
        if (logLevel === void 0)
            logLevel = logger.OFF

        if (logLevel >= this.ERROR)
            this.error = (...m) => { console.error.bind(window.console)(extensionName + ':', ...m); }
        else
            this.error = () => { }

        if (logLevel >= this.WARN)
            this.warn = (...m) => { console.warn.bind(window.console)(extensionName + ':', ...m); }
        else
            this.warn = () => { }

        if (logLevel >= this.INFO)
            this.info = (...m) => { console.info.bind(window.console)(extensionName + ':', ...m); }
        else
            this.info = () => { }

        if (logLevel >= this.DEBUG)
            this.log = (...m) => { console.log.bind(window.console)(extensionName + ':', ...m); }
        else
            this.log = () => { }

        this.logLevel = logLevel
    },
    get level() { return this.logLevel }
}
logger.level = logger.DEBUG
