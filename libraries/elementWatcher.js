(Promise, polyfill) => {

    const exports = {
        exists,
        childAdded,
        childAddedContinuous,
        idle,
        addRecursiveObserver,
        addReverseRecursiveObserver
    }

    const $ = window.$;

    async function exists(selector, delay = 10, timeout = 5000, inverted = false) {
        const promiseWrapper = new Promise.Checking(() => {
            let result = $(selector)[0];
            return inverted ? !result : result;
        }, delay, timeout, `elementWatcher - exists - ${selector}`);
        return promiseWrapper;
    }

    async function childAdded(selector) {
        const promiseWrapper = new Promise.Expiring(5000, `elementWatcher - childAdded - ${selector}`);

        try {
            const parent = await exists(selector);
            const observer = new MutationObserver(function(mutations, observer) {
                for(const mutation of mutations) {
                    if(mutation.addedNodes?.length) {
                        observer.disconnect();
                        promiseWrapper.resolve();
                    }
                }
            });
            observer.observe(parent, { childList: true });
        } catch(error) {
            promiseWrapper.reject(error);
        }

        return promiseWrapper;
    }

    async function childAddedContinuous(selector, callback) {
        const parent = await exists(selector);
        const observer = new MutationObserver(function(mutations) {
            if(mutations.find(a => a.addedNodes?.length)) {
                callback();
            }
        });
        observer.observe(parent, { childList: true });
    }

    async function addRecursiveObserver(callback, ...chain) {
        const root = await exists(chain[0]);
        chain = chain.slice(1);
        _addRecursiveObserver(callback, root, chain, false, true);
    }

    async function addReverseRecursiveObserver(callback, ...chain) {
        const root = await exists(chain[0]);
        chain = chain.slice(1);
        _addRecursiveObserver(callback, root, chain, true, true);
    }

    function _addRecursiveObserver(callback, element, chain, reverse, initial) {
        if(chain.length === 0) {
            if(!(initial && reverse)) {
                callback(element);
            }
        }
        const observer = new MutationObserver(function(mutations) {
            const match = mutations
                .flatMap(a => Array.from(reverse ? a.removedNodes : a.addedNodes))
                .find(a => $(a).is(chain[0]));
            if(match) {
                _addRecursiveObserver(callback, match, chain.slice(1), reverse, false);
            }
        });
        observer.observe(element, { childList: true });
        for(const child of element.children) {
            if($(child).is(chain[0])) {
                _addRecursiveObserver(callback, child, chain.slice(1), reverse, true);
            }
        }
    }

    async function idle() {
        const promise = new Promise.Expiring(1000, 'elementWatcher - idle');
        polyfill.requestIdleCallback(() => {
            promise.resolve();
        });
        return promise;
    }

    return exports;

}
