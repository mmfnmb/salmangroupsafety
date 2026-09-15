"use client";

import { useState } from "react";
import { Field, Select } from "@/components/ui/form";

type Room = { id: string; name: string };
type Floor = { id: string; name: string; rooms: Room[] };
type Building = { id: string; name: string; floors: Floor[] };
type Site = { id: string; name: string; code: string; buildings: Building[] };

export function AssetLocationPicker({ sites }: { sites: Site[] }) {
  const [siteId, setSiteId] = useState(sites[0]?.id ?? "");
  const [buildingId, setBuildingId] = useState("");
  const [floorId, setFloorId] = useState("");

  const site = sites.find((s) => s.id === siteId);
  const building = site?.buildings.find((b) => b.id === buildingId);
  const floor = building?.floors.find((f) => f.id === floorId);

  return (
    <div className="grid grid-cols-2 gap-4">
      <Field label="Site" htmlFor="siteId" required>
        <Select
          id="siteId"
          name="siteId"
          required
          value={siteId}
          onChange={(e) => {
            setSiteId(e.target.value);
            setBuildingId("");
            setFloorId("");
          }}
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.code})
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Building" htmlFor="buildingId">
        <Select
          id="buildingId"
          name="buildingId"
          value={buildingId}
          onChange={(e) => {
            setBuildingId(e.target.value);
            setFloorId("");
          }}
        >
          <option value="">—</option>
          {site?.buildings.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Floor" htmlFor="floorId">
        <Select id="floorId" name="floorId" value={floorId} onChange={(e) => setFloorId(e.target.value)}>
          <option value="">—</option>
          {building?.floors.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Room" htmlFor="roomId">
        <Select id="roomId" name="roomId" defaultValue="">
          <option value="">—</option>
          {floor?.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
