import Image from "next/image";

import { store } from "@/lib/store";

export function BrandLockup(props: { size?: "sm" | "md" | "lg" }) {
  const size = props.size ?? "md";
  const imageWidth = size === "sm" ? 280 : size === "lg" ? 520 : 360;
  const imageHeight = Math.round((imageWidth * 220) / 860);
  const sizeClass = size === "sm" ? "brandLockupImageSm" : size === "lg" ? "brandLockupImageLg" : "brandLockupImageMd";

  return (
    <div className="brandLockup">
      <Image
        src="/brand/craving-house-lockup.svg"
        alt={store.name}
        width={imageWidth}
        height={imageHeight}
        priority
        className={`brandLockupImage ${sizeClass}`}
      />
      <div className="pill pillFit">
        {store.tagline}
      </div>
    </div>
  );
}
