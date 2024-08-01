import os
import sys
from flask import Flask, render_template
from flask_cors import CORS
from models.graph import GraphModel

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

graph_model = GraphModel()

def create_app():
    app = Flask(__name__)
    CORS(app)

    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

    from routes.network import network_bp
    from routes.analysis import analysis_bp
    from routes.export import export_bp
    from routes.upload import upload_bp
    from routes.building import building_bp

    app.register_blueprint(network_bp)
    app.register_blueprint(analysis_bp)
    app.register_blueprint(export_bp)
    app.register_blueprint(upload_bp)
    app.register_blueprint(building_bp)

    app.config['GRAPH_MODEL'] = graph_model

    @app.route('/')
    def index():
        return render_template('index.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
