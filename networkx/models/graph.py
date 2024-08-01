# models/graph.py

import osmnx as ox
import networkx as nx

class GraphModel:
    def __init__(self):
        self.graph = None

    def load_graph_from_bbox(self, north, south, east, west, mode):
        self.graph = ox.graph_from_bbox(north, south, east, west, network_type=mode)

    def get_graph(self):
        return self.graph

    def get_nearest_node(self, lat, lng):
        return ox.nearest_nodes(self.graph, lng, lat)
    
    def get_shortest_path(self, start_node, goal_node):
        return nx.shortest_path(self.graph, start_node, goal_node, weight='length')

    def get_shortest_path_length(self, start_node, goal_node):
        return nx.shortest_path_length(self.graph, start_node, goal_node, weight='length')

    def create_subgraph(self, node, distance):
        return nx.ego_graph(self.graph, node, radius=distance, distance='length')
