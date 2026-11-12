"use client";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Tooltip, useMap } from "react-leaflet";
import type { HunterResult } from "./hunter";

function Fit({ points, selected }: { points: [number, number][]; selected: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (selected) map.flyTo(selected, Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [selected, map]);
  useEffect(() => {
    if (points.length === 1) map.setView(points[0], 15);
    else if (points.length > 1) map.fitBounds(points, { padding: [32, 32] });
  }, [points, map]);
  return null;
}

export default function HunterMap({ results, selectedId, onSelect }: { results: HunterResult[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const pts = results.filter((r) => r.lat != null && r.lng != null);
  const points = pts.map((r) => [r.lat!, r.lng!] as [number, number]);
  const sel = pts.find((r) => r.externalId === selectedId);
  return (
    <MapContainer center={[-14.235, -51.925]} zoom={4} scrollWheelZoom className="h-full w-full rounded-2xl" attributionControl>
      <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>' />
      <Fit points={points} selected={sel ? [sel.lat!, sel.lng!] : null} />
      {pts.map((r) => {
        const active = r.externalId === selectedId;
        const color = r.qualification.score >= 70 ? "#22C55E" : r.qualification.score >= 45 ? "#F59E0B" : "#3478F6";
        return (
          <CircleMarker key={r.externalId} center={[r.lat!, r.lng!]} radius={active ? 11 : 7}
            pathOptions={{ color: active ? "#F5F7FA" : color, fillColor: color, fillOpacity: 0.85, weight: active ? 3 : 1.5 }}
            eventHandlers={{ click: () => onSelect(r.externalId) }}>
            <Tooltip direction="top" offset={[0, -6]}>{r.name} · score {r.qualification.score}</Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
