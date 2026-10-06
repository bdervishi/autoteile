"use client";
import { useState } from "react";
export function TireFinder() {
  const [width, setWidth] = useState("205");
  const [ratio, setRatio] = useState("55");
  const [diameter, setDiameter] = useState("16");
  return (
    <form action="/teile" method="get" className="tire-finder">
      <input type="hidden" name="category" value="reifen" />
      <div className="tire-numbers" aria-hidden="true">
        <span>
          {width}
          <small>Breite</small>
        </span>
        <b>/</b>
        <span>
          {ratio}
          <small>Querschnitt</small>
        </span>
        <span>
          R{diameter}
          <small>Durchmesser</small>
        </span>
      </div>
      <p className="hint">
        Drei Angaben auf deiner Reifenflanke. Eine passende Suche.
      </p>
      <div className="tire-fields">
        <label>
          Breite (mm)
          <select
            name="width"
            defaultValue="205"
            onChange={(event) => setWidth(event.target.value)}
          >
            {[
              155, 165, 175, 185, 195, 205, 215, 225, 235, 245, 255, 265, 275,
              285, 295, 305, 315,
            ].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Querschnitt (%)
          <select
            name="ratio"
            defaultValue="55"
            onChange={(event) => setRatio(event.target.value)}
          >
            {[30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <label>
          Felge (Zoll)
          <select
            name="diameter"
            defaultValue="16"
            onChange={(event) => setDiameter(event.target.value)}
          >
            {[13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
      </div>
      <button className="button dark-button" type="submit">
        Passende Reifen finden
      </button>
    </form>
  );
}
