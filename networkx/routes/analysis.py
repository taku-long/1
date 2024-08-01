from flask import Blueprint, request, jsonify, current_app
import osmnx as ox
import networkx as nx
from shapely.geometry import LineString, Point, Polygon
import geopandas as gpd
import json

analysis_bp = Blueprint('analysis', __name__)

@analysis_bp.route('/perform_analysis', methods=['POST'])
def perform_analysis():
    try:
        data = request.get_json()
        analysis_type = data['analysis_type']
        selected_points = data.get('selected_points', [])

        graph_model = current_app.config['GRAPH_MODEL']
        G = graph_model.get_graph()

        if analysis_type == 'isochrone':
            time = data['time']
            mode = data['mode']
            speeds = {'walk': 4, 'bike': 15, 'car': 30}  # 単位: km/h
            distance = speeds[mode] * (time / 60) * 1000  # メートル単位に変換

            all_geojson_data = []
            for point in selected_points:
                lat, lng = point['lat'], point['lng']
                node = graph_model.get_nearest_node(lat, lng)
                subgraph = graph_model.create_subgraph(node, distance)
                geojson_data = ox.graph_to_gdfs(subgraph, nodes=False, edges=True).to_json()
                all_geojson_data.append(json.loads(geojson_data))
            return jsonify({'roads': all_geojson_data})
        elif analysis_type == 'shortest_path':
            start_lat, start_lng = selected_points[0]['lat'], selected_points[0]['lng']
            goal_lat, goal_lng = selected_points[1]['lat'], selected_points[1]['lng']
            start_node = graph_model.get_nearest_node(start_lat, start_lng)
            goal_node = graph_model.get_nearest_node(goal_lat, goal_lng)
            route = graph_model.get_shortest_path(start_node, goal_node)
            route_geom = LineString([(G.nodes[n]['x'], G.nodes[n]['y']) for n in route])
            gdf = gpd.GeoDataFrame(geometry=[route_geom])
            geojson_data = gdf.to_json()
            distance = graph_model.get_shortest_path_length(start_node, goal_node)
            return jsonify({'roads': json.loads(geojson_data), 'distance': distance})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@analysis_bp.route('/create_polygon', methods=['POST'])
def create_polygon():
    try:
        data = request.get_json()
        roads_geojson = data['roads']
        
        road_geometries = [shape(feature['geometry']) for feature in roads_geojson['features']]
        unified = unary_union(road_geometries)
        polygon = unified.convex_hull
        
        gdf = gpd.GeoDataFrame(geometry=[polygon])
        geojson_data = gdf.to_json()
        
        return jsonify({'polygon': json.loads(geojson_data)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
