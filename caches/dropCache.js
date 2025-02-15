(request, itemCache, actionCache, ingredientCache, skillCache) => {

    const exports = {
        list: [],
        byAction: {},
        byItem: {},
        boneCarveMappings: null,
        conversionMappings: null,
        tierVarietyMappings: null,
        produceItems: null,
        getMostCommonDrop
    };

    async function initialise() {
        const drops = await request.listDrops();
        for(const drop of drops) {
            exports.list.push(drop);
            if(!exports.byAction[drop.action]) {
                exports.byAction[drop.action] = [];
            }
            exports.byAction[drop.action].push(drop);
            if(!exports.byItem[drop.item]) {
                exports.byItem[drop.item] = [];
            }
            exports.byItem[drop.item].push(drop);
        }
        extractBoneCarvings();
        extractConversions();
        extractTierVariety();
        extractProduceItems();
        enrichItems();
        return exports;
    }

    // I'm sorry for what follows
    function extractBoneCarvings() {
        let name;
        exports.boneCarveMappings = exports.list
            // filtering
            .filter(drop => drop.type === 'GUARANTEED')
            .filter(drop => (name = itemCache.byId[drop.item].name, name.endsWith('Bone') || name.endsWith('Fang')))
            .filter(drop => actionCache.byId[drop.action].skill === 'Combat')
            // sort
            .sort((a,b) => actionCache.byId[a.action].level - actionCache.byId[b.action].level)
            // per level
            ._groupBy(drop => actionCache.byId[drop.action].level)
            .map(a => a[0].item)
            .map((item,i,all) => ({
                from: item,
                to: [].concat([all[i-1]]).concat([all[i-2]]).filter(a => a)
            }))
            .reduce((a,b) => (a[b.from] = b.to, a), {});
    }

    function extractConversions() {
        exports.conversionMappings = exports.list
            .filter(a => actionCache.byId[a.action].type === 'CONVERSION')
            .map(drop => ({
                from: ingredientCache.byAction[drop.action][0].item,
                to: drop.item,
                amount: drop.amount
            }))
            ._groupBy(a => a.to)
            .reduce((a,b) => (a[b[0].to] = b, a), {});
    }

    function extractTierVariety() {
        exports.tierVarietyMappings = exports.list
            .filter(drop => drop.type === 'REGULAR')
            .filter(drop => drop.chance >= 0.8)
            .filter(drop => skillCache.byName[actionCache.byId[drop.action].skill].type === 'Gathering')
            ._groupBy(drop => actionCache.byId[drop.action].level)
            .flatMap(drops => drops
                .map(drop => drop.item)
                ._distinct()
                .flatMap((item, _i, arr) => ({
                    from: item,
                    to: arr.filter(a => a !== item)
                }))
            ).reduce((a,b) => (a[b.from] = b.to, a), {});
    }

    function extractProduceItems() {
        exports.produceItems = exports.list
            .filter(drop => actionCache.byId[drop.action].skill === 'Farming')
            .filter(drop => drop.type === 'REGULAR')
            .map(drop => drop.item)
            ._distinct();
    }

    function getMostCommonDrop(actionId) {
        return exports.byAction[actionId].sort((a,b) => a.chance - b.chance)[0].item;
    }

    function enrichItems() {
        for(const item of itemCache.list) {
            if(item.attributes.SELL_PRICE) {
                item.attributes.MIN_MARKET_PRICE = calcMarketPrice(item);
            }
        }
    }

    function calcMarketPrice(item) {
        if(item.attributes.UNTRADEABLE || !item.attributes.SELL_PRICE) {
            return 0;
        }
        if(itemCache.specialIds.gem.includes(item.id)) {
            return item.attributes.SELL_PRICE * 1.2;
        }
        if(exports.produceItems.includes(item.id)) {
            return item.attributes.SELL_PRICE * 1.5 - 1;
        }
        if(itemCache.specialIds.food.includes(item.id)) {
            return Math.round(0.8 * item.stats.global.HEAL);
        }
        if(itemCache.specialIds.smithing.includes(item.id)) {
            return 2 * Math.round(item.attributes.SELL_PRICE * 3/4);
        }
        return 2 * item.attributes.SELL_PRICE;
    }

    return initialise();

}
