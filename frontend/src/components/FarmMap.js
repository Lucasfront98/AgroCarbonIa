import React, { useRef, useEffect } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import L from 'leaflet';

/**
 * Componente interno que observa `externalPolygon` e o adiciona ao mapa.
 * Necessita estar DENTRO do MapContainer para acessar o contexto do mapa.
 */
const ExternalPolygonLayer = ({ externalPolygon, featureGroupRef, onPolygonChange }) => {
  const map = useMap();

  useEffect(() => {
    if (!externalPolygon || !featureGroupRef.current) return;

    const featureGroup = featureGroupRef.current;

    // Limpa polígonos anteriores
    featureGroup.clearLayers();

    // Adiciona o polígono externo (vindo do CAR/SICAR)
    const layer = L.geoJSON(externalPolygon, {
      style: {
        color: '#3ddc84',
        fillColor: '#3ddc84',
        fillOpacity: 0.15,
        weight: 2,
      }
    });

    layer.eachLayer((l) => featureGroup.addLayer(l));

    // Centraliza o mapa no polígono
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30] });
    }

    // Notifica o componente pai com o GeoJSON
    const featureCollection = {
      type: 'FeatureCollection',
      features: Array.isArray(externalPolygon.features)
        ? externalPolygon.features
        : [externalPolygon]
    };
    onPolygonChange(featureCollection);

  }, [externalPolygon]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
};

const FarmMap = ({
  onPolygonChange,
  externalPolygon = null,
  defaultCenter = [-12.56, -55.72],
  defaultZoom = 12,
  mapHeight = '400px'
}) => {
  const featureGroupRef = useRef(null);
  const mapRef = useRef(null);

  // Corrige tiles cinzas no primeiro render do Leaflet
  useEffect(() => {
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 400);
  }, []);

  const handleCreated = (e) => {
    const { layerType, layer } = e;
    if (layerType === 'polygon') {
      const featureGroup = featureGroupRef.current;

      // Garante apenas 1 polígono por vez
      if (featureGroup) {
        featureGroup.getLayers().forEach((l) => {
          if (l !== layer) featureGroup.removeLayer(l);
        });
      }

      const geojson = layer.toGeoJSON();
      onPolygonChange({ type: 'FeatureCollection', features: [geojson] });
    }
  };

  const handleEdited = (e) => {
    e.layers.eachLayer((layer) => {
      onPolygonChange({ type: 'FeatureCollection', features: [layer.toGeoJSON()] });
    });
  };

  const handleDeleted = () => {
    onPolygonChange(null);
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: mapHeight, marginBottom: '1.5rem' }}>
      {/* Label overlay */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 1000,
          backgroundColor: 'var(--surface2)',
          border: '1px solid var(--border2)',
          padding: '0.5rem 1rem',
          fontSize: '0.75rem',
          color: 'var(--text)',
          pointerEvents: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}
        className="font-mono"
      >
        🛰️ Use a ferramenta de polígono à esquerda para marcar a área
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        {/* Satélite Esri */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />
        {/* Labels OSM em português */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}.png"
          opacity={1.0}
        />

        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topleft"
            onCreated={handleCreated}
            onEdited={handleEdited}
            onDeleted={handleDeleted}
            draw={{
              polyline: false,
              circle: false,
              circlemarker: false,
              marker: false,
              rectangle: false,
              polygon: {
                allowIntersection: false,
                drawError: { color: '#ef4444', message: '<strong>Erro:</strong> Os limites não podem se cruzar!' },
                shapeOptions: { color: '#3ddc84', fillColor: '#3ddc84', fillOpacity: 0.15, weight: 2 }
              }
            }}
            edit={{ edit: true, remove: true }}
          />
        </FeatureGroup>

        {/* Injeta polígono externo (SICAR/CAR) */}
        {externalPolygon && (
          <ExternalPolygonLayer
            externalPolygon={externalPolygon}
            featureGroupRef={featureGroupRef}
            onPolygonChange={onPolygonChange}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default FarmMap;
