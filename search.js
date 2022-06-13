var routeList;
var stopList;
var routeStopList;

var current_route;
var current_bound;
var current_service_type;

$(function () {
    Promise.all([
        $.ajax({ url: 'https://data.etabus.gov.hk/v1/transport/kmb/route/', type: 'GET' }),
        $.ajax({ url: 'https://data.etabus.gov.hk/v1/transport/kmb/stop/', type: 'GET' }),
        $.ajax({ url: 'https://data.etabus.gov.hk/v1/transport/kmb/route-stop', type: 'GET' })
    ]).then((data) => {
        routeList = data[0];
        stopList = data[1];
        routeStopList = data[2];
        drawRouteTable();

        $('#busRoute').keyup(function () {
            keyupRouteInputEvent($(this).val().toUpperCase())
        });

        setInterval(function () {
            if (current_route != null && current_bound != null && current_service_type != null) {
                getRouteEtaList(current_route, current_bound, current_service_type);
            }
        }, 5000);

    }, (err) => {
        alert(err);
    });
});



function drawRouteTable(inputRouteList) {
    if (inputRouteList == null) {
        inputRouteList = routeList;
    }
    var routeTbody = $('#routeTable tbody');
    routeTbody.empty();
    var rowClass = 'table-primary';
    inputRouteList.data.forEach(function (routeListDataObj) {
        var row = $('<tr>').addClass(rowClass)
            .append($('<td>').text(routeListDataObj.route)
                .append($('<input />').val(routeListDataObj.bound).addClass('d-none bound'))
                .append($('<input />').val(routeListDataObj.service_type).addClass('d-none service_type')))
            .append($('<td>').text(routeListDataObj.dest_tc));
        routeTbody.append(row);
        rowClass = rowClass == 'table-primary' ? 'table-light' : 'table-primary';
    });

    $('#routeTable tbody tr').click(function () {
        var td = $(this).find('td:first-child');
        var route = td.text();
        var bound = td.find('.bound').val();
        var service_type = td.find('.service_type').val();

        current_route = route;
        current_bound = bound;
        current_service_type = service_type;

        getRouteEtaList(route, bound, service_type);
        //$('#goToEtaTable')[0].click();
    });
}

function keyupRouteInputEvent(routeInput) {
    var inputRoute = {
        data: routeList.data.filter(routeDataObj => routeDataObj.route.startsWith(routeInput))
    };
    drawRouteTable(inputRoute);
}

function getRouteEtaList(route, bound, service_type) {
    Promise.all([
        $.ajax({ url: `https://data.etabus.gov.hk/v1/transport/kmb/route-eta/${route}/${service_type}/`, type: 'GET' }),
    ]).then((data) => {
        routeEtaList = data[0];
        var selectedRouteEtaList = {
            data: routeStopList.data.filter(routeStop => routeStop.route == route && routeStop.bound == bound && routeStop.service_type == service_type)
        };
        selectedRouteEtaList.data.forEach(function (routeStopData) {
            selectStop = stopList.data.filter(stopInfo => stopInfo.stop == routeStopData.stop);
            routeStopData.stop_name = selectStop[0].name_tc;
            routeStopData.etaList = routeEtaList.data.filter(etaInfo => etaInfo.route == route && etaInfo.dir == bound && etaInfo.service_type == service_type && etaInfo.seq == routeStopData.seq);
        });

        drawEtaTable(selectedRouteEtaList);
    }, (err) => {
        alert(err);
    });
}

function drawEtaTable(selectedRouteEtaList) {
    var etaTbody = $('#etaTable tbody');
    etaTbody.empty();
    var rowClass = 'table-primary';
    selectedRouteEtaList.data.forEach(function (routeEtaObj) {
        var row = $('<tr>').addClass(rowClass)
            .append($('<td>').text(routeEtaObj.stop_name))
            .append($('<td>').html(formatTime(routeEtaObj.etaList)));
        etaTbody.append(row);
        rowClass = rowClass == 'table-primary' ? 'table-light' : 'table-primary';
    });
}

function formatTime(etaList) {
    var etaResultList = [];
    etaList.forEach(function (etaObj) {
        var etaTimestamp = Date.parse(etaObj.eta);
        var nowTimestamp = Date.parse(new Date());
        var remainSecond = (etaTimestamp - nowTimestamp) / 1000;
        remainSecond = remainSecond < 0 ? 0 : remainSecond;
        var remainMinute = Math.floor(remainSecond / 60);
        remainSecond = remainSecond % 60;

        var etaDatetime = new Date(etaTimestamp);
        var hour = ('0' + etaDatetime.getHours()).slice(-2);
        var minute = ('0' + etaDatetime.getMinutes()).slice(-2);
        var second = ('0' + etaDatetime.getSeconds()).slice(-2);
        remainMinute = ('0' + remainMinute).slice(-2);
        remainSecond = ('0' + remainSecond).slice(-2);

        etaResultList.push(`${hour}:${minute}:${second} (${remainMinute}:${remainSecond})`);
    });
    return etaResultList.join('<br>');
}
