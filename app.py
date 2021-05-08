from flask import Flask, render_template
import pandas as pd

app = Flask(__name__)

# data setup
l_stations_df = pd.read_csv('cta_l_stations.csv')
ridership_df = pd.read_csv('cta_ridership.csv')

df = pd.merge(ridership_df, l_stations_df, how='left', left_on='station_id', right_on='MAP_ID')

def q1(x):
    return x.quantile(0.25)

def q3(x):
    return x.quantile(0.75)

rides_by_station = ridership_df.groupby('station_id').agg({
    'stationname':'first', 
    'rides':['min',q1,'mean','median',q3,'max','sum'],
    'date':['min','max']
})
rides_by_station.columns = rides_by_station.columns.map('_'.join)
rides_by_station.rename(columns={'stationname_first':'name', 'latitude_first':'latitude', 'longitude_first':'longitude'}, inplace=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/v1.0/rides_by_station')
def table_data():
    return pd.merge(rides_by_station.reset_index(), l_stations_df, how='left', left_on='station_id', right_on='MAP_ID').to_json(orient='records')

if __name__=="__main__":
    app.run(debug=True)

