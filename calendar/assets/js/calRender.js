(function() {
    function createFortnightEvent(eventArray) {
        fortnightEvents.forEach(function(e) {
            var res = {};

            var eId = e['id'];

            if (Array.isArray(eId)) {
                res['id'] = eId.slice();
                res['thumb'] = [];

                for (var i = 0; i < eId.length; i++) {
                    var eFn = fortnights[eId[i]];
                    res['thumb'].push(eFn['thumb']);
                }
            } else {
                var fn = fortnights[eId];
                res['id'] = eId;
                res['title'] = '『FN』\n' + fn['name'];
                res['thumb'] = fn['thumb'];
            }

            if (e['ranking'])
                res['ranking'] = fortnights[e['ranking']]['thumb'];

            res['type'] = 'fortnight';

            var start = e['start'];
            if (e['is_replay'])
                start += ' 01:30';
            else
                start += ' 01:00';
            res['start'] = start;
            res['end'] = e['end'];

            var opacity = e['is_replay'] ? 0.3 : 0.6;
            res['color'] = 'rgba(255, 0, 0, ' + opacity + ')';
            res['textColor'] = 'black';

            eventArray.push(res);
        });
    }

    function createRaidEvent(eventArray) {
        raidEvents.forEach(function(e) {
            var res = {};

            var eId = e['id'];

            if (Array.isArray(eId)) {
                res['id'] = eId.slice();
                res['thumb'] = [];

                for (var i = 0; i < eId.length; i++) {
                    var eRd = raids[eId[i]];
                    res['thumb'].push(eRd['thumb']);
                }
            } else {
                var rd = raids[eId];
                res['id'] = eId;
                res['title'] = '『RD』\n' + rd['name'];
                res['thumb'] = rd['thumb'];
            }

            if (e['ambush']) {
                res['ambush'] = e['ambush'];
                createAmbushEvent(eventArray, e['ambush'], e['start'], e['end'], 'raid');
            }

            res['type'] = 'raid';

            var start = e['start'];
            start += ' 05:00';
            res['start'] = start;
            if (e['end'])
                res['end'] = e['end'];

            res['color'] = 'rgba(60, 179, 113, 0.6)';
            res['textColor'] = 'black';

            eventArray.push(res);
        });
    }

    function createColiseumEvent(eventArray) {
        coliseumEvents.forEach(function(e) {
            var res = {};

            res['thumb'] = [];

            var newId = e['newId'];
            for (var i = 0; i < newId.length; i++) {
                var newColi = coliseums[newId[i]];
                res['thumb'].push(newColi['thumb']);
            }

            var repId = e['repId'];
            for (var i = 0; i < repId.length; i++) {
                var repColi = coliseums[repId[i]];
                res['thumb'].push(repColi['thumb']);
            }

            if (e['ambush']) {
                res['ambush'] = e['ambush'];
                createAmbushEvent(eventArray, e['ambush'], e['start'], e['end'], 'coliseum');
            }


            res['id'] = newId.concat(repId);

            res['type'] = 'coliseum';

            var start = e['start'];
            start += ' 03:00';
            res['start'] = start;
            if (e['end'])
                res['end'] = e['end'];

            var opacity = e['new_batch'] ? 0.6 : 0.3;
            res['color'] = 'rgba(0, 0, 255, ' + opacity + ')';

            eventArray.push(res);
        });
    }

    function createAmbushEvent(eventArray, id, start, end, src) {
        var res = {};

        var ambush = ambushes[id];

        res['id'] = id;
        res['title'] = ambush['name'];
        res['thumb'] = ambush['thumb'];

        if (end)
            res['end'] = end;

        if ('raid' === src) {
            res['type'] = 'raidAmbush';
            res['color'] = 'rgba(60, 179, 113, 0.6)';

            start += ' 06:00';
            res['start'] = start;
        } else {
            res['type'] = 'coliAmbush';
            res['color'] = 'rgba(0, 0, 255, 0.6)';

            start += ' 04:00';
            res['start'] = start;
        }

        res['textColor'] = 'black';

        eventArray.push(res);
    }

    function createSpecialEvent(eventArray) {
        specialEvents.forEach(function(e) {
            var res = {};

            var id = e['id'];

            if ('dummy' === id) {
                res['color'] = 'rgba(255, 255, 255, 0)';
                res['textColor'] = 'rgba(255, 255, 255, 0)';
            } else {
                var sp = specials[id];

                var title = '『' + sp['type'] + '』';
                title += '\n' + sp['name'];

                res['title'] = title;

                res['thumb'] = sp['thumb'];

                res['color'] = 'rgba(75, 0, 130, 0.6)';
                res['textColor'] = 'black';

                res['subType'] = sp['type'];
            }

            res['id'] = id;

            res['type'] = 'special';

            var start = e['start'];
            start += ' 02:00';
            res['start'] = start;
            if (e['end'])
                res['end'] = e['end'];

            eventArray.push(res);
        });
    }

    function createSpecialBgEvent(eventArray) {
        specialBgEvents.forEach(function(e) {
            var res = {};

            var id = e['id'];
            var sbge = specials_bg[id];

            res['thumb'] = sbge['thumb'];
            res['type'] = 'event';

            res['start'] = e['start'];
            res['end'] = e['end'];

            res['color'] = 'rgba(0, 0, 0, 0)';
            res['rendering'] = 'background';

            eventArray.push(res);
        });
    }

    function getThumb(thumbId) {
        return 'https://onepiece-treasurecruise.com/wp-content/uploads/f' + thumbId + '.png';
    }

    function createUrlHtml(url, text) {
        var urlHtml = $('<a></a>');
        urlHtml.attr('href', url);
        urlHtml.attr('target', '_blank');
        urlHtml.text(text);

        return urlHtml;
    }

    function createImgHtml(imgSrc, size, floatLeft) {
        var imgHtml = $('<img></img>');
        imgHtml.attr('src', imgSrc);
        imgHtml.attr('height', size);
        imgHtml.attr('width', size);

        if (floatLeft)
            imgHtml.css('float', 'left');

        return imgHtml;
    }

    function createListItem(ed, liClass, url, liId, urlText) {
        var li = ed.find(liClass);
        var liUrl = url + liId;

        li.find('.url').html(createUrlHtml(liUrl, urlText));
        li.show();
    }

    function getEventDetail(e) {
        var ids = [];

        if (Array.isArray(e['id']))
            ids = e['id'].slice();
        else
            ids.push(e['id']);

        if (e['ambush'])
            ids.push(e['ambush']);

        for (var i = 0; i < ids.length; i++) {
            var ed = $('#eventDetailClone').clone();
            var id = ids[i];
            ed.attr('id', "eventDetail_" + id);

            var data;
            if (e['type'] === 'fortnight')
                data = fortnights[id];
            else if (e['type'] === 'raid')
                data = raids[id];
            else if (e['type'] === 'coliseum')
                data = coliseums[id];
            else if (e['type'] === 'special')
                data = specials[id];

            if (e['ambush'] && !data)
                data = ambushes[id];

            ed.find('.eventThumb').html(createImgHtml(getThumb(data['thumb']), 50, false));
            ed.find('.eventTitle').text(data['name']);

            if (drops[id])
                createListItem(ed, '.dropList', 'http://optc-db.github.io/drops/?', drops[id], 'Drop List');

            if (gw[id])
                createListItem(ed, '.gamewith', 'https://トレクル.gamewith.jp/article/show/', gw[id], 'Gamewith Stage Guide');

            if (sd[id])
                createListItem(ed, '.sevenDays', 'https://youtu.be/', sd[id], '7 Days YouTube Stage Guide');

            if (wiki[id])
                createListItem(ed, '.redditWiki', 'https://www.reddit.com/r/OnePieceTC/', wiki[id], 'Reddit Stage Guide Wiki');

            if (videoWiki[id])
                createListItem(ed, '.redditVideoWiki', 'https://www.reddit.com/r/OnePieceTC/wiki/video/', videoWiki[id], 'Reddit Video Wiki');

            $('#eventDetail').append(ed);
            ed.show();
        }

        var modalCloseButton = $('#modalCloseButton').clone();
        $('#eventDetail').append(modalCloseButton);
        $(modalCloseButton).show();
    }

    $(document).ready(function() {
        var eventArray = [];

        createFortnightEvent(eventArray);
        createRaidEvent(eventArray);
        createColiseumEvent(eventArray);
        createSpecialEvent(eventArray);
        createSpecialBgEvent(eventArray);

        // Permanent Mihawk
        var mihawk = {
            'thumb': 'mihawk',
            'type': 'event',
            'color': 'rgba(0, 0, 0, 0)',
            'rendering': 'background',
            'permaStart': '2017-06-08',
            'dow': [5, 6]
        }
        eventArray.push(mihawk);

        $('#calendar').fullCalendar({
            header: {
                left: 'prev,next today',
                center: 'title',
                right: 'month,basicTwo'
            },
            viewRender: function(view, element) {
                if (screen.width < 768) {
                    $('#mobile-info').show();

                    if (view.name === 'basicTwo') {
                        $('#calendar').fullCalendar('option', 'contentHeight', 400);
                        $('#vp').attr('content', 'width=device-width, initial-scale=1.0');
                        $('#calendar').width('300.6px');
                    } else {
                        $('#calendar').fullCalendar('option', 'contentHeight', null);
                        $('#vp').attr('content', '');
                        $('#calendar').width('1052.1px');
                    }
                } else {
                    var twoDayButton = $('.fc-basicTwo-button');

                    twoDayButton.prop('disabled', true);
                    twoDayButton.addClass('fc-state-disabled');
                }
            },
            views: {
                basicTwo: {
                    type: 'basic',
                    duration: {
                        days: 2
                    },
                    buttonText: '2-day'
                }
            },
            aspectRatio: 0.55,
            events: eventArray,
            eventRender: function(event, element) {
                if (event['type'] === 'fortnight' || event['type'] === 'raid' || (event['type'] === 'special' && event['id'] !== 'dummy')) {
                    var thumbArray = [];
                    if (Array.isArray(event['thumb']))
                        thumbArray = event['thumb'].slice();
                    else
                        thumbArray.push(event['thumb']);

                    for (var i = 0; i < thumbArray.length; i++)
                        element.find('.fc-title').before(createImgHtml(getThumb(thumbArray[i]), 30, true));

                    if (event['type'] === 'fortnight' && event['ranking']) {
                        var imgHtml = createImgHtml(getThumb(event['ranking']), 20, false);
                        element.find('.fc-title').html(imgHtml);
                        element.find('.fc-title').after('<i class="fa fa-trophy fa-lg"></i>');
                    }
                } else if (event['type'] === 'coliseum') {
                    for (var i = 0; i < event['thumb'].length; i++) {
                        if (coliseums[event['id'][i]].chaos_only)
                            element.find('.fc-title').before(createImgHtml(getThumb(event['thumb'][i]), 30, true));
                        else
                            element.find('.fc-title').before(createImgHtml(getThumb(event['thumb'][i]), 20, true));
                    }
                } else if (event['type'] === 'raidAmbush' || event['type'] === 'coliAmbush') {
                    element.find('.fc-title').before(createImgHtml(getThumb(event['thumb']), 15, true));
                } else {
                    element.closest('.fc-bgevent').css('background-image', 'url("assets/img/' + event['thumb'] + '.png")');
                }

                if (event['permaStart'])
                    return event['start'].isAfter(event['permaStart']);
            },
            eventClick: function(event) {
                if (event['type'] === 'fortnight'
                    || event['type'] === 'raid'
                    || event['type'] === 'coliseum'
                    || (event['type'] === 'special' && event['subType'] === 'Battle Royale')
                ) {
                    $('#eventDetail').empty();
                    getEventDetail(event);
                    $('#eventDetailModal').modal();
                }
            },
            eventOrder: function(a, b) {
                if (Array.isArray(a.id))
                    return 1;
                if (Array.isArray(b.id))
                    return -1;

                return a.id < b.id ? -1 : 1;
            },
            displayEventTime: false,
            defaultDate: moment().subtract(1, 'days')
        });

        // Auto change to 2-day view when on mobile
        if (screen.width < 768)
            $('#calendar').fullCalendar('changeView', 'basicTwo');

        // Swipe left/right for next/prev
        var hm = new Hammer(document.getElementById('calendar'));
        hm.on('swipeleft', function(ev) {
            $('#calendar').fullCalendar('next');
        });
        hm.on('swiperight', function(ev) {
            $('#calendar').fullCalendar('prev');
        });
    });
}) ();
