import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RouteMap.css';

export default function RouteMap({ stops = [], onPick, disabled = false }) {
  const container = useRef(null);
  const mapRef = useRef(null);
  const markers = useRef(null);
  const pickRef = useRef(onPick);
  const disabledRef = useRef(disabled);
  pickRef.current = onPick;
  disabledRef.current = disabled;

  useEffect(() => {
    const map = L.map(container.current, {
      scrollWheelZoom: false, zoomAnimation: false,
      fadeAnimation: false, markerZoomAnimation: false,
    }).setView([13.6218, 123.1948], 13);
    mapRef.current = map;
    markers.current = L.layerGroup().addTo(map);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);
    map.on('click', event => {
      if (!disabledRef.current) pickRef.current?.({
        lat: Number(event.latlng.lat.toFixed(6)),
        lng: Number(event.latlng.lng.toFixed(6)),
      });
    });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      map.remove();
      mapRef.current = null;
      markers.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markers.current) return;
    markers.current.clearLayers();
    const located = stops.filter(stop =>
      Number.isFinite(stop.lat) && Number.isFinite(stop.lng) &&
      Math.abs(stop.lat) <= 90 && Math.abs(stop.lng) <= 180);
    for (const stop of located) {
      const label = document.createElement('span');
      label.textContent = stop.name || 'Attraction location';
      L.marker([stop.lat, stop.lng], {
        title: stop.name || 'Attraction location',
        icon: L.divIcon({ className: 'location-pick-marker', html: '<span></span>', iconSize: [24,24], iconAnchor: [12,12] }),
      }).addTo(markers.current).bindPopup(label);
    }
    if (located.length) mapRef.current.panInside([located[0].lat, located[0].lng], { animate: false, padding: [30,30] });
  }, [stops]);

  return <div ref={container} className="location-pick-map" role="region" aria-label="Choose attraction location on the map" />;
}
