import React from "react";
import "./profile-ui.css";

interface ProfileStatPlateProps {
  label: string;
  value: React.ReactNode;
}

/** A single number that deserves a plate of its own (the hero's level). */
export function ProfileStatPlate({ label, value }: ProfileStatPlateProps) {
  return (
    <div className="pf-plate">
      <span className="pf-plate__label font-sans">{label}</span>{" "}
      <span className="pf-plate__value font-pixel">{value}</span>
    </div>
  );
}
