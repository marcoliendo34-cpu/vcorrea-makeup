import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          fontSize: 96,
          letterSpacing: -2,
          fontFamily: "serif",
        }}
      >
        VC
      </div>
    ),
    size,
  );
}
