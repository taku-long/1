# utils/helper_functions.py

import geopandas as gpd

def convert_list_fields_to_string(gdf):
    for col in gdf.columns:
        if gdf[col].apply(lambda x: isinstance(x, list)).any():
            gdf[col] = gdf[col].apply(lambda x: str(x) if isinstance(x, list) else x)
    return gdf

def save_geodataframe_to_shapefile(gdf, path):
    gdf.to_file(path, driver='ESRI Shapefile')
