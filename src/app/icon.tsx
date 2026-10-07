import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F5EFE6",
          color: "#7A5C30",
          fontSize: 34,
          letterSpacing: -1,
          fontFamily: "serif",
          borderRadius: 12,
        }}
      >
        VC
      </div>
    ),
    size,
  );
}
