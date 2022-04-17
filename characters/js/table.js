(function() {

angular.module('optc') .run(function($rootScope, $timeout, $storage, MATCHER_IDS) {

    /**************
     * Table data *
     **************/

    var additionalColumns = $storage.get('charColumns', [ ]);

    var padding = Math.floor(Math.log(window.units.length+2) / Math.log(10)) + 1;
    var table = null;

    var addImage = function(data, type, row, meta) {
        return '<img class="slot small" data-original="' + Utils.getThumbnailUrl(row[0]) + '"> ' +
            //return '<img class="slot small" data-original="' + Utils.getGlobalThumbnailUrl(row[0]) + '" onerror="this.onerror=null;this.src=\'' + Utils.getThumbnailUrl(row[0]) + '\';"> ' +
            '<a ui-sref="main.search.view({ id: ' + parseInt(row[0],10) + '})">' + data + '</a>';
    };

    var fuse = new Fuse(window.units, {
        keys: [ 'name', 'aliases' ],
        id: 'number',
        threshold: 0.3,
        distance: 200
    });

    var fused = null;

    var tableData = null;
    var farmableLocations = null;

    var log = $storage.get('characterLog', [ ]);
    var characterLog = { };
    for (var i=0;i<log.length;++i) characterLog[log[i]] = true;

    /*******************
     * Table functions *
     *******************/

    var getTableColumns = function() {
        var result = [
            { title: 'ID' },
            { title: 'Name', render: addImage },
            { title: 'Type' },
            { title: 'Class' },
            { title: 'HP' },
            { title: 'ATK' },
            { title: 'RCV' },
            { title: 'Cost' },
            { title: 'Slots' },
            { title: 'Stars' },
            { title: 'CL', orderable: false }
        ];
        additionalColumns.forEach(function(x) {
            var title = x
                .replace(/Minimum cooldown/,'Min CD')
                .replace(/Minimum Limit Break cooldown/,'Min LB CD')
                .replace(/Initial cooldown/,'Init. CD')
                .replace(/Initial Limit Break cooldown/,'Init. LB CD')
                .replace(/MAX EXP/,'MAX EXP');
            result.splice(result.length-1, 0, { title: title, type: 'num-string' });
        });
        return result;
    };

    /*******************
     * Table filtering *
     *******************/

    var tableFilter = function(settings, data, index) {
        if (!tableData.parameters) return true;
        var id = parseInt(data[0],10), unit = window.units[id - 1];
        var flags = window.flags[unit.number + 1] || { };

        /* * * * * Query filters * * * * */

        // override `queryTerms` checking if fuzzy mode is enabled
        let tempParams = {...tableData.parameters};
        if (tableData.fuzzy) {
            tempParams.queryTerms = null;

            if (tableData.parameters.query) {
                if (fused === null) fused = fuse.search(tableData.parameters.query);
                if (fused.indexOf(id - 1) == -1) return false;
            }
        }

        if (!Utils.checkUnitMatchSearchParameters(unit, tempParams))
            return false;

        /* * * * * Sidebar filters * * * * */
        if (!tableData.parameters.filters) return true;
        var filters = tableData.parameters.filters;
        // filter by type
        //if (filters.type && unit.type !== filters.type) return false;
        if (filters.types && filters.types.length){
            if (!Array.isArray(unit.type)) if (!filters.types.includes(unit.type)) return false;
            if (Array.isArray(unit.type)) if ((!filters.types.includes(unit.type[0])) && (!filters.types.includes(unit.type[1]))) return false;
        }
        // filter by class
        if(!Array.isArray(unit.class) && filters.noSingleClass) return false;
        if (filters.classes && filters.classes.length) {
            var inclusive = !filters.classInclusive;
            var singleQuery = filters.classes.length == 1, singleClass = !Array.isArray(unit.class), doubleClass = Array.isArray(unit.class) && unit.class.length == 2 ? Array.isArray(unit.class[0]) ? false : true : false, dualCharacter = Array.isArray(unit.class) && unit.class.length == 3, vsCharacter = Array.isArray(unit.class) && unit.class.length == 2 ? Array.isArray(unit.class[0]) ? true : false: false;
            if(!inclusive){
                if (singleClass){
                    if(singleQuery) if(filters.classes[0] != unit.class) return false;
                    if(!singleQuery) if(!filters.classes.includes(unit.class)) return false;
                }
                else if(doubleClass){
                    if(singleQuery) return false;
                    if(!singleQuery) if(!filters.classes.includes(unit.class[0]) || !filters.classes.includes(unit.class[1])) return false;
                }
                else{
                    if(singleQuery) {
                        var temp1 = false;
                        var temp2 = false;
                        var temp3 = false;
                        if (unit.class[0].length != 2) { if(filters.classes[0] == unit.class[0]) temp1 = true;}
                        if (unit.class[1].length != 2) { if(filters.classes[0] == unit.class[1]) temp2 = true;}
                        if(dualCharacter) if (unit.class[2].length != 2) { if(filters.classes[0] == unit.class[2]) temp3 = true;}
                        if (!(temp1 || temp2 || temp3)) return false;

                    }
                    if(!singleQuery){
                        if(dualCharacter) if((!filters.classes.includes(unit.class[0][0]) || !filters.classes.includes(unit.class[0][1]))
                          && (!filters.classes.includes(unit.class[1][0]) || !filters.classes.includes(unit.class[1][1]))
                          && (!filters.classes.includes(unit.class[2][0]) || !filters.classes.includes(unit.class[2][1]))) return false;
                        if(vsCharacter) if((!filters.classes.includes(unit.class[0][0]) || !filters.classes.includes(unit.class[0][1]))
                          && (!filters.classes.includes(unit.class[1][0]) || !filters.classes.includes(unit.class[1][1]))) return false;
                    }
                }
            }
            else{
                if (singleClass) if(!filters.classes.includes(unit.class)) return false;
                if (doubleClass) if(!filters.classes.includes(unit.class[0]) && !filters.classes.includes(unit.class[1])) return false;
                if (dualCharacter || vsCharacter) {
                    var uclasses = [];
                    for(i = 0; i < unit.class.length; i++) { uclasses.push(unit.class[i][0]); uclasses.push(unit.class[i][1]); }
                    var temp = false;
                    for(i = 0; i < uclasses.length; i++) if(temp || filters.classes.includes(uclasses[i])) temp = true;
                    if(!temp) return false;
                }
            }
        }
        // filter by stars
        if (filters.stars && filters.stars.length && filters.stars.indexOf(unit.stars) == -1) return false;
        // filter by cost
        if ((unit.cost < filters.cost[0] || unit.cost > filters.cost[1])) return false;
        // filter by drop
        if(id == 2) console.log(filters);
        if (filters.nonFarmable && Object.keys(filters.nonFarmable).length > 0){
            // RR
            if (filters.nonFarmable.rro && !flags.rro) return false;
            if (filters.nonFarmable.rro === false && flags.rro) return false;
            // limited RR
            if (filters.nonFarmable.lrr && !flags.lrr) return false;
            if (filters.nonFarmable.lrr === false && flags.lrr) return false;
            // promo
            if (filters.nonFarmable.promo && !flags.promo) return false;
            if (filters.nonFarmable.promo === false && flags.promo) return false;
            // special
            if (filters.nonFarmable.special && !flags.special) return false;
            if (filters.nonFarmable.special === false && flags.special) return false;
            // rayleigh shop
            if (filters.nonFarmable.shop && !flags.shop) return false;
            if (filters.nonFarmable.shop === false && flags.shop) return false;
            // trade port
            if (filters.nonFarmable.tmshop && !flags.tmshop) return false;
            if (filters.nonFarmable.tmshop === false && flags.tmshop) return false;
            // TM RR
            if (filters.nonFarmable.tmlrr && !flags.tmlrr) return false;
            if (filters.nonFarmable.tmlrr === false && flags.tmlrr) return false;
            // KC RR
            if (filters.nonFarmable.kclrr && !flags.kclrr) return false;
            if (filters.nonFarmable.kclrr === false && flags.kclrr) return false;
            // PF RR
            if (filters.nonFarmable.pflrr && !flags.pflrr) return false;
            if (filters.nonFarmable.pflrr === false && flags.pflrr) return false;
            // Support RR
            if (filters.nonFarmable.slrr && !flags.slrr) return false;
            if (filters.nonFarmable.slrr === false && flags.slrr) return false;
        }
        if (filters.farmable && Object.keys(filters.farmable).length > 0){
            if (farmableLocations !== null) {
                var farmable = CharUtils.checkFarmable(id, farmableLocations);
                if (!farmable) return false;
            }
        }
        if (filters.drop) {
            var isFarmable = CharUtils.isFarmable(id);
            if (filters.drop == 'Farmable') {
                if (id == 1 || !isFarmable) return false;
            }
            if (filters.drop != 'Farmable') {
                if (id != 1 && isFarmable) return false;
            }
        }
        /* if (filters.drop && false) {
            if (id ==2) console.log(filters);
            var isFarmable = CharUtils.isFarmable(id);
            if (filters.drop == 'Farmable') {
                if (id == 1 || !isFarmable) return false;
                if (farmableLocations !== null) {
                    var farmable = CharUtils.checkFarmable(id, farmableLocations);
                    if (!farmable) return false;
                }
            }
            if (filters.drop != 'Farmable') {
                if (id != 1 && isFarmable) return false;
                if (filters.nonFarmable) {
                    // RR
                    if (filters.nonFarmable.rro && !flags.rro) return false;
                    if (filters.nonFarmable.rro === false && flags.rro) return false;
                    // limited RR
                    if (filters.nonFarmable.lrr && !flags.lrr) return false;
                    if (filters.nonFarmable.lrr === false && flags.lrr) return false;
                    // promo
                    if (filters.nonFarmable.promo && !flags.promo) return false;
                    if (filters.nonFarmable.promo === false && flags.promo) return false;
                    // special
                    if (filters.nonFarmable.special && !flags.special) return false;
                    if (filters.nonFarmable.special === false && flags.special) return false;
                    // rayleigh shop
                    if (filters.nonFarmable.shop && !flags.shop) return false;
                    if (filters.nonFarmable.shop === false && flags.shop) return false;
                    // trade port
                    if (filters.nonFarmable.tmshop && !flags.tmshop) return false;
                    if (filters.nonFarmable.tmshop === false && flags.tmshop) return false;
                    // TM RR
                    if (filters.nonFarmable.tmlrr && !flags.tmlrr) return false;
                    if (filters.nonFarmable.tmlrr === false && flags.tmlrr) return false;
                    // KC RR
                    if (filters.nonFarmable.kclrr && !flags.kclrr) return false;
                    if (filters.nonFarmable.kclrr === false && flags.kclrr) return false;
                    // PF RR
                    if (filters.nonFarmable.pflrr && !flags.pflrr) return false;
                    if (filters.nonFarmable.pflrr === false && flags.pflrr) return false;
                    // Support RR
                    if (filters.nonFarmable.slrr && !flags.slrr) return false;
                    if (filters.nonFarmable.slrr === false && flags.slrr) return false;
                }
            }
        } */
        // exclusion filters
        if (filters.noBase && (evolutions[id] && evolutions[id].evolution)) return false;
        if (filters.noEvos && Utils.isEvolverBooster(unit)) return false;
        //console.log(window.details[id] ? "limit" in window.details[id] ? id : "no" : "no details");
        if (filters.noLB && window.details[id]) if("limit" in window.details[id]) return false;
        if (filters.potential) if(window.details[id]) { if(!("potential" in window.details[id])) return false; } else { return false }
        //console.log(window.details[id].limit);
        if (filters.noLBex && window.details[id]) if("limit" in window.details[id]) {
            for (x in window.details[id].limit){
                if (window.details[id].limit[x].description.includes("LOCKED WITH KEY")) return false;
            }
        }
        if (filters.noSupport && window.details[id]) if("support" in window.details[id]) return false;
        if (filters.globalTM && [ 3584, 3585, 3586, 3574, 5409, 5410, 5411, 5412, 3576, 3567, 3553, 3555, 5401, 5402, 5403, 5404, 3563, 3582, 3556, 3557, 3558, 3577, 3578, 3580, 3572, 3587, 3579, 3364, 3462, 3483, 3523, 3543, 5393, 5394, 5395, 5396, 3551, 3559, 3560, 2362, 2583, 2879, 3022, 3150, 3197, 3273, 3547, 3588, 3534, 3536, 3550, 3537, 3538, 3463, 3464, 3484, 3485, 3544, 3545, 3564, 3565, 654, 865, 1108, 2394, 2684, 2819, 5048, 5049, 5050, 5051, 2885, 2886, 2922, 2923, 1310, 1378, 1423, 1525, 1602, 1897, 1945, 2111, 2845, 2869, 3110, 3235, 3540, 1112, 1891, 1963, 1980, 2640, 2692, 3532, 3571, 3546, 3539, 2936, 2938, 2940, 2942, 2944, 2946, 2948, 2950, 2952 ].indexOf(id) == -1) return false;
        if (filters.globalKC && [ 3569, 3568, 3567, 3565, 3564, 3563, 3560, 3559, 3558, 3557, 3556, 3555, 5401, 5402, 5403, 5404, 3553, 2756, 2793, 2832, 2853, 2887, 2888, 2889, 2996, 2997, 2998, 3120, 3121, 3149, 3151, 3152, 3204, 5296, 5297, 5298, 5299, 3205, 3212, 3242, 3274, 3300, 5314, 5315, 5316, 5317, 3301, 3302, 3349, 5333, 5334, 5335, 5336, 3370, 3371, 3372, 3391, 3392, 3418, 3445, 3446, 3447, 3468, 3487, 3488, 3508, 5369, 5370, 5371, 5372, 3509, 3528, 3529, 3548, 3549, 3448, 3417, 3393, 3369, 3350, 3298, 3275, 3240, 3211, 3202, 3118, 3154, 3397, 3352 ].indexOf(id) == -1) return false;
        if (filters.japanTM && [ 3502, 3503, 3504, 3493, 5353, 5354, 5355, 5356, 3495, 5361, 5362, 5363, 5364, 3491, 3472, 3474, 3483, 3475, 3476, 3496, 3497, 3499, 3490, 3505, 3498, 3364, 3462, 3470, 3486, 3477, 3481, 1889, 2362, 2557, 5140, 5141, 5142, 5143, 2618, 5176, 5177, 5178, 5179, 3150, 3197, 3416, 3467, 3506, 2797, 3164, 5287, 5288, 5289, 5290, 3166, 5295, 5296, 5297, 5298, 3452, 3454, 3469, 3455, 3456, 3365, 3366, 3367, 3484, 3485, 418, 516, 1047, 1108, 1163, 1298, 1830, 1924, 2097, 2263, 2698, 831, 1089, 1402, 1458, 1897, 2193, 2649, 2908, 3017, 3083, 3329, 3408, 3460, 798, 1136, 1512, 1581, 1891, 2751, 3450, 3466, 3425, 3457, 2936, 2938, 2940, 2942, 2944, 2946, 2948, 2950, 2952 ].indexOf(id) == -1) return false;
        if (filters.japanKC && [ 3149, 3151, 3152, 3154, 3150, 3145, 3143, 3142, 3141, 3139, 3137, 3135, 5283, 5284, 3124, 1268, 3121, 3120, 2998, 2997, 2996, 2889, 2888, 2887, 2853, 2832, 2793, 2756, 3118, 3106, 3104, 3102, 3100, 2987, 2956, 2952, 2950, 2948, 2946, 2944, 2942, 2940, 2938, 2936, 2923, 2922, 2886, 2885, 2281, 2158, 2019, 2015, 1997, 1855, 1815, 1812, 1564, 1108, 2146 ].indexOf(id) == -1) return false;
        if (filters.worldClash && [ 253, 1041, 255, 257, 259, 979, 980, 983, 453, 455, 457, 946, 947, 948, 1182, 1528, 1186, 1188, 1190, 1270, 1509, 1510, 1511, 1606, 451, 981, 1184, 1272, 1512, 1607, 1222, 1276, 1278, 1602, 1608, 1700, 1798, 1989, 2037, 1047, 1492, 1972, 447, 1268, 575, 2025, 978, 2034, 1298, 2023, 1380, 2007, 1846, 1416, 1847, 2066, 408, 1927, 1345, 1593, 649, 1251, 1991, 1387, 2401, 2403, 2405 ].indexOf(id) == -1) return false;
        if (filters.swordOrdeal && [ 77, 255, 308, 449, 455, 530, 639, 645, 677, 750, 914, 1033, 1081, 1125, 1129, 1173, 1182, 1186, 1188, 1175, 1230, 1234, 1236, 1238, 1276, 1278, 1322, 1324, 1410, 1436, 1481, 1534, 1536, 1573, 1575, 1577, 1654, 1614, 1796, 1753, 1800, 1759, 1881, 2505, 1873, 1875, 1877, 1921, 1989, 2001, 2242, 2306, 2031, 2034, 2080, 2082, 2332, 2185, 2189, 2117, 2119, 2107, 2336, 2338, 2346, 2372, 2338, 2371, 2418, 2465, 2475, 2477, 2479, 2481, 2483, 2485, 2496, 2498 ].indexOf(id) == -1) return false;
        if (filters.faceoffAA && [ 3324, 1126, 2771, 2769, 595, 1298, 1314, 1192, 1280, 1283, 1665, 1669, 1713, 1826, 1849, 1764, 2023, 2025, 2405, 2039, 2041, 32, 77, 232, 263, 306, 459, 530, 860, 804, 978, 1054, 1085, 1100, 1225, 1228, 1240, 1281, 1282, 1316, 1318, 1380, 1416, 1590, 1595, 1707, 1778, 1780, 1784, 1846, 1847, 1869, 1926, 1991, 1993, 2007, 2019, 2027, 2029, 2031, 2034, 2043, 2064, 2187, 2251, 2261, 2283, 2347, 2552, 5032, 5033, 5034, 5035, 3313, 2819, 5048, 5049, 5050, 5051, 34, 44, 59, 68, 228, 229, 230, 265, 268, 297, 298, 299, 353, 355, 724, 770, 771, 772, 773, 774, 775, 783, 804, 806, 840, 974, 976, 1051, 1072, 1102, 1104, 1106, 1135, 1223, 1224, 1230, 1232, 1234, 1236, 1238, 1264, 1279, 1320, 1322, 1324, 1382, 1392, 1397, 1399, 1417, 1418, 1423, 1469, 1696, 1715, 1729, 2053, 2068, 1983, 5000, 5001, 5002, 5003, 2189, 2330, 2332, 2334, 2389 ].indexOf(id) == -1) return false;
        if (filters.summerGirlsBlitz && [ 2626, 2624, 2622, 2620, 2631, 2603, 2601, 5164, 5165, 5166, 5167, 5172, 5173, 5174, 5175, 2588, 2561, 5148, 5149, 5150, 5151, 2628, 2434, 2076, 2338, 5076, 1951, 1747, 1473, 1445, 416, 4993, 2217, 2215, 2213, 2191, 2173, 1731, 1729, 1711, 1709, 1674, 1214, 1201, 1199, 1194, 1161, 686, 685, 683, 681, 662, 514 ].indexOf(id) == -1) return false;
        if (filters.summerGirlsBlitz2 && [ 3038, 3040, 3042, 3044, 3045, 3046, 3050, 4993, 514, 662, 681, 683, 685, 686, 1161, 1194, 1199, 1201, 1214, 1674, 1709, 1711, 1729, 1731, 2173, 2191, 2213, 2215, 2217, 2620, 2622, 2624, 2626, 2628, 2630, 2774, 2776, 2835, 2837, 2895, 3009 ].indexOf(id) == -1) return false;
        if (filters.summerGirlsBlitz3 && [ 3433, 3430, 3429, 3407, 3406, 3405, 3403, 3401, 3400, 3398, 3393, 3391, 3038, 3050, 3046, 3045, 3044, 3042, 3040, 2628, 2626, 2624, 2622, 2620, 2217, 2215, 2213, 2191, 2173, 1731, 1729, 1711, 1709, 1674, 1214, 1201, 1199, 1194, 1161, 686, 685, 683, 681, 514, 3435, 3431, 3434, 3436 ].indexOf(id) == -1) return false;
        if (filters.beastBlitz && [ 2840, 2802, 5195, 5196, 5197, 5198, 2812, 2810, 2808, 2806, 2792, 2789, 2787, 2780, 2778, 2776, 2774, 2709, 2707, 2782, 2785, 2815, 2813, 2904, 2905, 2906, 2907 ].indexOf(id) == -1) return false;
        if (filters.yonkoBlitz && [ 2734, 2736, 2735, 2738, 2557, 5140, 5141, 5142, 5143, 2347, 2019, 2007, 1707, 1380, 2536, 5093, 5094, 5095, 2500, 2473, 2381, 2109, 2700, 2387, 2690, 2197, 1268, 2302, 2504, 1980, 1016, 365, 2477, 1921, 2097, 2525, 2707, 2534, 5086, 5087, 5088, 5089, 1922, 2001, 1751, 2709, 2336, 1581, 2672, 1985, 5008, 5009, 5010, 5011, 1916, 2087, 2519, 2245, 2148, 2919, 5180, 5181, 5182, 5183, 1961, 2459, 2523, 314, 781, 1865, 312, 1043, 2609, 1982, 359, 882, 361, 1091, 1857, 1855, 310, 2729, 1867, 831, 357, 2111, 1690, 2152, 1963, 2457 ].indexOf(id) == -1) return false;
        if (filters.wapolAssault && [ 2362, 2676, 1889, 2704, 2745, 2304, 2365, 2446, 2577, 2603, 2672, 2181, 2798, 2797, 3381, 2369, 2371, 2794 ].indexOf(id) == -1) return false;
        if (filters.warlordBlitz && [ 227, 306, 750, 752, 754, 756, 760, 804, 806, 860, 865, 978, 1230, 1232, 1234, 1236, 1238, 1298, 1316, 1318, 1320, 1322, 1324, 1595, 1614, 1808, 1846, 1926, 1983, 5000, 5001, 5002, 5003, 5004, 1991, 1993, 2015, 2027, 2029, 2031, 2068, 2183, 2185, 2187, 2189, 2283, 2483, 2510, 2538, 2542, 2552, 5084, 5085, 5086, 5087, 5100, 5101, 5102, 5103, 5124, 5125, 5126, 5127, 2583, 2605, 2618, 5168, 5169, 5170, 5171, 2632, 2659, 2668, 2670, 2795, 5172, 5173, 5174, 5175, 2819, 5188, 5189, 5190, 5191, 2841, 2867, 5237, 5238, 5239, 2882, 2895, 5244, 5245, 5246, 5247, 2966, 2975, 3007, 3038, 3052, 3097, 3098, 5268, 5269, 5270, 5271, 3100, 3104, 3106, 3157, 3171, 3172, 3186, 3246, 3247, 3248, 3249, 1445, 1663, 1847, 1881, 2034, 2434, 2505, 2578, 2954, 2991, 3240, 2682, 2064, 1778, 3197 ].indexOf(id) == -1) return false;
        if (filters.garpFN && [ 3519, 3518, 3517, 3516, 3515, 3513, 3511, 3510, 3509, 3506, 3499, 3497, 3496, 3495, 3493, 3481, 3498, 3508, 3175, 2797 ].indexOf(id) == -1) return false;
        if (filters.navyBlitz && [ 3519, 3517, 3516, 3515, 3513, 3175 ].indexOf(id) == -1) return false;
        if (filters.retainersFN && [ 3553, 3555, 5401, 5402, 5403, 5404, 3558, 3557, 3556, 3550, 3551, 3559, 3543, 5393, 5394, 5395, 5396, 3536, 3534, 3532, 3519, 3430, 3391, 3545, 3544, 3540, 3546, 3547, 3548, 3549, 3538, 3537, 3539, 3531, 3503, 3502, 3385, 3083, 3388, 3387, 3523, 3350 ].indexOf(id) == -1) return false;
        if (filters.odenKaidoBlitz && [ 3555, 5401, 5402, 5403, 5404, 3553, 3556, 3557, 3558, 3560, 3559, 3551, 3550, 3519, 3175, 3391, 1310, 2487, 3502, 3503, 3382, 2785, 3504, 1660, 1861, 1338, 1658, 2813, 3385, 257, 979, 2778, 3083, 3269, 3388, 2577, 5148, 5149, 5150, 5051, 1733, 3536, 2908, 3534, 3506, 1776, 3496, 3329, 3217, 3222, 3350 ].indexOf(id) == -1) return false;
        if (filters.typoClass){
            var allClass = [ "Fighter", "Slasher", "Striker", "Shooter", "Free Spirit", "Powerhouse", "Cerebral", "Driven", "Evolver", "Booster" ];
            if (unit.class.length == 3) if(allClass.indexOf(unit.class[0][0]) != -1 && allClass.indexOf(unit.class[0][1]) != -1 && allClass.indexOf(unit.class[1][0]) != -1 && allClass.indexOf(unit.class[1][1]) != -1 && allClass.indexOf(unit.class[2][0]) != -1 && allClass.indexOf(unit.class[2][1]) != -1) return false;
            if (unit.class.length == 2) if(allClass.indexOf(unit.class[0]) != -1 && allClass.indexOf(unit.class[1]) != -1) return false;
            if(allClass.indexOf(unit.class) != -1) return false;
        }
        if (filters.dualUnits){
            //if (unit.class.length != 3) return false;
            if (window.details[unit.number+1]) { if (!Object.keys(window.details[unit.number+1]).includes("swap")) return false; }
            else return false
        }
        if (filters.vsUnits){
            //if (unit.class.length != 2 || unit.type.length != 2)  return false;
            if (window.details[unit.number+1]) { if (!Object.keys(window.details[unit.number+1]).includes("VSSpecial")) return false; }
            else return false
        }
        if (filters.superTypeUnits){
            //if (unit.class.length != 2 || unit.type.length != 2)  return false;
            if (window.details[unit.number+1]) { if (!Object.keys(window.details[unit.number+1]).includes("superSpecial")) return false; }
            else return false
        }
        if (filters.nodualUnits){
            if (unit.type.length == 2) return false;
        }
        if (filters.luffyvkatakuri){
            var evolved = !(id in window.evolutions);
            var character = window.families[unit.number+1];
            if(character) if(character.length == 2) var matching = [ "Capone Bege", "Charlotte Linlin", "Carrot", "Jinbe", "Vinsmoke Judge", "Vito", "Gotti", "Charlotte Smoothie", "Charlotte Daifuku", "Tamago", "Charlotte Amande", "Caesar Clown", "Aladdin", "Charlotte Praline", "Charlotte Perospero", "Charlotte Pudding", "Bobbin", "Charlotte Opera", "Charlotte Chiffon", "Wadatsumi", "Charlotte Cracker", "Pekoms", "Charlotte Brûlée", "Charlotte Oven", "Pedro" ].indexOf(character[0]) != -1 || [ "Capone Bege", "Charlotte Linlin", "Carrot", "Jinbe", "Vinsmoke Judge", "Vito", "Gotti", "Charlotte Smoothie", "Charlotte Daifuku", "Tamago", "Charlotte Amande", "Caesar Clown", "Aladdin", "Charlotte Praline", "Charlotte Perospero", "Charlotte Pudding", "Bobbin", "Charlotte Opera", "Charlotte Chiffon", "Wadatsumi", "Charlotte Cracker", "Pekoms", "Charlotte Brûlée", "Charlotte Oven", "Pedro" ].indexOf(character[1]) != -1;
            else var matching = [ "Capone Bege", "Charlotte Linlin", "Carrot", "Jinbe", "Vinsmoke Judge", "Vito", "Gotti", "Charlotte Smoothie", "Charlotte Daifuku", "Tamago", "Charlotte Amande", "Caesar Clown", "Aladdin", "Charlotte Praline", "Charlotte Perospero", "Charlotte Pudding", "Bobbin", "Charlotte Opera", "Charlotte Chiffon", "Wadatsumi", "Charlotte Cracker", "Pekoms", "Charlotte Brûlée", "Charlotte Oven", "Pedro" ].indexOf(character) != -1;
            if(character) if(character.length == 2) var matching2 = [ "Charlotte Katakuri", "Charlotte Flampe", "Charlotte Mont-d'Or", "Streusen" ].indexOf(character[0]) != -1 || [ "Charlotte Katakuri", "Charlotte Flampe", "Charlotte Mont-d'Or", "Streusen" ].indexOf(character[1]) != -1;
            else var matching2 = [ "Charlotte Katakuri", "Charlotte Flampe", "Charlotte Mont-d'Or", "Streusen" ].indexOf(character) != -1;
            var criteria = unit.stars >= 4 && unit.maxLevel == 99;
            var specific = [ 2245, 2148, 1815, 2236, 2080, 2076, 2089, 2072, 2093, 2074, 2363, 2382 ].indexOf(id) != -1;
            if (!((matching2 && evolved) || (matching && criteria) || specific)) return false;
        }
        if (filters.doffyBlitz){
            var character = window.families[unit.number+1];
            var matching = [ "Monkey D. Luffy", "Roronoa Zoro", "Franky", "Nico Robin", "Usopp", "Trafalgar Law", "Bartolomeo", "Cavendish", "Rob Lucci", "Sabo", "Boa Sandersonia", "Boa Marigold", "Boa Hancock", "Marguerite", "Leo", "Don Sai", "Don Chinjao", "Ideo", "Blue Gilly", "Suleiman", "Mansherry", "Ricky", "Kyros", "Funk Brothers", "Hajrudin", "Abdullah and Jeet", "Orlumbus", "Elizabello", "Bepo", "Sabo", "Dagama", "Jesus Burgess", "Diamante" ].indexOf(character) != -1;
            var Katacount = 0;
            var Kataclass = [ "Slasher", "Striker", "Shooter", "Powerhouse" ];
            if (!Array.isArray(unit.class[0])){ for(var i = 0; i < Kataclass.length; i++) if(unit.class.indexOf(Kataclass[i]) != -1) Katacount++; }
            else for(var i = 0; i < Kataclass.length; i++) if(unit.class[2].indexOf(Kataclass[i]) != -1) Katacount++;
            if (Katacount !== 2) return false;
            else if (!matching) return false;
        }
        if (filters.katakuri){
            var Katacount = 0; var Katacount1 = 0; var Katacount2 = 0; var Katacount3 = 0;
            var Kataclass = [ "Fighter", "Striker", "Shooter", "Cerebral", "Powerhouse" ];
            if (!Array.isArray(unit.class[0])){ for(var i = 0; i < Kataclass.length; i++) if(unit.class.indexOf(Kataclass[i]) != -1) Katacount++; }
            else {
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[0].indexOf(Kataclass[i]) != -1) { Katacount1++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[1].indexOf(Kataclass[i]) != -1) { Katacount2++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[2]) if(unit.class[2].indexOf(Kataclass[i]) != -1) { Katacount3++; }
            }
            if (Katacount !== 2 && Katacount1 !== 2 && Katacount2 !== 2 && Katacount3 !== 2) return false;
        }
        if (filters.katakuriplus){
            var Katacount = 0; var Katacount1 = 0; var Katacount2 = 0; var Katacount3 = 0;
            var Kataclass = [ "Slasher", "Striker", "Driven", "Cerebral", "Powerhouse" ];
            if (!Array.isArray(unit.class[0])){ for(var i = 0; i < Kataclass.length; i++) if(unit.class.indexOf(Kataclass[i]) != -1) Katacount++; }
            else {
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[0].indexOf(Kataclass[i]) != -1) { Katacount1++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[1].indexOf(Kataclass[i]) != -1) { Katacount2++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[2]) if(unit.class[2].indexOf(Kataclass[i]) != -1) { Katacount3++; }
            }
            if (Katacount !== 2 && Katacount1 !== 2 && Katacount2 !== 2 && Katacount3 !== 2) return false;
        }
        if (filters.katakuriv2){
            var Katacount = 0; var Katacount1 = 0; var Katacount2 = 0; var Katacount3 = 0;
            var Kataclass = [ "Fighter", "Slasher", "Shooter", "Driven", "Powerhouse" ];
            if (!Array.isArray(unit.class[0])){ for(var i = 0; i < Kataclass.length; i++) if(unit.class.indexOf(Kataclass[i]) != -1) Katacount++; }
            else {
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[0].indexOf(Kataclass[i]) != -1) { Katacount1++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[1].indexOf(Kataclass[i]) != -1) { Katacount2++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[2]) if(unit.class[2].indexOf(Kataclass[i]) != -1) { Katacount3++; }
            }
            if (Katacount !== 2 && Katacount1 !== 2 && Katacount2 !== 2 && Katacount3 !== 2) return false;
        }
        if (filters.TMlaw){
            var Katacount = 0; var Katacount1 = 0; var Katacount2 = 0; var Katacount3 = 0;
            var Kataclass = [ "Fighter", "Slasher", "Cerebral", "Free Spirit" ];
            if (!Array.isArray(unit.class[0])){ for(var i = 0; i < Kataclass.length; i++) if(unit.class.indexOf(Kataclass[i]) != -1) Katacount++; }
            else {
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[0].indexOf(Kataclass[i]) != -1) { Katacount1++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[1].indexOf(Kataclass[i]) != -1) { Katacount2++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[2]) if(unit.class[2].indexOf(Kataclass[i]) != -1) { Katacount3++; }
            }
            if (Katacount !== 2 && Katacount1 !== 2 && Katacount2 !== 2 && Katacount3 !== 2) return false;
        }
        if (filters.sulongCarrot){
            var Katacount = 0; var Katacount1 = 0; var Katacount2 = 0; var Katacount3 = 0;
            var Kataclass = [ "Fighter", "Slasher", "Striker", "Shooter", "Cerebral" ];
            if (!Array.isArray(unit.class[0])){ for(var i = 0; i < Kataclass.length; i++) if(unit.class.indexOf(Kataclass[i]) != -1) Katacount++; }
            else {
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[0].indexOf(Kataclass[i]) != -1) { Katacount1++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[1].indexOf(Kataclass[i]) != -1) { Katacount2++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[2]) if(unit.class[2].indexOf(Kataclass[i]) != -1) { Katacount3++; }
            }
            if (Katacount !== 2 && Katacount1 !== 2 && Katacount2 !== 2 && Katacount3 !== 2) return false;
        }
        if (filters.carrotwanda){
            var Katacount = 0; var Katacount1 = 0; var Katacount2 = 0; var Katacount3 = 0;
            var Kataclass = [ "Fighter", "Slasher", "Striker", "Cerebral", "Powerhouse" ];
            if (!Array.isArray(unit.class[0])){ for(var i = 0; i < Kataclass.length; i++) if(unit.class.indexOf(Kataclass[i]) != -1) Katacount++; }
            else {
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[0].indexOf(Kataclass[i]) != -1) { Katacount1++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[1].indexOf(Kataclass[i]) != -1) { Katacount2++; }
                for(var i = 0; i < Kataclass.length; i++) if(unit.class[2]) if(unit.class[2].indexOf(Kataclass[i]) != -1) { Katacount3++; }
            }
            if (Katacount !== 2 && Katacount1 !== 2 && Katacount2 !== 2 && Katacount3 !== 2) return false;
        }
        if (filters.noFodder && Utils.isFodder(unit)) return false;
        if (filters.noFortnights && flags.fnonly) return false;
        if (filters.noRaids && flags.raid) return false;
        if (filters.noSpecials && (flags.lrr || flags.promo || flags.special || flags.shop )) return false;
        // filter by server
        if (filters.server) {
            if (filters.server == 'Global units' && !flags.global) return false;
            if (filters.server !== 'Global units' && flags.global) return false;
        }
        // filter by rr pool
        if ((filters.rr === 'Not in RR pool' && flags.rr) || (filters.rr === 'In RR pool' && !flags.rr)) return false;
        //filter by farmable Sockets
        if (filters.socket){
            var farmableSocket = CharUtils.hasFarmableSocket(unit.number);
            if ((filters.socket === 'No Farmable Sockets' && farmableSocket) || (filters.socket === 'Farmable Sockets' && !farmableSocket)) return false;
        }

        // filter by inkable flag
        if (filters.inkable) {            
            if (filters.inkable == 'Inkable' && !flags.inkable) return false;
            if (filters.inkable == 'Not Inkable' && flags.inkable) return false;
        }

        // filter by active matchers
        if (filters.custom.length > 0 && !window.details.hasOwnProperty(id)) return false;
        for (var i=0;i<filters.custom.length;++i) {
            if (!CharUtils.checkMatcher(filters.custom[i], id))
                return false;
        }
        // filter by character log
        if (filters.noLog && characterLog.hasOwnProperty(id)) return false;
        if (filters.noMissing && !characterLog.hasOwnProperty(id)) return false;
        // filter by orb controllers
        if ($rootScope.filters.custom[MATCHER_IDS['special.OrbControllers']] &&
                ((tableData.parameters.filters.ctrlFrom && tableData.parameters.filters.ctrlFrom.length > 0) || (tableData.parameters.filters.ctrlTo && tableData.parameters.filters.ctrlTo.length > 0))) {
            var orbData = CharUtils.getOrbControllerData(id);
            if (!orbData) return false;
            var from = tableData.parameters.filters.ctrlFrom || [ ], to = tableData.parameters.filters.ctrlTo || [ ];
            var mismatch = true;
            if (from.length && !to.length)
                mismatch = from.some(function(x) { return !orbData.from.hasOwnProperty(x); });
            else if (!from.length && to.length)
                mismatch = to.some(function(x) { return !orbData.to.hasOwnProperty(x); });
            else {
                mismatch = from.some(function(f) {
                    return to.some(function(t) { return !orbData.map[f] || !orbData.map[f].hasOwnProperty(t); });
                });
            }
            if (mismatch) return false;
        }
        // filter by class-filters
        if ($rootScope.filters.custom[MATCHER_IDS['captain.ClassBoostingCaptains']] && filters.classCaptain &&
                !CharUtils.isClassBooster('captain', id, filters.classCaptain)) return false;
        if ($rootScope.filters.custom[MATCHER_IDS['special.ClassBoostingSpecials']] && filters.classSpecial &&
                !CharUtils.isClassBooster('special', id, filters.classSpecial)) return false;
        if ($rootScope.filters.custom[MATCHER_IDS['sailor.ClassBoostingSailors']] && filters.classSailor &&
                !CharUtils.isClassBooster('sailor', id, filters.classSailor)) return false;
        if ($rootScope.filters.custom[MATCHER_IDS['sailor.ClassBoostingSupports']] && filters.classSupport &&
                !CharUtils.isClassBooster('support', id, filters.classSupport)) return false;
        return true;
    };

    /*****************
     * Table sorting *
     *****************/

    jQuery.fn.dataTable.ext.type.order['num-string-asc'] = function(x,y) {
        if (x && x.constructor == String) x = (x == 'Unknown' ? 100 : 101);
        if (y && y.constructor == String) y = (y == 'Unknown' ? 100 : 101);
        return x - y;
    };

    jQuery.fn.dataTable.ext.type.order['num-string-desc'] = function(x,y) {
        if (x && x.constructor == String) x = (x == 'Unknown' ? -100 : -101);
        if (y && y.constructor == String) y = (y == 'Unknown' ? -100 : -101);
        return y - x;
    };

    /***********************
     * Table configuration *
     ***********************/

    var data = window.units.filter(function(x) { return x.name && !x.name.includes("VS Unit") && !x.name.includes("Dual Unit"); }).map(function(x,n) {
        var result = [
            ('000' + (x.number+1)).slice(-padding),
            x.name,
            x.type,

        x.class.constructor == Array ? x.class.join(', ') : x.class,
            x.maxHP,
            x.maxATK,
            x.maxRCV,
            x.cost,
            x.slots,
            x.stars,
            '',
            x.number
        ];
        additionalColumns.forEach(function(c,n) {
            var temp = 0;
            if (c == 'HP/ATK') temp = Math.round(x.maxHP / x.maxATK * 100) / 100;
            else if (c == 'HP/RCV') temp = Math.round(x.maxHP / x.maxRCV * 100) / 100;
            else if (c == 'ATK/RCV') temp = Math.round(x.maxATK / x.maxRCV * 100) / 100;
            else if (c == 'ATK/CMB') temp = Math.round(x.maxATK / x.combo * 100) / 100;
            else if (c == 'ATK/cost') temp = Math.round(x.maxATK / x.cost * 100) / 100;
            else if (c == 'HP/cost') temp = Math.round(x.maxHP / x.cost * 100) / 100;
            else if (c == 'CMB') temp = x.combo;
            else if (c == 'MAX EXP') temp = x.maxEXP;
            else if (c == 'Limit Break HP') temp = x.limitHP;
            else if (c == 'Limit Break ATK') temp = x.limitATK;
            else if (c == 'Limit Break RCV') temp = x.limitRCV;
            else if (c == 'Limit Break: Expansion HP') temp = x.limitexHP;
            else if (c == 'Limit Break: Expansion ATK') temp = x.limitexATK;
            else if (c == 'Limit Break: Expansion RCV') temp = x.limitexRCV;
            else if (c == 'Limit Break Slots') temp = x.limitSlot;
            else if (c == 'Minimum cooldown' || c == 'Initial cooldown') {
                var d = cooldowns[x.number];
                if (!d) temp = 'N/A';
                else if (c == 'Minimum cooldown' && d.constructor == Array) temp = d[1];
                else if (c == 'Initial cooldown') temp = (d.constructor == Array ? d[0] : d);
                else temp = 'Unknown';
            }
            else if (c == 'Minimum Limit Break cooldown' || c == 'Initial Limit Break cooldown') {
                var d = cooldowns[x.number];
                if (!d) temp = 'N/A';
                else if (c == 'Minimum Limit Break cooldown' && d.constructor == Array) temp = (d[1] - x.limitCD);
                else if (c == 'Initial Limit Break cooldown') temp = (d.constructor == Array ? (d[0] - x.limitCD) : (d - x.limitCD));
                else temp = 'Unknown';
            }
            else if (c == 'Minimum Limit Break Expansion cooldown' || c == 'Initial Limit Break Expansion cooldown') {
                var d = cooldowns[x.number];
                if (!d) temp = 'N/A';
                else if (c == 'Minimum Limit Break Expansion cooldown' && d.constructor == Array) temp = (d[1] - x.limitexCD);
                else if (c == 'Initial Limit Break Expansion cooldown') temp = (d.constructor == Array ? (d[0] - x.limitexCD) : (d - x.limitexCD));
                else temp = 'Unknown';
            }
            if (temp && temp.constructor != String && !isNaN(temp) && !isFinite(temp)) temp = '&#8734;';
            if (temp && temp.constructor != String && isNaN(temp)) temp = 0;
            result.splice(result.length-2, 0, temp);
        });
        return result;
    });

    tableData = {
        columns: getTableColumns(),
        additional: additionalColumns.length,
        data: data,
        parameters: null,
        fuzzy: $storage.get('fuzzy', false),
        regexes: { },
    };

    $rootScope.table = tableData;

    $rootScope.characterLog = characterLog;
    $rootScope.showLogFilters = log.length > 0;

    $timeout(function() {
        jQuery.fn.dataTable.ext.search.push(tableFilter);
        var types = { Story: 'Story Island', Fortnight: 'Fortnight', Raid: 'Raid', Coliseum: 'Coliseum', Arena: 'Arena', Treasuremap: 'Treasure Map', Ambush: 'Ambush', Kizuna: 'Kizuna Clash', Piraterumble: 'Pirate Rumble' };
        $rootScope.$watch('table',function(table) {
            tableData = table;
            if (table.parameters && table.parameters.filters && table.parameters.filters.farmable) {
                var filters = table.parameters.filters.farmable;
                farmableLocations = { };
                for (var key in types) {
                    if (filters.hasOwnProperty(key) && filters[key] !== null)
                        farmableLocations[types[key]] = filters[key];
                }
                if (Object.keys(farmableLocations).length === 0)
                    farmableLocations = null;
            } else farmableLocations = null;
            if (table.refresh) table.refresh();
        },true);
    });

    $rootScope.$on('table.refresh',function() {
        fused = null;
        /*var types = {
        'STR' : '<span class="cell-STR">STR</span>',
        'DEX' : '<span class="cell-DEX">DEX</span>',
        'QCK' : '<span class="cell-QCK">QCK</span>',
        'PSY' : '<span class="cell-PSY">PSY</span>',
        'INT' : '<span class="cell-INT">INT</span>'};
        $.each(types,function(i,type1){
            $.each(types,function(j,type2){
            if(i == j) return;
            $('.cell-'+i+'\\/'+j).html(type1 +'/'+type2);
          });
        });*/
    });

    $rootScope.checkLog = function() {
        var temp = [ ];
        for (var key in $rootScope.characterLog) {
            if ($rootScope.characterLog[key])
                temp.push(parseInt(key,10));
        }
        temp.sort(function(a,b) { return a-b; });
        $storage.set('characterLog', temp);
        $rootScope.showLogFilters = temp.length > 0;
    };

});

})();
