from flask import Blueprint

building_bp = Blueprint('building', __name__)

from . import building
