from flask import Blueprint, request, jsonify, current_app

network_bp = Blueprint('network', __name__)

@network_bp.route('/get_network', methods=['POST'])
def get_network():
    try:
        data = request.get_json()
        bounds = data['bounds']
        mode = data['mode']
        north, south, east, west = bounds['north'], bounds['south'], bounds['east'], bounds['west']
        
        graph_model = current_app.config['GRAPH_MODEL']
        graph_model.load_graph_from_bbox(north, south, east, west, mode)
        
        return jsonify({'status': 'success'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

