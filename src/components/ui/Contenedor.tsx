import type { ElementType, ReactNode } from "react";

type Props = {
  children: ReactNode;
  como?: ElementType;
  className?: string;
};

export default function Contenedor({
  children,
  como: Tag = "div",
  className = "",
}: Props) {
  return (
    <Tag className={`mx-auto w-full max-w-[1200px] px-5 md:px-8 ${className}`}>
      {children}
    </Tag>
  );
}
