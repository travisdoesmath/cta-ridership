let globals = {};

function getLines(d) {
    let lines = [];
    if (d.BLUE) lines.push('#00a1de')
    if (d.RED) lines.push('#c60c30')
    if (d.BRN) lines.push('#62361b')
    if (d.G) lines.push('#009b3a')
    if (d.O) lines.push('#f9461c')
    if (d.P || d.Pexp) lines.push('#522398')
    if (d.Pnk) lines.push('#e27ea6')
    if (d.Y) lines.push('#f9e300')

    return lines;
}

let tableConfig = {
    width: 800,
    height: 500,
    sort: {
        'column':'station-name',
        'direction':'descending'
    },
    columns: [
        {
            id: 'station-name',
            name: 'Name',
            type: 'indicators',
            data: x => {
                let lines = getLines(x)
                return {
                    name: x.name,
                    indicators: lines
                }
            },
            width: 160,
            sortable: true,
            sortComparators: {
                'ascending': (a, b) => a.name.localeCompare(b.name),
                'descending': (a, b) => b.name.localeCompare(a.name)
            },
            sortCycle: ['ascending','descending']
        },
        {
            id: 'rides-distribution',
            name: 'Daily Rides Dist. & Average',
            type: 'spark-boxplot',
            data: x => { 
                return {
                    'q1': x.rides_q1,
                    'median': x.rides_median,
                    'mean': x.rides_mean,
                    'q3': x.rides_q3,
                }
            },
            labelFormat: x => x.toLocaleString(undefined, {maximumFractionDigits: 0}),
            width: 152,
            sortable: true,
            sortComparators: {
                'ascending': (a, b) => a.rides_median - b.rides_median,
                'descending': (a, b) => b.rides_median - a.rides_median,
            },
            sortCycle: ['ascending','descending']
        },
        {
            id: 'rides-by-weekday',
            name: 'Percent of Rides by Weekday',
            type: 'bar',
            data: x => {
                return [
                    {'x':'Sunday','y': x.rides_sunday},
                    {'x':'Monday','y': x.rides_monday},
                    {'x':'Tuesday','y': x.rides_tuesday},
                    {'x':'Wednesday','y': x.rides_wednesday},
                    {'x':'Thursday','y': x.rides_thursday},
                    {'x':'Friday','y': x.rides_friday},
                    {'x':'Saturday','y': x.rides_saturday},
                ]
            },
            width: 80,
            sortable:false
        },
        {
            id: 'dates-recorded',
            name: 'Dates Recorded (2001-2020)',
            type: 'spark-gantt',
            data: x => {
                return {
                    'start': x.date_min,
                    'end': x.date_max
                }
            },
            width: 96,
            sortable: false
        },
        {
            id: 'location',
            name: 'Location',
            type: 'spark-geo',
            data: x => {
                return {
                    latitude: x.latitude,
                    longitude: x.longitude
                }
            },
            width: 96,
            sortable: true,
            sortComparators: {
                northToSouth: (a,b) => b.latitude - a.latitude,
                westToEast: (a,b) => a.longitude - b.longitude,
                southToNorth: (a,b) => a.latitude - b.latitude,
                eastToWest: (a,b) => b.longitude - a.longitude
            },
            sortCycle: ['northToSouth', 'eastToWest','southToNorth','westToEast']
        }
    ]
}

