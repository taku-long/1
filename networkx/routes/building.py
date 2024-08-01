from flask import Blueprint, request, jsonify
import osmnx as ox
import geopandas as gpd
from shapely.geometry import Point
import json

building_bp = Blueprint('building', __name__)

@building_bp.route('/get_buildings', methods=['POST'])
def get_buildings():
    try:
        data = request.get_json()
        bounds = data['bounds']
        facility_type = data['facility_type']

        north, south, east, west = bounds['north'], bounds['south'], bounds['east'], bounds['west']

        tags = {
            'school': {'amenity': 'school'},
            'station': {'railway': 'station'},
            'bus_stop': {'highway': 'bus_stop'},
            'building': {'building': True}
        }

        facilities = ox.geometries_from_bbox(north, south, east, west, tags[facility_type])
        
        if facility_type == 'building':
            facilities = facilities[facilities['height'].astype(float) >= 15]

        if 'geometry' in facilities.columns:
            facilities['geometry'] = facilities.apply(
                lambda row: Point(row.geometry.centroid) if row.geometry.geom_type == 'Polygon' else row.geometry, axis=1
            )

        facilities['name'] = facilities.apply(lambda row: row['name'] if 'name' in row else '', axis=1)
        facilities = facilities.dissolve(by='name', aggfunc='first').reset_index()

        facilities_geojson = facilities.to_json()

        return jsonify({'facilities': json.loads(facilities_geojson)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
