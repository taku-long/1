document.addEventListener('DOMContentLoaded', function() {
    var map = L.map('map').setView([35.6895, 139.6917], 12); // Default to Tokyo

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    var selectedPoints = [];
    var geojsonLayer = null;
    var shpLayer = null;
    var selectionBox = null;
    var boundingBox = null;
    var draggingMap = false;
    var selectingPoints = false;

    function updateUI() {
        var analysisType = document.getElementById('analysis_type').value;
        var timeContainer = document.getElementById('time-container');
        var distanceInfo = document.getElementById('distance-info');
        if (analysisType === 'shortest_path') {
            timeContainer.style.display = 'none';
            distanceInfo.style.display = 'block';
        } else {
            timeContainer.style.display = 'block';
            distanceInfo.style.display = 'none';
        }
    }

    map.on('mousedown', function(e) {
        if (e.originalEvent.button === 1) {  // Middle mouse button
            draggingMap = true;
            map.dragging.enable();
        } else {
            draggingMap = false;
            if (selectionBox) {
                map.removeLayer(selectionBox);
            }
            selectionBox = L.rectangle([e.latlng, e.latlng], { color: "#ff7800", weight: 1 }).addTo(map);
            map.dragging.disable();
            map.on('mousemove', onMouseMove);
        }
    });

    map.on('mouseup', function(e) {
        if (draggingMap) {
            map.dragging.disable();
        } else {
            map.off('mousemove', onMouseMove);
            map.dragging.enable();
            if (selectionBox) {
                if (boundingBox) {
                    map.removeLayer(boundingBox);
                }
                boundingBox = L.rectangle(selectionBox.getBounds(), { color: "#000000", weight: 1 }).addTo(map);
            }
        }
        draggingMap = false;
    });

    function onMouseMove(e) {
        if (selectionBox) {
            selectionBox.setBounds(L.latLngBounds(e.latlng, selectionBox.getBounds().getSouthWest()));
        }
    }

    map.on('click', function(e) {
        if (e.originalEvent.ctrlKey) {
            var latlng = e.latlng;
            var analysisType = document.getElementById('analysis_type').value;
            if (analysisType === 'shortest_path' && selectedPoints.length < 2) {
                if (selectedPoints.length === 0) {
                    L.marker(latlng, { icon: L.divIcon({ className: 'start-marker', html: 'S' }) }).addTo(map);
                    document.getElementById('start-point').textContent = `${latlng.lat}, ${latlng.lng}`;
                } else {
                    L.marker(latlng, { icon: L.divIcon({ className: 'goal-marker', html: 'G' }) }).addTo(map);
                    document.getElementById('goal-point').textContent = `${latlng.lat}, ${latlng.lng}`;
                }
                selectedPoints.push(latlng);
            } else if (analysisType === 'isochrone' || analysisType === 'facility') {
                L.marker(latlng).addTo(map);
                selectedPoints.push(latlng);
            }
            updatePointsList();
        }
    });

    function updatePointsList() {
        var pointsList = document.getElementById('points-list');
        pointsList.innerHTML = '';
        selectedPoints.forEach(function(point, index) {
            var li = document.createElement('li');
            li.textContent = `地点 ${index + 1}: ${point.lat}, ${point.lng}`;
            var btn = document.createElement('button');
            btn.textContent = '削除';
            btn.onclick = function() {
                map.eachLayer(function(layer) {
                    if (layer instanceof L.Marker && layer.getLatLng().equals(point)) {
                        map.removeLayer(layer);
                    }
                });
                selectedPoints.splice(index, 1);
                updatePointsList();
            };
            li.appendChild(btn);
            pointsList.appendChild(li);
        });
    }

    document.getElementById('extract-network').onclick = function() {
        var bounds = selectionBox.getBounds();
        var boundsData = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        };

        var mode = document.getElementById('mode').value;

        document.getElementById('loading').style.display = 'block';

        fetch('/get_network', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bounds: boundsData,
                mode: mode
            })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.error) {
                alert("Error: " + data.error);
            } else {
                if (geojsonLayer) {
                    map.removeLayer(geojsonLayer);
                }
                geojsonLayer = L.geoJson(data.network, {
                    style: function (feature) {
                        return { color: 'black', weight: 0.5 };
                    }
                }).addTo(map);
                map.fitBounds(geojsonLayer.getBounds());
                alert("道路ネットワークを取得しました。次の地点選択アクションに進んでください。");
            }
        })
        .catch(error => {
            document.getElementById('loading').style.display = 'none';
            console.error('Error:', error);
        });
    };

    document.getElementById('start').onclick = function() {
        if (selectedPoints.length === 0) {
            alert("中心地点を選択してください。");
            return;
        }

        var mode = document.getElementById('mode').value;
        var time = parseInt(document.getElementById('time').value);
        var analysisType = document.getElementById('analysis_type').value;

        if (analysisType === 'shortest_path' && selectedPoints.length < 2) {
            alert("最短経路探索には始点と終点を選択してください。");
            return;
        }

        var selectedPointsData = selectedPoints.map(function(point) {
            return { lat: point.lat, lng: point.lng };
        });

        document.getElementById('loading').style.display = 'block';

        fetch('/perform_analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                analysis_type: analysisType,
                mode: mode,
                time: time,
                selected_points: selectedPointsData
            })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.error) {
                alert("Error: " + data.error);
            } else {
                if (geojsonLayer) {
                    map.removeLayer(geojsonLayer);
                }
                if (data.roads && data.roads.length > 0) {
                    geojsonLayer = L.geoJson(data.roads, {
                        style: function (feature) {
                            return { color: 'blue' };
                        }
                    }).addTo(map);
                    map.fitBounds(geojsonLayer.getBounds());
                    if (analysisType === 'shortest_path') {
                        document.getElementById('distance').textContent = data.distance.toFixed(2);
                    }
                } else {
                    alert("解析結果が空です。");
                }
            }
        })
        .catch(error => {
            document.getElementById('loading').style.display = 'none';
            console.error('Error:', error);
        });
    };

    document.getElementById('polygonize').onclick = function() {
        if (!geojsonLayer) {
            alert("先にネットワーク分析を実行してください。");
            return;
        }

        var roadsGeoJson = geojsonLayer.toGeoJSON();

        document.getElementById('loading').style.display = 'block';

        fetch('/create_polygon', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                roads: roadsGeoJson
            })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.error) {
                alert("Error: " + data.error);
            } else {
                if (geojsonLayer) {
                    map.removeLayer(geojsonLayer);
                }
                geojsonLayer = L.geoJson(data.polygon, {
                    style: function (feature) {
                        return { color: 'green', weight: 0.5 };
                    }
                }).addTo(map);
                map.fitBounds(geojsonLayer.getBounds());
                alert("ポリゴン化が完了しました。");
            }
        })
        .catch(error => {
            document.getElementById('loading').style.display = 'none';
            console.error('Error:', error);
        });
    };

    document.getElementById('extract-facilities').onclick = function() {
        var bounds = selectionBox.getBounds();
        var boundsData = {
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest()
        };

        var facilityType = document.getElementById('facility_type').value;

        document.getElementById('loading').style.display = 'block';

        fetch('/get_buildings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                bounds: boundsData,
                facility_type: facilityType
            })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.error) {
                alert("Error: " + data.error);
            } else {
                if (geojsonLayer) {
                    map.removeLayer(geojsonLayer);
                }
                if (data.facilities) {
                    geojsonLayer = L.geoJson(data.facilities, {
                        pointToLayer: function (feature, latlng) {
                            selectedPoints.push(latlng); // 選択した地点リストに追加
                            updatePointsList(); // 選択した地点リストを更新
                            return L.circleMarker(latlng, {
                                radius: 3,
                                fillColor: 'red',
                                color: 'red',
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            });
                        }
                    }).addTo(map);
                    map.fitBounds(geojsonLayer.getBounds());
                    alert("施設を取得しました。");
                } else {
                    alert("施設が見つかりませんでした。");
                }
            }
        })
        .catch(error => {
            document.getElementById('loading').style.display = 'none';
            console.error('Error:', error);
        });
    };

    document.getElementById('export-shp').onclick = function() {
        if (!geojsonLayer) {
            alert("先にネットワーク分析を実行してください。");
            return;
        }

        var geojson = geojsonLayer.toGeoJSON();
        var filename = prompt("SHPファイルの名前を入力してください:", "exported_data");

        fetch('/export_shp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                geojson: geojson,
                filename: filename
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert("Error: " + data.error);
            } else {
                alert("SHPファイルが保存されました: " + data.path);
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    };

    document.getElementById('clear').onclick = function() {
        if (geojsonLayer) {
            map.removeLayer(geojsonLayer);
            geojsonLayer = null;
        }
        if (shpLayer) {
            map.removeLayer(shpLayer);
            shpLayer = null;
        }
        selectedPoints = [];
        updatePointsList();
        document.getElementById('start-point').textContent = '';
        document.getElementById('goal-point').textContent = '';
        document.getElementById('distance').textContent = '';
        if (selectionBox) {
            map.removeLayer(selectionBox);
            selectionBox = null;
        }
        if (boundingBox) {
            map.removeLayer(boundingBox);
            boundingBox = null;
        }
    };

    var dropArea = document.getElementById('map');
    dropArea.addEventListener('dragover', function(event) {
        event.preventDefault();
        dropArea.classList.add('drag-over');
    });

    dropArea.addEventListener('dragleave', function(event) {
        event.preventDefault();
        dropArea.classList.remove('drag-over');
    });

    dropArea.addEventListener('drop', function(event) {
        event.preventDefault();
        dropArea.classList.remove('drag-over');

        var files = event.dataTransfer.files;
        if (files.length === 0) {
            alert("SHPファイルをドロップしてください。");
            return;
        }

        var formData = new FormData();
        for (var i = 0; i < files.length; i++) {
            formData.append('file', files[i]);
        }

        document.getElementById('loading').style.display = 'block';

        fetch('/upload_shp', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById('loading').style.display = 'none';
            if (data.error) {
                alert("Error: " + data.error);
            } else {
                if (shpLayer) {
                    map.removeLayer(shpLayer);
                }
                shpLayer = L.geoJson(data.geojson).addTo(map);
                map.fitBounds(shpLayer.getBounds());
                alert("SHPファイルが読み込まれました。");
            }
        })
        .catch(error => {
            document.getElementById('loading').style.display = 'none';
            console.error('Error:', error);
        });
    });

    document.getElementById('toggle-layer').onchange = function() {
        if (shpLayer) {
            if (this.checked) {
                map.addLayer(shpLayer);
            } else {
                map.removeLayer(shpLayer);
            }
        }
    };

    document.getElementById('select-points').onclick = function() {
        selectingPoints = !selectingPoints;
        if (selectingPoints) {
            this.textContent = "選択終了";
            map.getContainer().style.cursor = 'crosshair';
        } else {
            this.textContent = "地点選択";
            map.getContainer().style.cursor = '';
        }
    };

    updateUI();
});