function parseRow(row) {
    let displayString = x => x;
    let displayDate = (d, format) => format(d);
    let displaySparkBoxplot = function(d, width, format) {
        let height = 32;

        let xScale = d3.scaleLinear()
            .domain([globals.minRide, globals.maxRide])
            .range([0, width])

        let iqr = d.q3 - d.q1;
        let whiskerLow = Math.max(0, d.q1 - iqr);
        let whiskerHigh = d.q3 + iqr;

        let outputString = `<svg width="${width}" height="${height}" style="shape-rendering: crispEdges">`
        outputString += `<g transform="translate(1,0)">`
        outputString += `<line x1=${xScale(whiskerLow)} y1=${0.25*height} x2=${xScale(whiskerHigh)} y2=${0.25*height} style="stroke: white"></line>`
        outputString += `<rect x=${xScale(d.q1)} y=${0.0625*height} height=${0.375*height} width=${xScale(d.q3 - d.q1)} fill="#c60c30"></rect>`
        outputString += `<line x1=${xScale(whiskerLow)} y1=${0.125*height} x2=${xScale(whiskerLow)} y2=${0.375*height} style="stroke: white"></line>`
        outputString += `<line x1=${xScale(d.median)} y1=${0.0625*height} x2=${xScale(d.median)} y2=${0.4375*height} style="stroke: #FFF"></line>`
        outputString += `<line x1=${xScale(whiskerHigh)} y1=${0.125*height} x2=${xScale(whiskerHigh)} y2=${0.375*height} style="stroke: white"></line>`

        outputString += `<rect x=0 y="${0.625*height}" width="${xScale(d.mean)}" height="${0.375*height}" fill="#00a1de"></rect>`
        outputString += `<text x="${xScale(d.mean)}" y="${0.75*height}" dx="5" dy="7" class="data-label" fill="white">${format(d.mean)}</text>`
        

        outputString += '</g></svg>'

        return outputString
    }
    let displaySparkGantt = function(d, width) {
        let height = 17;
        let r = 3;

        let xScale = d3.scaleTime()
            .domain([globals.minStart, globals.maxEnd])
            .range([r, width - 2*r])

        let outputString = `<svg width="${width}" height="${height}">`
        outputString += `<g transform="translate(1,0)">`
        outputString += `<line x1=${xScale(d.start)} y1=${0.5*height} x2=${xScale(d.end)} y2=${0.5*height} style="stroke: #DDD"></line>`
        outputString += `<circle cx=${xScale(d.start)} cy=${0.5*height} r=${r} fill="${d.start - globals.minStart == 0 ? '#DDD' : '#000'}" stroke="white"></circle>`
        outputString += `<circle cx=${xScale(d.end)} cy=${0.5*height} r=${r} fill="${d.end - globals.maxEnd == 0 ? '#DDD' : '#000'}" stroke="white"></circle>`

        outputString += '</g></svg>'

        return outputString
    }
    let displayNumber = (d, format) => {
        return format(d);
    }
    let displaySparkGeo = function(d, width) {
        let height = 33;
        width = 33;
        let r = 2;

        let xScale = d3.scaleLinear()
            .domain([globals.minLongitude, globals.maxLongitude])
            .range([r, width - 2*r])

        let yScale = d3.scaleLinear()
            .domain([globals.minLatitude, globals.maxLatitude])
            .range([height - 2*r, r])

        let outputString = `<svg width="${width}" height="${height}" style="shape-rendering: crispEdges; display: block; margin:0 auto;">`
        outputString += `<rect x=0 y=0 width="${width}" height="${height}" fill="#555"></rect>`
        outputString += `<line x1=${0.5*width} x2=${0.5*width} y1=0 y2=${height} style="stroke: #222"></line>`
        outputString += `<line x1=0 x2=${width} y1=${0.5*height} y2=${0.5*height} style="stroke: #222"></line>`
        outputString += `<rect x=${xScale(d.longitude) - r} y=${yScale(d.latitude) - r} width=${2*r} height=${2*r} fill="#BBB"></rect>`
        //outputString += `<circle cx=${xScale(d.longitude)} cy=${yScale(d.latitude)} r=${r} fill="#555"></circle>`
        outputString += '</svg>'

        return outputString;
    }
    let displayBar = function(d, width) {
        let height = 17;

        let xScale = d3.scaleBand()
            .domain(d.map(x => x.x))
            .range([0, width])
            .padding(0.1)

        let bandwidth = xScale.bandwidth();

        let yScale = d3.scaleLinear()
            .domain([0, 1/7])
            .range([height, 0])

        let outputString = `<svg width="${width}" height="${height}" style="shape-rendering: crispEdges; display: block; margin:0 auto;">`
        d.forEach(x => {
            outputString += `<rect x=${xScale(x.x)} y=${yScale(x.y)} width=${bandwidth} height=${height - yScale(x.y)} fill="#888"></rect>`
        })

        outputString += '</svg>'

        return outputString;

    }
    let displayHBar = function(d, width, format) {
        let height = 33;

        let xScale = d3.scaleLinear()
            .domain([globals.minAverage, globals.maxAverage])
            .range([0, 0.625*width])

        let outputString = `<svg width="${width}" height="${height}" style="shape-rendering: crispEdges; display: block; margin:0 auto;">`
        outputString += `<rect x=0 y="${0.25*height}" width="${xScale(d)}" height="${0.5*height}" fill="#75b8d9"></rect>`
        outputString += `<text x="${xScale(d)}" y="${0.5*height}" dx="5" dy="5" class="data-label">${format(d)}</text>`

        outputString += '</svg>'

        return outputString;       
    }
    let displayIndicators = function(d, width) {
        let height = 16;
        let r = 7;

        let outputString = `<div>${d.name}</div>`
        if (d.indicators) {
            outputString += `<svg width="${width}" height="${height}">`
            d.indicators.forEach((d, i) => {
                outputString += `<circle cx=${3*i*r + r} cy=${0.5*height} r=${r} fill=${d}></circle>`
            })   
            outputString += '</svg>'
        }

        return outputString;
    }

    let outputString = ''
    tableConfig.columns.forEach(col => {
        if (col.type == 'number')           outputString += `<div class="table-cell" style="width:${col.width}px"><div>${displayNumber(col.data(row), col.format)}</div></div>`;
        if (col.type == 'string')           outputString += `<div class="table-cell" style="width:${col.width}px"><div>${displayString(col.data(row))}</div></div>`;
        if (col.type == 'date')             outputString += `<div class="table-cell" style="width:${col.width}px"><div>${displayDate(col.data(row), col.format)}</div></div>`;
        if (col.type == 'spark-boxplot')    outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displaySparkBoxplot(col.data(row), col.width, col.labelFormat)}</div></div>`;
        if (col.type == 'spark-gantt')      outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displaySparkGantt(col.data(row), col.width)}</div></div>`;
        if (col.type == 'spark-geo')        outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displaySparkGeo(col.data(row), col.width)}</div></div>`;
        if (col.type == 'bar')              outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displayBar(col.data(row), col.width)}</div></div>`;
        if (col.type == 'hbar')             outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displayHBar(col.data(row), col.width, col.labelFormat)}</div></div>`;
        if (col.type == 'indicators')       outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displayIndicators(col.data(row), col.width)}</div></div>`;
    })

    return outputString;
}

