from flask import Blueprint, request, jsonify, current_app
import geopandas as gpd
import os

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/upload_shp', methods=['POST'])
def upload_shp():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    if file and file.filename.endswith('.shp'):
        base_filename = os.path.splitext(file.filename)[0]
        filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], file.filename)
        file.save(filepath)

        for ext in ['.shx', '.dbf', '.prj']:
            if f"{base_filename}{ext}" in request.files:
                related_file = request.files[f"{base_filename}{ext}"]
                related_filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], related_file.filename)
                related_file.save(related_filepath)

        gdf = gpd.read_file(filepath)
        geojson_data = gdf.to_json()
        
        return jsonify({'status': 'success', 'geojson': geojson_data})
    
    return jsonify({'error': 'Invalid file type'}), 400

@upload_bp.route('/export_shp', methods=['POST'])
def export_shp():
    data = request.get_json()
    geojson = data.get('geojson')
    filename = data.get('filename', 'exported_data')

    if not geojson:
        return jsonify({'error': 'No geojson data provided'}), 400

    gdf = gpd.read_file(json.dumps(geojson))
    filepath = os.path.join(current_app.config['UPLOAD_FOLDER'], f"{filename}.shp")
    gdf.to_file(filepath)

    return jsonify({'status': 'success', 'path': filepath})
