let globalValues = {};

let tableConfig = {
    'columns': [
        {
            'name': 'name',
            'type': 'string',
            'data': x => x.name,
            'width': '15rem'
        },
        {
            'name': 'rides dist',
            'type': 'spark-boxplot',
            'data': x => { 
                return {
                    'q1': x.rides_q1,
                    'median': x.rides_median,
                    'q3': x.rides_q3,
                }
            },
            'width': '6rem',
            'sortValue': x => x.rides_median
        },
        {
            'name': 'start',
            'type': 'date',
            'data': x => x.date_min,
            'width': '6rem'
        },
        {
            'name': 'end',
            'type': 'date',
            'data': x => x.date_max,
            'width': '6rem'
        },
        {
            'name': 'latitude',
            'type': 'number',
            'data': x => x.latitude,
            'width': '4rem',
            'format': x => x.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})
        },
        {
            'name': 'longitude',
            'type': 'number',
            'data': x => x.longitude,
            'width': '4rem',
            'format': x => x.toLocaleString(undefined, {minimumFractionDigits: 4, maximumFractionDigits: 4})
        }

    ]
}

function parseRow(row) {
    let displayString = x => x;
    let displayDate = x => x;
    let displaySparkBoxplot = function(d, width) {
        let height = 16;

        let xScale = d3.scaleLinear().domain([globalValues.minRide, globalValues.maxRide]).range([0, width])

        let iqr = d.q3 - d.q1;
        let whiskerLow = d.q1 - iqr;
        let whiskerHigh = d.q3 + iqr;

        let outputString = `<svg width="${width}" height="${height}" style="shape-rendering: crispEdges">`
        outputString += `<line x1=${xScale(whiskerLow)} y1=${0.5*height} x2=${xScale(whiskerHigh)} y2=${0.5*height} style="stroke: black"></line>`
        outputString += `<rect x=${xScale(d.q1)} y=0 height=${height} width=${xScale(d.q3 - d.q1)} fill="lightblue"></rect>`
        outputString += `<line x1=${xScale(d.median)} y1=0 x2=${xScale(d.median)} y2=${height} style="stroke: black"></line>`
        
        outputString += '</svg>'

        return outputString
    }
    let displayNumber = (d, format) => {
        return format(d);
    }

    let outputString = ''
    tableConfig.columns.forEach(col => {
        if (col.type == 'string')           outputString += `<div style="width:${col.width}">${displayString(col.data(row))}</div>`;
        if (col.type == 'date')             outputString += `<div style="width:${col.width}">${displayDate(col.data(row))}</div>`;
        if (col.type == 'spark-boxplot')    outputString += `<div style="width:${col.width}">${displaySparkBoxplot(col.data(row), col.width)}</div>`;
        if (col.type == 'number')           outputString += `<div style="width:${col.width}">${displayNumber(col.data(row), col.format)}</div>`;
    })

    return outputString;
}

d3.json('/api/v1.0/rides_by_station').then(function(data) {
    console.log(data)

    globalValues.minRide = d3.min(data, d => d.rides_min)
    globalValues.maxRide = d3.max(data, d => d.rides_max)

    d3.select("#table").append('div').attr('class', 'table-header')
        .selectAll('.table-header-cell').data(tableConfig.columns)
        .enter().append('div')
        .attr('class', 'table-header-cell')
        .style('height', '1rem')
        .style('width', d => d.width)
        .text(d => d.name)


    let rows = d3.select("#table").selectAll('.table-row').data(data)

    rows.enter().append('div')
        .attr('class', 'table-row')
        .html(d =>parseRow(d))
    
})