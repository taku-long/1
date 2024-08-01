from flask import Blueprint, request, jsonify
import geopandas as gpd
import os
from utils.helper_functions import convert_list_fields_to_string, save_geodataframe_to_shapefile

export_bp = Blueprint('export', __name__)

@export_bp.route('/export_shp', methods=['POST'])
def export_shp():
    try:
        data = request.get_json()
        geojson_data = data['geojson']
        gdf = gpd.GeoDataFrame.from_features(geojson_data['features'])

        gdf = convert_list_fields_to_string(gdf)

        shp_dir = os.path.join('shp')
        if not os.path.exists(shp_dir):
            os.makedirs(shp_dir)

        shp_path = os.path.join(shp_dir, 'network_analysis.shp')
        save_geodataframe_to_shapefile(gdf, shp_path)

        return jsonify({'status': 'success', 'path': shp_path})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
