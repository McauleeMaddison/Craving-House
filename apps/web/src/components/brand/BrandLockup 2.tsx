import Image from "next/image";

import { store } from "@/lib/store";

export function BrandLockup(props: { size?: "sm" | "md" | "lg" }) {
  const size = props.size ?? "md";
  const imageWidth = size === "sm" ? 280 : size === "lg" ? 520 : 360;
  const imageHeight = Math.round((imageWidth * 220) / 860);

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <Image
        src="/brand/craving-house-lockup.svg"
        alt={store.name}
        width={imageWidth}
        height={imageHeight}
        priority
        style={{ width: "100%", height: "auto", maxWidth: imageWidth }}
      />
      <div className="pill" style={{ width: "fit-content" }}>
        {store.tagline}
      </div>
    </div>
  );
}

