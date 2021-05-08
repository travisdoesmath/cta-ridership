let globalValues = {};

let tableConfig = {
    'width': 850,
    'height': 300,
    'columns': [
        {
            'name': 'Name',
            'type': 'string',
            'data': x => x.name,
            'width': 192
        },
        {
            'name': 'Rides Dist.',
            'type': 'spark-boxplot',
            'data': x => { 
                return {
                    'q1': x.rides_q1,
                    'median': x.rides_median,
                    'q3': x.rides_q3,
                }
            },
            'width': 96,
            'sortValue': x => x.rides_median
        },
        {
            'name': 'Avg. Rides',
            'type': 'number',
            'data': x => x.rides_mean,
            'width': 80,
            'format': x => x.toLocaleString(undefined, {maximumFractionDigits: 0})
        },
        {
            'name': 'Percent of Rides by Weekday',
            'type': 'bar',
            'data': x => {
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
            'width': 80,
        },
        {
            'name': 'Dates Recorded (2001-2020)',
            'type': 'spark-gantt',
            'data': x => {
                return {
                    'start': x.date_min,
                    'end': x.date_max
                }
            },
            'width': 96
        },
        // {
        //     'name': 'start',
        //     'type': 'date',
        //     'data': x => x.date_min,
        //     'width': 96,
        //     'format': d3.timeFormat('%Y-%m-%d')
        // },
        // {
        //     'name': 'end',
        //     'type': 'date',
        //     'data': x => x.date_max,
        //     'width': 96,
        //     'format': d3.timeFormat('%Y-%m-%d')
        // },
        {
            'name': 'Location',
            'type': 'spark-geo',
            'data': x => {
                return {
                    'latitude': x.latitude,
                    'longitude': x.longitude
                }
            },
            'width': 64
        }
    ]
}

function parseRow(row) {
    let displayString = x => x;
    let displayDate = (d, format) => format(d);
    let displaySparkBoxplot = function(d, width) {
        let height = 17;

        let xScale = d3.scaleLinear()
            .domain([globalValues.minRide, globalValues.maxRide])
            .range([0, width])
            

        let iqr = d.q3 - d.q1;
        let whiskerLow = Math.max(0, d.q1 - iqr);
        let whiskerHigh = d.q3 + iqr;

        let outputString = `<svg width="${width}" height="${height}" style="shape-rendering: crispEdges">`
        outputString += `<g transform="translate(1,0)">`
        outputString += `<line x1=${xScale(whiskerLow)} y1=${0.5*height} x2=${xScale(whiskerHigh)} y2=${0.5*height} style="stroke: black"></line>`
        outputString += `<rect x=${xScale(d.q1)} y=0 height=${height} width=${xScale(d.q3 - d.q1)} fill="#F55"></rect>`
        outputString += `<line x1=${xScale(whiskerLow)} y1=${0.25*height} x2=${xScale(whiskerLow)} y2=${0.75*height} style="stroke: black"></line>`
        outputString += `<line x1=${xScale(d.median)} y1=0 x2=${xScale(d.median)} y2=${height} style="stroke: #FFF"></line>`
        outputString += `<line x1=${xScale(whiskerHigh)} y1=${0.25*height} x2=${xScale(whiskerHigh)} y2=${0.75*height} style="stroke: black"></line>`
        
        outputString += '</g></svg>'

        return outputString
    }
    let displaySparkGantt = function(d, width) {
        let height = 17;
        let r = 3;

        let xScale = d3.scaleTime()
            .domain([globalValues.minStart, globalValues.maxEnd])
            .range([r, width - 2*r])

        let outputString = `<svg width="${width}" height="${height}">`
        outputString += `<g transform="translate(1,0)">`
        outputString += `<line x1=${xScale(d.start)} y1=${0.5*height} x2=${xScale(d.end)} y2=${0.5*height} style="stroke: black"></line>`
        outputString += `<circle cx=${xScale(d.start)} cy=${0.5*height} r=${r} fill="${d.start - globalValues.minStart == 0 ? '#FFF' : '#000'}" stroke="black"></circle>`
        outputString += `<circle cx=${xScale(d.end)} cy=${0.5*height} r=${r} fill="${d.end - globalValues.maxEnd == 0 ? '#FFF' : '#000'}" stroke="black"></circle>`

        outputString += '</g></svg>'

        return outputString

    }
    let displayNumber = (d, format) => {
        return format(d);
    }
    let displaySparkGeo = function(d, width) {
        let height = 33;
        //let width = 17;
        width = 33;
        let r = 2;

        let xScale = d3.scaleLinear()
            .domain([globalValues.minLongitude, globalValues.maxLongitude])
            .range([r, width - 2*r])

        let yScale = d3.scaleLinear()
            .domain([globalValues.minLatitude, globalValues.maxLatitude])
            .range([height - 2*r, r])

        let outputString = `<svg width="${width}" height="${height}" style="shape-rendering: crispEdges; display: block; margin:0 auto;">`
        outputString += `<rect x=0 y=0 width="${width}" height="${height}" fill="#DDD"></rect>`
        outputString += `<line x1=${0.5*width} x2=${0.5*width} y1=0 y2=${height} style="stroke: white"></line>`
        outputString += `<line x1=0 x2=${width} y1=${0.5*height} y2=${0.5*height} style="stroke: white"></line>`
        outputString += `<rect x=${xScale(d.longitude) - r} y=${yScale(d.latitude) - r} width=${2*r} height=${2*r} fill="#555"></rect>`
        //outputString += `<circle cx=${xScale(d.longitude)} cy=${yScale(d.latitude)} r=${r} fill="#555"></circle>`
        outputString += '</svg>'

        return outputString;

    }
    let displayBar = function(d, width) {
        console.log('d', d);
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
            outputString += `<rect x=${xScale(x.x)} y=${yScale(x.y)} width=${bandwidth} height=${height - yScale(x.y)} fill="#75b8d9"></rect>`
        })

        outputString += '</svg>'

        return outputString;

    }

    let outputString = ''
    tableConfig.columns.forEach(col => {
        if (col.type == 'number')           outputString += `<div class="table-cell" style="width:${col.width}px"><div>${displayNumber(col.data(row), col.format)}</div></div>`;
        if (col.type == 'string')           outputString += `<div class="table-cell" style="width:${col.width}px"><div>${displayString(col.data(row))}</div></div>`;
        if (col.type == 'date')             outputString += `<div class="table-cell" style="width:${col.width}px"><div>${displayDate(col.data(row), col.format)}</div></div>`;
        if (col.type == 'spark-boxplot')    outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displaySparkBoxplot(col.data(row), col.width)}</div></div>`;
        if (col.type == 'spark-gantt')      outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displaySparkGantt(col.data(row), col.width)}</div></div>`;
        if (col.type == 'spark-geo')        outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displaySparkGeo(col.data(row), col.width)}</div></div>`;
        if (col.type == 'bar')              outputString += `<div class="table-cell" style="width:${col.width}px"><div style="width:100%">${displayBar(col.data(row), col.width)}</div></div>`;

    })

    return outputString;
}

// d3.json('/api/v1.0/rides_by_station').then(function(data) {
d3.json('static/data/cta_ridership.json').then(function(data) {
    console.log(data)

    //let dateParse = d3.timeParse('%Y-%m-%d')

    data.forEach(d => {
        //d.date_min = dateParse(d.date_min)
        //d.date_max = dateParse(d.date_max)
        d.date_min = new Date(d.date_min)
        d.date_max = new Date(d.date_max)
    })

    data.sort((a, b) => b.rides_median - a.rides_median)

    globalValues.minRide = d3.min(data, d => d.rides_min)
    globalValues.maxRide = d3.max(data, d => d.rides_max)

    globalValues.minStart = d3.min(data, d => d.date_min)
    globalValues.maxEnd = d3.max(data, d => d.date_max)

    globalValues.minLatitude = d3.min(data, d => d.latitude)
    globalValues.maxLatitude = d3.max(data, d => d.latitude)
    globalValues.minLongitude = d3.min(data, d => d.longitude)
    globalValues.maxLongitude = d3.max(data, d => d.longitude)

    d3.select("#table").style('width', `${tableConfig.width + 17}px`)

    let tableHeader = d3.select("#table").append('div')
        .attr('class', 'table-header')
        
    tableHeader.selectAll('.table-header-cell').data(tableConfig.columns)
        .enter().append('div')
        .attr('class', 'table-header-cell')
        .style('height', '1rem')
        .style('width', d => d.width + 'px')
        .text(d => d.name)

    let tableBody = d3.select("#table").append('div')
        .attr('class', 'table-body')
        .style('overflow-y', 'scroll')
        .style('width', `${tableConfig.width + 17}px`)
        .style('height', `${tableConfig.height}px`)

    let rows = tableBody.selectAll('.table-row').data(data)

    rows.enter().append('div')
        .attr('class', 'table-row')
        .style('width', tableConfig.width + 'px')
        .html(d =>parseRow(d))   
})