function parseHeader(d) {
    let outputString = `${d.name}`

    if (tableConfig.sort.column == d.id) {
        if (tableConfig.sort.direction == 'ascending' || tableConfig.sort.direction == 'southToNorth') {
            outputString += ' <i class="fas fa-caret-up"></i>'
        } else if (tableConfig.sort.direction == 'descending' || tableConfig.sort.direction == 'northToSouth') {
            outputString += ' <i class="fas fa-caret-down"></i>'
        } else if (tableConfig.sort.direction == 'westToEast') {
            outputString += ' <i class="fas fa-caret-right"></i>'
        } else if (tableConfig.sort.direction == 'eastToWest') {
            outputString += ' <i class="fas fa-caret-left"></i>'
        }
    }

    return outputString
}

let mapboxUrl = 'https://api.mapbox.com/styles/v1/travisdoesmath/ckohfz7lq12so17rf1afs8xgv/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoidHJhdmlzZG9lc21hdGgiLCJhIjoiY2poOWNrYjRkMDQ2ejM3cGV1d2xqa2IyeCJ9.34tYWBvPBM_h8_YS3Z7__Q'
    
let map = L.map("map", {
    center: [41.8781, -87.6298],
    zoom: 10
})

L.tileLayer(mapboxUrl, {
    attribution: "© <a href='https://www.mapbox.com/about/maps/'>Mapbox</a> © <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> <strong><a href='https://www.mapbox.com/map-feedback/' target='_blank'>Improve this map</a></strong>",
    maxZoom: 18,
}).addTo(map);

function displayTable(data) {
    let sortComparator = tableConfig.columns.filter(x => x.id == tableConfig.sort.column)[0].sortComparators[tableConfig.sort.direction]

    data.sort(sortComparator)

    d3.select("#table").html('').style('width', `${tableConfig.width + 17}px`)

    let tableHeader = d3.select("#table").append('div')
        .attr('class', 'table-header')
        
    let headers = tableHeader.selectAll('.table-header-cell').data(tableConfig.columns)

    headers.enter().append('div')
        .attr('class', 'table-header-cell')
        .merge(headers)
        .style('height', '1rem')
        .style('width', d => d.width + 'px')
        .html(parseHeader)
        .on('click', function(event, d) {
            if (d.sortable) {
                if (tableConfig.sort.column == d.id) {
                    tableConfig.sort.direction = d.sortCycle[(d.sortCycle.indexOf(tableConfig.sort.direction) + 1) % d.sortCycle.length]
                } else {
                    tableConfig.sort = {
                        column: d.id,
                        direction: d.sortCycle[0]
                    }
                }

                displayTable(globals.data);
            }
        })

    let tableBody = d3.select("#table").append('div')
        .attr('class', 'table-body')
        .style('overflow-y', 'scroll')
        .style('width', `${tableConfig.width + 17}px`)
        .style('height', `${tableConfig.height}px`)

    let rows = tableBody.selectAll('.table-row').data(data)

    rows.enter().append('div')
        .attr('class', 'table-row')
        .merge(rows)
        .style('width', tableConfig.width + 'px')
        .html(d =>parseRow(d))   
}

d3.json('static/data/cta_ridership.json').then(function(data) {
    console.log(data)

    data.forEach(d => {
        d.date_min = new Date(d.date_min)
        d.date_max = new Date(d.date_max)

        color = '#888'
        if (d.Y) color = '#f9e300'
        if (d.Pnk) color = '#e27ea6'
        if (d.P || d.Pexp) color = '#522398'
        if (d.O) color = '#f9461c'
        if (d.G) color = '#009b3a'
        if (d.BRN) color = '#62361b'
        if (d.RED) color = '#c60c30'
        if (d.BLUE) color = '#00a1de'

        L.circleMarker([d.latitude, d.longitude], {
            radius: Math.sqrt(d.rides_mean) * 0.1,
            stroke: true,
            weight: 1,
            color: color,
            opacity: 0.5,
            fillOpacity: 0.4
        }).addTo(map);
    })

    globals.data = data;

    globals.minRide = d3.min(data, d => d.rides_min)
    globals.maxRide = d3.max(data, d => d.rides_max)

    globals.minAverage = d3.min(data, d => d.rides_mean)
    globals.maxAverage = d3.max(data, d => d.rides_mean)

    globals.minStart = d3.min(data, d => d.date_min)
    globals.maxEnd = d3.max(data, d => d.date_max)

    globals.minLatitude = d3.min(data, d => d.latitude)
    globals.maxLatitude = d3.max(data, d => d.latitude)
    globals.minLongitude = d3.min(data, d => d.longitude)
    globals.maxLongitude = d3.max(data, d => d.longitude)

    displayTable(data);
})