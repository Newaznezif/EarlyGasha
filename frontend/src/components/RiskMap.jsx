import React, { useContext } from 'react';
import { MapContainer, TileLayer, CircleMarker, GeoJSON, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ThemeContext } from '../context/ThemeContext';

const RiskMap = ({ data, alerts = [], boundaries, simplifiedMode = false, onRegionSelect, selectedRegion }) => {
  const { isDark } = useContext(ThemeContext);
  const center = [9.1, 39.6];
  
  // Calculate raw dynamic color interpolation instead of static categorical thresholds
  const getColor = (score) => {
    const hue = Math.max(0, 120 - (score * 1.2));
    return `hsl(${hue}, 85%, 45%)`;
  };

  const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  return (
    <div className="h-full w-full relative z-0">
      <MapContainer 
        center={center} 
        zoom={5} 
        scrollWheelZoom={false}
        className="w-full h-full rounded-2xl z-0"
        style={{ height: '100%', width: '100%', minHeight: '500px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={tileUrl}
        />
        {boundaries && (
          <GeoJSON
            data={boundaries}
            attribution="Administrative boundaries: geoBoundaries / Open Africa / Code for Ethiopia (CC BY 4.0)"
            style={{
              color: isDark ? '#38bdf8' : '#0369a1',
              weight: 1.5,
              fillColor: isDark ? '#0ea5e9' : '#38bdf8',
              fillOpacity: 0.06,
            }}
          />
        )}
        {data.map((region, idx) => {
          const regionAlert = alerts.find(a => a.region.toLowerCase() === region.region.toLowerCase());
          const hasCriticalAlerts = alerts.some(a => a.alert_level === 'CRITICAL');
          const isThisCritical = regionAlert?.alert_level === 'CRITICAL';
          
          let alertClass = '';
          if (!simplifiedMode) {
              alertClass = isThisCritical ? 'marker-critical' : 
                                 regionAlert?.alert_level === 'HIGH' ? 'marker-high' : 
                                 regionAlert?.alert_level === 'WATCH' ? 'marker-watch' : '';
          }

          // Visual Hierarchy: Dim non-critical regions if there is an active crisis
          let targetOpacity = isThisCritical ? 0.8 : 0.6;
          
          // Instant Focus Behavior
          if (selectedRegion && selectedRegion.region !== region.region) {
              targetOpacity = 0.2; // Dim unselected strongly
          } else if (hasCriticalAlerts && !isThisCritical && !simplifiedMode && !selectedRegion) {
              targetOpacity = 0.3; // Crisis focus mode
          } else if (selectedRegion && selectedRegion.region === region.region) {
              targetOpacity = 1.0; // Max brightness
              alertClass += ' marker-focus-pulse';
          }

          return (
            <CircleMarker
              key={idx}
              center={[region.lat, region.lon]}
              pathOptions={{ 
                color: isThisCritical ? '#ef4444' : getColor(region.score), 
                fillColor: isThisCritical ? '#ef4444' : getColor(region.score), 
                fillOpacity: targetOpacity,
                weight: alertClass || (selectedRegion && selectedRegion.region === region.region) ? 4 : 2,
                className: `transition-all duration-300 ${alertClass}`
              }}
              radius={10 + (region.score / 10)}
              eventHandlers={{
                click: () => onRegionSelect(region),
              }}
            >
              <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                 <div className="flex items-center gap-2 p-1 font-sans">
                    <span className="font-bold text-xs uppercase">{region.region}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${regionAlert ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 text-slate-800'}`}>
                        {region.score.toFixed(0)}%
                    </span>
                 </div>
                 {region.observations && (
                   <div className="px-1 pb-1 text-[10px] text-slate-600">
                     {region.observations.temperature_c != null && <div>Temperature: {region.observations.temperature_c.toFixed(1)} C</div>}
                     {region.observations.rainfall_7d_mm != null && <div>Rainfall, 7 days: {region.observations.rainfall_7d_mm.toFixed(1)} mm</div>}
                     {region.observed_at && <div>Observed: {new Date(region.observed_at).toLocaleString()}</div>}
                   </div>
                 )}
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default RiskMap;
