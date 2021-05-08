let table_config = {
    'columns': [
        {
            'name': 'name',
            'type': 'string',
            'data': x => x.name,
            'width': '12rem'
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
            'width': '3rem'

        },
        {
            'name': 'start',
            'type': 'date',
            'data': x => x.date_min,
            'width': '5rem'
        },
        {
            'name': 'end',
            'type': 'date',
            'data': x => x.date_max,
            'width': '5rem'
        }
    ]
}

function parseRow(row) {
    let displayString = x => x;
    let displayDate = x => x;
    let displaySparkBoxplot = function(d) {
        return d.median
    }

    let outputString = ''
    table_config.columns.forEach(col => {
        if (col.type == 'string')           outputString += `<div style="width:${col.width}">${displayString(col.data(row))}</div>`;
        if (col.type == 'date')             outputString += `<div style="width:${col.width}">${displayDate(col.data(row))}</div>`;
        if (col.type == 'spark-boxplot')    outputString += `<div style="width:${col.width}">${displaySparkBoxplot(col.data(row))}</div>`;
    })

    return outputString;
}

d3.json('/api/v1.0/rides_by_station').then(function(data) {
    //console.log(data)

    let rows = d3.select("#table").selectAll('.row').data(data)

    rows.enter().append('div')
        .attr('class', 'row')
        .html(d => { console.log(d, parseRow(d)); return parseRow(d); })
    
})